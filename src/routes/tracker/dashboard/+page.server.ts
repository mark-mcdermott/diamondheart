import { redirect } from '@sveltejs/kit';
import { createDb, trackerCategories, trackerMetrics, trackerEntries, trackerGoals } from '$lib/server/db';
import { desc, eq, and, gte, lte } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ platform, locals }) => {
	// Require authentication
	if (!locals.user) {
		redirect(302, '/login');
	}

	const databaseUrl = platform?.env?.DATABASE_URL;

	if (!databaseUrl) {
		return { categories: [], todayEntries: [], recentEntries: [], metrics: [], goals: [] };
	}

	const db = createDb(databaseUrl);

	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const tomorrow = new Date(today);
	tomorrow.setDate(tomorrow.getDate() + 1);
	const weekAgo = new Date(today);
	weekAgo.setDate(weekAgo.getDate() - 7);

	const categories = await db.select().from(trackerCategories).orderBy(trackerCategories.sortOrder);
	const metrics = await db.select().from(trackerMetrics).where(eq(trackerMetrics.archived, false));

	const todayEntries = await db
		.select({
			id: trackerEntries.id,
			metricId: trackerEntries.metricId,
			value: trackerEntries.value,
			date: trackerEntries.date
		})
		.from(trackerEntries)
		.where(and(gte(trackerEntries.date, today), lte(trackerEntries.date, tomorrow)));

	const recentEntries = await db
		.select({
			id: trackerEntries.id,
			metricId: trackerEntries.metricId,
			value: trackerEntries.value,
			date: trackerEntries.date
		})
		.from(trackerEntries)
		.where(gte(trackerEntries.date, weekAgo))
		.orderBy(desc(trackerEntries.date))
		.limit(20);

	const goals = await db.select().from(trackerGoals).where(eq(trackerGoals.active, true));

	return { categories, metrics, todayEntries, recentEntries, goals };
};
