import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { eq, sql } from 'drizzle-orm';
import { createDb, users, workouts, workoutSets, foodLog } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, platform }) => {
	const databaseUrl = platform?.env?.DATABASE_URL || env.DATABASE_URL;
	if (!databaseUrl) {
		error(500, 'Database not configured');
	}

	const db = createDb(databaseUrl);

	const [profileUser] = await db
		.select({
			id: users.id,
			email: users.email,
			name: users.name,
			avatarUrl: users.avatarUrl,
			createdAt: users.createdAt
		})
		.from(users)
		.where(eq(users.id, params.id))
		.limit(1);

	if (!profileUser) {
		error(404, 'User not found');
	}

	// Public stats
	const [workoutCount] = await db
		.select({ count: sql<number>`count(*)` })
		.from(workouts)
		.where(eq(workouts.userId, params.id));

	const [setCount] = await db
		.select({ count: sql<number>`count(*)` })
		.from(workoutSets)
		.innerJoin(workouts, eq(workoutSets.workoutId, workouts.id))
		.where(eq(workouts.userId, params.id));

	const [mealCount] = await db
		.select({ count: sql<number>`count(*)` })
		.from(foodLog)
		.where(eq(foodLog.userId, params.id));

	return {
		profileUser,
		stats: {
			workouts: Number(workoutCount?.count ?? 0),
			sets: Number(setCount?.count ?? 0),
			meals: Number(mealCount?.count ?? 0)
		}
	};
};
