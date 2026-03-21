import { json, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { createDb, integrationConnections } from '$lib/server/db';
import { eq, and } from 'drizzle-orm';
import { refreshOuraToken, syncOuraData } from '$lib/server/oura';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, platform, locals }) => {
	if (!locals.user) {
		error(401, 'Unauthorized');
	}

	const databaseUrl = platform?.env?.DATABASE_URL || env.DATABASE_URL;
	const clientId = platform?.env?.OURA_CLIENT_ID || env.OURA_CLIENT_ID;
	const clientSecret = platform?.env?.OURA_CLIENT_SECRET || env.OURA_CLIENT_SECRET;

	if (!databaseUrl || !clientId || !clientSecret) {
		error(500, 'Oura integration not configured');
	}

	const db = createDb(databaseUrl);

	// Find active Oura connection
	const [conn] = await db
		.select()
		.from(integrationConnections)
		.where(and(eq(integrationConnections.userId, locals.user.id), eq(integrationConnections.service, 'oura'), eq(integrationConnections.status, 'active')));

	if (!conn) {
		error(404, 'No active Oura connection');
	}

	// Parse date from request body, default to today
	let dateStr: string;
	try {
		const body = await request.json();
		dateStr = body.date || new Date().toISOString().split('T')[0];
	} catch {
		dateStr = new Date().toISOString().split('T')[0];
	}

	try {
		const accessToken = await refreshOuraToken(db, conn.id, clientId, clientSecret);
		const result = await syncOuraData(db, conn.id, accessToken, dateStr);
		return json({ ok: true, ...result });
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Sync failed';
		// Log error on connection
		await db
			.update(integrationConnections)
			.set({ lastSyncError: message, updatedAt: new Date() })
			.where(eq(integrationConnections.id, conn.id));
		error(502, message);
	}
};
