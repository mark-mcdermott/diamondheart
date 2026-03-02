import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { createDb, exercises, personalRecords } from '$lib/server/db';
import { eq, desc } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ platform, locals }) => {
	if (!locals.user) {
		redirect(302, '/login');
	}

	const databaseUrl = platform?.env?.DATABASE_URL || env.DATABASE_URL;

	if (!databaseUrl) {
		return { records: [], exercises: [] };
	}

	const db = createDb(databaseUrl);
	const userId = locals.user.id;

	// Get all personal records with exercise details
	const records = await db
		.select({
			id: personalRecords.id,
			exerciseId: personalRecords.exerciseId,
			repCount: personalRecords.repCount,
			weight: personalRecords.weight,
			unit: personalRecords.unit,
			date: personalRecords.date,
			exerciseName: exercises.name,
			muscleGroup: exercises.muscleGroup,
			equipment: exercises.equipment
		})
		.from(personalRecords)
		.innerJoin(exercises, eq(personalRecords.exerciseId, exercises.id))
		.where(eq(personalRecords.userId, userId))
		.orderBy(exercises.muscleGroup, exercises.name, personalRecords.repCount);

	// Get unique muscle groups from the records
	const muscleGroups = [...new Set(records.map((r) => r.muscleGroup))].sort();

	return { records, muscleGroups };
};
