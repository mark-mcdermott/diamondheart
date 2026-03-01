import { redirect, fail } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { createDb, trackerCategories, trackerMetrics } from '$lib/server/db';
import { eq, sql } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ platform, locals }) => {
	if (!locals.user) {
		redirect(302, '/login');
	}

	const databaseUrl = platform?.env?.DATABASE_URL || env.DATABASE_URL;

	if (!databaseUrl) {
		return { categories: [], metrics: [] };
	}

	const db = createDb(databaseUrl);

	const categories = await db.select().from(trackerCategories).orderBy(trackerCategories.sortOrder);
	const metrics = await db.select().from(trackerMetrics).where(eq(trackerMetrics.archived, false)).orderBy(trackerMetrics.sortOrder);

	return { categories, metrics };
};

function generateId() {
	return crypto.randomUUID();
}

function slugify(text: string) {
	return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export const actions: Actions = {
	addMetric: async ({ request, platform, locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'Unauthorized' });
		}

		const databaseUrl = platform?.env?.DATABASE_URL || env.DATABASE_URL;
		if (!databaseUrl) {
			return fail(500, { error: 'Database not configured' });
		}

		const formData = await request.formData();
		const name = formData.get('name') as string;
		const valueType = formData.get('valueType') as string;
		const unit = formData.get('unit') as string;
		const categoryId = formData.get('categoryId') as string;
		const dailyGoalStr = formData.get('dailyGoal') as string;
		const fieldsJson = formData.get('fields') as string;
		const dailyGoal = dailyGoalStr ? parseInt(dailyGoalStr, 10) : 1;

		if (!name || !valueType) {
			return fail(400, { error: 'Name and type are required' });
		}

		if (!dailyGoal || dailyGoal < 1) {
			return fail(400, { error: 'Daily goal must be at least 1' });
		}

		let fields = null;
		if (fieldsJson) {
			try {
				fields = JSON.parse(fieldsJson);
			} catch {
				fields = null;
			}
		}

		const db = createDb(databaseUrl);

		// If no category provided, create or get a default one
		let finalCategoryId = categoryId;
		if (!finalCategoryId) {
			const [defaultCategory] = await db
				.select()
				.from(trackerCategories)
				.where(eq(trackerCategories.slug, 'default'))
				.limit(1);

			if (defaultCategory) {
				finalCategoryId = defaultCategory.id;
			} else {
				const newCategoryId = generateId();
				await db.insert(trackerCategories).values({
					id: newCategoryId,
					name: 'General',
					slug: 'default',
					sortOrder: '0'
				});
				finalCategoryId = newCategoryId;
			}
		}

		const [maxRow] = await db
			.select({ max: sql<string>`coalesce(max(cast(sort_order as integer)), -1)` })
			.from(trackerMetrics);
		const nextOrder = String((parseInt(maxRow.max) || 0) + 1);

		await db.insert(trackerMetrics).values({
			id: generateId(),
			categoryId: finalCategoryId,
			name,
			slug: slugify(name),
			valueType,
			unit: unit || null,
			dailyGoal,
			fields,
			sortOrder: nextOrder
		});

		return { success: true };
	},

	deleteMetric: async ({ request, platform, locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'Unauthorized' });
		}

		const databaseUrl = platform?.env?.DATABASE_URL || env.DATABASE_URL;
		if (!databaseUrl) {
			return fail(500, { error: 'Database not configured' });
		}

		const formData = await request.formData();
		const metricId = formData.get('metricId') as string;

		if (!metricId) {
			return fail(400, { error: 'Metric ID required' });
		}

		const db = createDb(databaseUrl);
		await db.delete(trackerMetrics).where(eq(trackerMetrics.id, metricId));

		return { success: true };
	},

	toggleHidden: async ({ request, platform, locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'Unauthorized' });
		}

		const databaseUrl = platform?.env?.DATABASE_URL || env.DATABASE_URL;
		if (!databaseUrl) {
			return fail(500, { error: 'Database not configured' });
		}

		const formData = await request.formData();
		const metricId = formData.get('metricId') as string;

		if (!metricId) {
			return fail(400, { error: 'Metric ID required' });
		}

		const db = createDb(databaseUrl);

		const [metric] = await db
			.select({ hidden: trackerMetrics.hidden })
			.from(trackerMetrics)
			.where(eq(trackerMetrics.id, metricId))
			.limit(1);

		if (!metric) {
			return fail(404, { error: 'Metric not found' });
		}

		await db
			.update(trackerMetrics)
			.set({ hidden: !metric.hidden })
			.where(eq(trackerMetrics.id, metricId));

		return { success: true };
	},

	reorder: async ({ request, platform, locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'Unauthorized' });
		}

		const databaseUrl = platform?.env?.DATABASE_URL || env.DATABASE_URL;
		if (!databaseUrl) {
			return fail(500, { error: 'Database not configured' });
		}

		const formData = await request.formData();
		const idsJson = formData.get('ids') as string;

		if (!idsJson) {
			return fail(400, { error: 'Metric IDs required' });
		}

		let ids: string[];
		try {
			ids = JSON.parse(idsJson);
		} catch {
			return fail(400, { error: 'Invalid JSON' });
		}

		const db = createDb(databaseUrl);

		await Promise.all(
			ids.map((id, index) =>
				db
					.update(trackerMetrics)
					.set({ sortOrder: String(index) })
					.where(eq(trackerMetrics.id, id))
			)
		);

		return { success: true };
	}
};
