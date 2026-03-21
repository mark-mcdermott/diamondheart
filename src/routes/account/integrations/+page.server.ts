import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { createDb, integrationConnections } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ platform, locals }) => {
	if (!locals.user) {
		redirect(302, '/login');
	}

	const databaseUrl = platform?.env?.DATABASE_URL || env.DATABASE_URL;
	if (!databaseUrl) {
		return { connections: [] };
	}

	const db = createDb(databaseUrl);

	const connections = await db
		.select({
			id: integrationConnections.id,
			service: integrationConnections.service,
			status: integrationConnections.status,
			lastSyncAt: integrationConnections.lastSyncAt,
			lastSyncError: integrationConnections.lastSyncError,
			createdAt: integrationConnections.createdAt
		})
		.from(integrationConnections)
		.where(eq(integrationConnections.userId, locals.user.id));

	return { connections };
};
