import { redirect, error } from '@sveltejs/kit';
import { createDb, trackerMetrics, trackerEntries } from '$lib/server/db';
import { eq, desc } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ platform, locals, params }) => {
	if (!locals.user) {
		redirect(302, '/login');
	}

	const databaseUrl = platform?.env?.DATABASE_URL;

	if (!databaseUrl) {
		error(500, 'Database not configured');
	}

	const db = createDb(databaseUrl);

	const [metric] = await db
		.select()
		.from(trackerMetrics)
		.where(eq(trackerMetrics.id, params.id))
		.limit(1);

	if (!metric) {
		error(404, 'Metric not found');
	}

	const entries = await db
		.select()
		.from(trackerEntries)
		.where(eq(trackerEntries.metricId, params.id))
		.orderBy(desc(trackerEntries.date));

	return { metric, entries };
};
