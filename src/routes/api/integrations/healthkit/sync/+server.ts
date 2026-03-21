import { json, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { createDb, integrationConnections, integrationSyncLog, trackerMetrics, trackerEntries } from '$lib/server/db';
import { eq, and } from 'drizzle-orm';
import { ensureBiometricMetrics, BIOMETRIC_METRICS } from '$lib/server/biometrics';
import type { RequestHandler } from './$types';

interface HealthKitPayload {
	date: string;
	steps?: number;
	restingHeartRate?: number;
	hrv?: number;
	sleepDuration?: number;
	activeCalories?: number;
	spo2?: number;
}

const FIELD_TO_SLUG: Record<string, string> = {
	steps: 'bio-steps',
	restingHeartRate: 'bio-resting-hr',
	hrv: 'bio-hrv',
	sleepDuration: 'bio-sleep-duration',
	activeCalories: 'bio-active-calories',
	spo2: 'bio-spo2'
};

export const POST: RequestHandler = async ({ request, platform, locals }) => {
	if (!locals.user) {
		error(401, 'Unauthorized');
	}

	const databaseUrl = platform?.env?.DATABASE_URL || env.DATABASE_URL;
	if (!databaseUrl) {
		error(500, 'Database not configured');
	}

	const db = createDb(databaseUrl);

	// Verify active HealthKit connection
	const [conn] = await db
		.select()
		.from(integrationConnections)
		.where(and(eq(integrationConnections.userId, locals.user.id), eq(integrationConnections.service, 'healthkit'), eq(integrationConnections.status, 'active')));

	if (!conn) {
		error(404, 'No active HealthKit connection');
	}

	let payload: HealthKitPayload;
	try {
		payload = await request.json();
	} catch {
		error(400, 'Invalid JSON payload');
	}

	if (!payload.date || !/^\d{4}-\d{2}-\d{2}$/.test(payload.date)) {
		error(400, 'Invalid or missing date (expected YYYY-MM-DD)');
	}

	// Check idempotency
	const existingSync = await db
		.select()
		.from(integrationSyncLog)
		.where(
			and(
				eq(integrationSyncLog.connectionId, conn.id),
				eq(integrationSyncLog.syncDate, payload.date),
				eq(integrationSyncLog.status, 'success')
			)
		);

	if (existingSync.length > 0) {
		return json({ ok: true, entriesCreated: 0, skipped: true });
	}

	// Ensure biometric metrics exist
	await ensureBiometricMetrics(db);

	// Look up metric IDs
	const slugs = BIOMETRIC_METRICS.map((m) => m.slug);
	const metrics = await db.select().from(trackerMetrics);
	const metricBySlug = new Map(metrics.filter((m) => slugs.includes(m.slug)).map((m) => [m.slug, m]));

	const entryDate = new Date(`${payload.date}T12:00:00Z`);
	let entriesCreated = 0;

	for (const [field, slug] of Object.entries(FIELD_TO_SLUG)) {
		const value = payload[field as keyof HealthKitPayload];
		if (value == null || typeof value !== 'number') continue;

		const metric = metricBySlug.get(slug);
		if (!metric) continue;

		await db.insert(trackerEntries).values({
			id: crypto.randomUUID(),
			metricId: metric.id,
			value: String(value),
			notes: 'source:healthkit',
			date: entryDate
		});
		entriesCreated++;
	}

	// Update connection
	await db
		.update(integrationConnections)
		.set({ lastSyncAt: new Date(), lastSyncError: null, updatedAt: new Date() })
		.where(eq(integrationConnections.id, conn.id));

	// Log sync
	await db.insert(integrationSyncLog).values({
		id: crypto.randomUUID(),
		connectionId: conn.id,
		syncType: 'daily',
		syncDate: payload.date,
		entriesCreated,
		status: 'success'
	});

	return json({ ok: true, entriesCreated });
};
