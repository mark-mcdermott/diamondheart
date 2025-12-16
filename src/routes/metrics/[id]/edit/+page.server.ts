import { redirect, fail, error } from '@sveltejs/kit';
import { createDb, trackerMetrics } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';

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

	return { metric };
};

export const actions: Actions = {
	default: async ({ request, platform, locals, params }) => {
		if (!locals.user) {
			return fail(401, { error: 'Unauthorized' });
		}

		const databaseUrl = platform?.env?.DATABASE_URL;
		if (!databaseUrl) {
			return fail(500, { error: 'Database not configured' });
		}

		const formData = await request.formData();
		const name = formData.get('name') as string;
		const valueType = formData.get('valueType') as string;
		const unit = formData.get('unit') as string;
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

		await db
			.update(trackerMetrics)
			.set({
				name,
				valueType,
				unit: unit || null,
				dailyGoal,
				fields,
				updatedAt: new Date()
			})
			.where(eq(trackerMetrics.id, params.id));

		redirect(302, `/metrics/${params.id}`);
	}
};
