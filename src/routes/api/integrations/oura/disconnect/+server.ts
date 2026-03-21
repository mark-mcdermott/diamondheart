import { json, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { createDb, integrationConnections } from '$lib/server/db';
import { eq, and } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ platform, locals }) => {
	if (!locals.user) {
		error(401, 'Unauthorized');
	}

	const databaseUrl = platform?.env?.DATABASE_URL || env.DATABASE_URL;
	if (!databaseUrl) {
		error(500, 'Database not configured');
	}

	const db = createDb(databaseUrl);

	const [conn] = await db
		.select()
		.from(integrationConnections)
		.where(and(eq(integrationConnections.userId, locals.user.id), eq(integrationConnections.service, 'oura')));

	if (!conn) {
		error(404, 'No Oura connection found');
	}

	await db
		.update(integrationConnections)
		.set({
			accessToken: null,
			refreshToken: null,
			tokenExpiresAt: null,
			status: 'disconnected',
			updatedAt: new Date()
		})
		.where(eq(integrationConnections.id, conn.id));

	return json({ ok: true });
};
