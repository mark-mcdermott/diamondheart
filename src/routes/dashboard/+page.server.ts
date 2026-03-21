import { redirect, fail } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { createDb, trackerCategories, trackerMetrics, trackerEntries, trackerGoals, integrationConnections } from '$lib/server/db';
import { desc, eq, and, gte, lte } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ platform, locals }) => {
	// Require authentication
	if (!locals.user) {
		redirect(302, '/login');
	}

	const databaseUrl = platform?.env?.DATABASE_URL || env.DATABASE_URL;

	if (!databaseUrl) {
		return { categories: [] as typeof trackerCategories.$inferSelect[], todayEntries: [] as { id: string; metricId: string; value: string; date: Date }[], recentEntries: [] as { id: string; metricId: string; value: string; date: Date }[], metrics: [] as typeof trackerMetrics.$inferSelect[], goals: [] as typeof trackerGoals.$inferSelect[], monthEntries: [] as { metricId: string; date: Date }[], healthkitConnection: null as { status: string; lastSyncAt: Date | null } | null };
	}

	const db = createDb(databaseUrl);

	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const tomorrow = new Date(today);
	tomorrow.setDate(tomorrow.getDate() + 1);
	const weekAgo = new Date(today);
	weekAgo.setDate(weekAgo.getDate() - 7);

	// Get first and last day of current month
	const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
	const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);

	const categories = await db.select().from(trackerCategories).orderBy(trackerCategories.sortOrder);
	const metrics = await db.select().from(trackerMetrics).where(and(eq(trackerMetrics.archived, false), eq(trackerMetrics.hidden, false))).orderBy(trackerMetrics.sortOrder);

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

	// Get all entries for the current month
	const monthEntries = await db
		.select({
			metricId: trackerEntries.metricId,
			date: trackerEntries.date
		})
		.from(trackerEntries)
		.where(and(gte(trackerEntries.date, monthStart), lte(trackerEntries.date, monthEnd)));

	const goals = await db.select().from(trackerGoals).where(eq(trackerGoals.active, true));

	// Check for active HealthKit connection (for auto-sync on mount)
	const [healthkitConnection] = await db
		.select({ status: integrationConnections.status, lastSyncAt: integrationConnections.lastSyncAt })
		.from(integrationConnections)
		.where(and(eq(integrationConnections.userId, locals.user.id), eq(integrationConnections.service, 'healthkit')));

	return { categories, metrics, todayEntries, recentEntries, goals, monthEntries, healthkitConnection: healthkitConnection ?? null };
};

function generateId() {
	return crypto.randomUUID();
}

export const actions: Actions = {
	quickLog: async ({ request, platform, locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'Unauthorized' });
		}

		const databaseUrl = platform?.env?.DATABASE_URL || env.DATABASE_URL;
		if (!databaseUrl) {
			return fail(500, { error: 'Database not configured' });
		}

		const formData = await request.formData();
		const metricId = formData.get('metricId') as string;
		const value = formData.get('value') as string;

		if (!metricId) {
			return fail(400, { error: 'Metric is required' });
		}

		const db = createDb(databaseUrl);

		await db.insert(trackerEntries).values({
			id: generateId(),
			metricId,
			value: value || 'done',
			date: new Date()
		});

		return { success: true };
	}
};
