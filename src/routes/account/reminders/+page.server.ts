import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { createDb, reminderSchedules, trackerMetrics } from '$lib/server/db';
import { eq, and } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ platform, locals }) => {
	if (!locals.user) {
		redirect(302, '/login');
	}

	const databaseUrl = platform?.env?.DATABASE_URL || env.DATABASE_URL;
	if (!databaseUrl) {
		return { reminders: [], metrics: [] };
	}

	const db = createDb(databaseUrl);

	const reminders = await db
		.select()
		.from(reminderSchedules)
		.where(eq(reminderSchedules.userId, locals.user.id));

	const metrics = await db
		.select({ id: trackerMetrics.id, name: trackerMetrics.name, slug: trackerMetrics.slug })
		.from(trackerMetrics)
		.where(and(eq(trackerMetrics.archived, false), eq(trackerMetrics.hidden, false)));

	return { reminders, metrics };
};
