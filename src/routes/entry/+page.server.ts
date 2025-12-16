import { redirect, fail } from '@sveltejs/kit';
import { createDb, trackerCategories, trackerMetrics, trackerEntries } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ platform, locals }) => {
	if (!locals.user) {
		redirect(302, '/login');
	}

	const databaseUrl = platform?.env?.DATABASE_URL;

	if (!databaseUrl) {
		return { categories: [], metrics: [] };
	}

	const db = createDb(databaseUrl);

	const categories = await db.select().from(trackerCategories).orderBy(trackerCategories.sortOrder);
	const metrics = await db
		.select()
		.from(trackerMetrics)
		.where(eq(trackerMetrics.archived, false))
		.orderBy(trackerMetrics.sortOrder);

	return { categories, metrics };
};

function generateId() {
	return crypto.randomUUID();
}

export const actions: Actions = {
	default: async ({ request, platform, locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'Unauthorized' });
		}

		const databaseUrl = platform?.env?.DATABASE_URL;
		if (!databaseUrl) {
			return fail(500, { error: 'Database not configured' });
		}

		const formData = await request.formData();
		const metricId = formData.get('metricId') as string;
		const value = formData.get('value') as string;
		const notes = formData.get('notes') as string;
		const dateStr = formData.get('date') as string;
		const timeStr = formData.get('time') as string;

		if (!metricId) {
			return fail(400, { error: 'Metric is required' });
		}

		const db = createDb(databaseUrl);

		// Combine date and time
		let date: Date;
		if (dateStr && timeStr) {
			date = new Date(`${dateStr}T${timeStr}`);
		} else if (dateStr) {
			date = new Date(dateStr);
		} else {
			date = new Date();
		}

		await db.insert(trackerEntries).values({
			id: generateId(),
			metricId,
			value: value || 'done',
			notes: notes || null,
			date
		});

		redirect(302, '/dashboard');
	}
};
