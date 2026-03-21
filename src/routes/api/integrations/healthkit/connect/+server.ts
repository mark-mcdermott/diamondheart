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

	// Check for existing connection
	const existing = await db
		.select()
		.from(integrationConnections)
		.where(and(eq(integrationConnections.userId, locals.user.id), eq(integrationConnections.service, 'healthkit')));

	if (existing.length > 0) {
		// Reactivate if disconnected
		await db
			.update(integrationConnections)
			.set({ status: 'active', lastSyncError: null, updatedAt: new Date() })
			.where(eq(integrationConnections.id, existing[0].id));
		return json({ ok: true, connectionId: existing[0].id });
	}

	const id = crypto.randomUUID();
	await db.insert(integrationConnections).values({
		id,
		userId: locals.user.id,
		service: 'healthkit',
		status: 'active'
	});

	return json({ ok: true, connectionId: id });
};
