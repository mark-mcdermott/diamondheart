import { eq, and } from 'drizzle-orm';
import { integrationConnections, integrationSyncLog, trackerMetrics, trackerEntries } from './db/schema';
import { ensureBiometricMetrics, BIOMETRIC_METRICS } from './biometrics';
import { db } from '@/db';

const OURA_API_BASE = 'https://api.ouraring.com/v2/usercollection';
const OURA_TOKEN_URL = 'https://api.ouraring.com/oauth/token';

export async function refreshOuraToken(connectionId: string, clientId: string, clientSecret: string): Promise<string> {
	const [conn] = await db.select().from(integrationConnections).where(eq(integrationConnections.id, connectionId));
	if (!conn || !conn.refreshToken) throw new Error('No refresh token available');

	if (conn.accessToken && conn.tokenExpiresAt && new Date(conn.tokenExpiresAt) > new Date()) {
		return conn.accessToken;
	}

	const res = await fetch(OURA_TOKEN_URL, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			grant_type: 'refresh_token',
			refresh_token: conn.refreshToken,
			client_id: clientId,
			client_secret: clientSecret,
		}),
	});

	if (!res.ok) {
		const text = await res.text();
		await db.update(integrationConnections).set({ status: 'error', lastSyncError: `Token refresh failed: ${text}`, updatedAt: new Date() }).where(eq(integrationConnections.id, connectionId));
		throw new Error(`Oura token refresh failed: ${res.status}`);
	}

	const tokens = (await res.json()) as { access_token: string; refresh_token: string; expires_in: number };
	const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

	await db.update(integrationConnections).set({
		accessToken: tokens.access_token,
		refreshToken: tokens.refresh_token,
		tokenExpiresAt: expiresAt,
		status: 'active',
		lastSyncError: null,
		updatedAt: new Date(),
	}).where(eq(integrationConnections.id, connectionId));

	return tokens.access_token;
}

async function ouraGet(token: string, endpoint: string, params: Record<string, string>) {
	const url = new URL(`${OURA_API_BASE}/${endpoint}`);
	for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
	const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
	if (!res.ok) throw new Error(`Oura API ${endpoint} failed: ${res.status}`);
	return (await res.json()) as { data: Record<string, unknown>[] };
}

interface OuraDataPoint { slug: string; value: number }

function mapDailyActivity(data: Record<string, unknown>[]): OuraDataPoint[] {
	if (!data.length) return [];
	const d = data[0];
	const points: OuraDataPoint[] = [];
	if (d.steps != null) points.push({ slug: 'bio-steps', value: Number(d.steps) });
	if (d.active_calories != null) points.push({ slug: 'bio-active-calories', value: Number(d.active_calories) });
	return points;
}

function mapDailySleep(data: Record<string, unknown>[]): OuraDataPoint[] {
	if (!data.length) return [];
	const d = data[0];
	const points: OuraDataPoint[] = [];
	if (d.score != null) points.push({ slug: 'bio-sleep-score', value: Number(d.score) });
	if (d.total_sleep_duration != null) points.push({ slug: 'bio-sleep-duration', value: Math.round((Number(d.total_sleep_duration) / 3600) * 10) / 10 });
	return points;
}

function mapDailyReadiness(data: Record<string, unknown>[]): OuraDataPoint[] {
	if (!data.length) return [];
	const d = data[0];
	if (d.score != null) return [{ slug: 'bio-readiness', value: Number(d.score) }];
	return [];
}

function mapDailySpo2(data: Record<string, unknown>[]): OuraDataPoint[] {
	if (!data.length) return [];
	const d = data[0];
	if (d.spo2_percentage != null) {
		return [{ slug: 'bio-spo2', value: Number((d.spo2_percentage as { average?: number }).average ?? d.spo2_percentage) }];
	}
	return [];
}

function mapDailyStress(data: Record<string, unknown>[]): OuraDataPoint[] {
	if (!data.length) return [];
	const d = data[0];
	if (d.stress_high != null) return [{ slug: 'bio-stress', value: Number(d.stress_high) }];
	if (d.day_summary != null) return [{ slug: 'bio-stress', value: Number(d.day_summary) }];
	return [];
}

function mapHeartRate(data: Record<string, unknown>[]): OuraDataPoint[] {
	if (!data.length) return [];
	const restEntries = data.filter((d) => d.source === 'rest');
	const entries = restEntries.length > 0 ? restEntries : data;
	const bpmValues = entries.map((d) => Number(d.bpm)).filter((v) => !isNaN(v) && v > 0);
	if (bpmValues.length === 0) return [];
	return [{ slug: 'bio-resting-hr', value: Math.round(bpmValues.reduce((a, b) => a + b, 0) / bpmValues.length) }];
}

export async function syncOuraData(connectionId: string, accessToken: string, dateStr: string): Promise<{ entriesCreated: number }> {
	const existingSync = await db.select().from(integrationSyncLog).where(and(eq(integrationSyncLog.connectionId, connectionId), eq(integrationSyncLog.syncDate, dateStr), eq(integrationSyncLog.status, 'success')));
	if (existingSync.length > 0) return { entriesCreated: 0 };

	await ensureBiometricMetrics();

	const params = { start_date: dateStr, end_date: dateStr };
	const [activity, sleep, readiness, spo2, stress, heartRate] = await Promise.all([
		ouraGet(accessToken, 'daily_activity', params).catch(() => ({ data: [] })),
		ouraGet(accessToken, 'daily_sleep', params).catch(() => ({ data: [] })),
		ouraGet(accessToken, 'daily_readiness', params).catch(() => ({ data: [] })),
		ouraGet(accessToken, 'daily_spo2', params).catch(() => ({ data: [] })),
		ouraGet(accessToken, 'daily_stress', params).catch(() => ({ data: [] })),
		ouraGet(accessToken, 'heart_rate', { ...params, start_datetime: `${dateStr}T00:00:00`, end_datetime: `${dateStr}T23:59:59` }).catch(() => ({ data: [] })),
	]);

	const allPoints = [
		...mapDailyActivity(activity.data), ...mapDailySleep(sleep.data), ...mapDailyReadiness(readiness.data),
		...mapDailySpo2(spo2.data), ...mapDailyStress(stress.data), ...mapHeartRate(heartRate.data),
	];

	const slugs = BIOMETRIC_METRICS.map((m) => m.slug);
	const metrics = await db.select().from(trackerMetrics);
	const metricBySlug = new Map(metrics.filter((m) => slugs.includes(m.slug)).map((m) => [m.slug, m]));

	const entryDate = new Date(`${dateStr}T12:00:00Z`);
	let entriesCreated = 0;

	for (const point of allPoints) {
		const metric = metricBySlug.get(point.slug);
		if (!metric) continue;
		await db.insert(trackerEntries).values({ id: crypto.randomUUID(), metricId: metric.id, value: String(point.value), notes: 'source:oura', date: entryDate });
		entriesCreated++;
	}

	await db.update(integrationConnections).set({ lastSyncAt: new Date(), lastSyncError: null, updatedAt: new Date() }).where(eq(integrationConnections.id, connectionId));
	await db.insert(integrationSyncLog).values({ id: crypto.randomUUID(), connectionId, syncType: 'daily', syncDate: dateStr, entriesCreated, status: 'success' });

	return { entriesCreated };
}
