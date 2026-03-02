import { redirect, fail } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { createDb, exercises, workouts, workoutSets, personalRecords } from '$lib/server/db';
import { eq, and, desc } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';

function generateId() {
	return crypto.randomUUID();
}

export const load: PageServerLoad = async ({ platform, locals, url }) => {
	if (!locals.user) {
		redirect(302, '/login');
	}

	const databaseUrl = platform?.env?.DATABASE_URL || env.DATABASE_URL;

	if (!databaseUrl) {
		return { recentWorkouts: [], exercises: [], activeWorkout: null, activeSets: [] };
	}

	const db = createDb(databaseUrl);
	const userId = locals.user.id;

	// Get exercise library (built-in + user's custom)
	const exerciseList = await db
		.select()
		.from(exercises)
		.where(
			eq(exercises.isCustom, false)
		)
		.orderBy(exercises.muscleGroup, exercises.name);

	const customExercises = await db
		.select()
		.from(exercises)
		.where(
			and(eq(exercises.isCustom, true), eq(exercises.userId, userId))
		)
		.orderBy(exercises.name);

	const allExercises = [...exerciseList, ...customExercises];

	// Get recent workouts (last 10)
	const recentWorkouts = await db
		.select()
		.from(workouts)
		.where(eq(workouts.userId, userId))
		.orderBy(desc(workouts.date))
		.limit(10);

	// Check for active workout (passed via URL param)
	const activeWorkoutId = url.searchParams.get('active');
	let activeWorkout = null;
	let activeSets: Array<{
		id: string;
		workoutId: string;
		exerciseId: string;
		setNumber: number;
		reps: number;
		weight: number;
		unit: string;
		type: string;
		notes: string | null;
		createdAt: Date;
		exerciseName: string;
		muscleGroup: string;
	}> = [];

	if (activeWorkoutId) {
		const found = await db
			.select()
			.from(workouts)
			.where(and(eq(workouts.id, activeWorkoutId), eq(workouts.userId, userId)))
			.limit(1);

		if (found.length > 0) {
			activeWorkout = found[0];

			const sets = await db
				.select({
					id: workoutSets.id,
					workoutId: workoutSets.workoutId,
					exerciseId: workoutSets.exerciseId,
					setNumber: workoutSets.setNumber,
					reps: workoutSets.reps,
					weight: workoutSets.weight,
					unit: workoutSets.unit,
					type: workoutSets.type,
					notes: workoutSets.notes,
					createdAt: workoutSets.createdAt,
					exerciseName: exercises.name,
					muscleGroup: exercises.muscleGroup
				})
				.from(workoutSets)
				.innerJoin(exercises, eq(workoutSets.exerciseId, exercises.id))
				.where(eq(workoutSets.workoutId, activeWorkoutId))
				.orderBy(workoutSets.createdAt);

			activeSets = sets;
		}
	}

	return {
		recentWorkouts,
		exercises: allExercises,
		activeWorkout,
		activeSets
	};
};

export const actions: Actions = {
	startWorkout: async ({ request, platform, locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'Unauthorized' });
		}

		const databaseUrl = platform?.env?.DATABASE_URL || env.DATABASE_URL;
		if (!databaseUrl) {
			return fail(500, { error: 'Database not configured' });
		}

		const formData = await request.formData();
		const name = (formData.get('name') as string) || null;

		const db = createDb(databaseUrl);
		const workoutId = generateId();

		await db.insert(workouts).values({
			id: workoutId,
			userId: locals.user.id,
			name,
			date: new Date()
		});

		redirect(302, `/workout?active=${workoutId}`);
	},

	addSet: async ({ request, platform, locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'Unauthorized' });
		}

		const databaseUrl = platform?.env?.DATABASE_URL || env.DATABASE_URL;
		if (!databaseUrl) {
			return fail(500, { error: 'Database not configured' });
		}

		const formData = await request.formData();
		const workoutId = formData.get('workoutId') as string;
		const exerciseId = formData.get('exerciseId') as string;
		const reps = parseInt(formData.get('reps') as string);
		const weight = parseInt(formData.get('weight') as string);
		const unit = (formData.get('unit') as string) || 'lbs';
		const type = (formData.get('type') as string) || 'regular';

		if (!workoutId || !exerciseId || isNaN(reps) || isNaN(weight)) {
			return fail(400, { error: 'Missing required fields' });
		}

		const db = createDb(databaseUrl);

		// Get the next set number for this exercise in this workout
		const existingSets = await db
			.select({ setNumber: workoutSets.setNumber })
			.from(workoutSets)
			.where(
				and(
					eq(workoutSets.workoutId, workoutId),
					eq(workoutSets.exerciseId, exerciseId)
				)
			)
			.orderBy(desc(workoutSets.setNumber))
			.limit(1);

		const setNumber = existingSets.length > 0 ? existingSets[0].setNumber + 1 : 1;

		const setId = generateId();

		await db.insert(workoutSets).values({
			id: setId,
			workoutId,
			exerciseId,
			setNumber,
			reps,
			weight,
			unit,
			type
		});

		// Check for personal record
		const existingPR = await db
			.select()
			.from(personalRecords)
			.where(
				and(
					eq(personalRecords.userId, locals.user.id),
					eq(personalRecords.exerciseId, exerciseId),
					eq(personalRecords.repCount, reps)
				)
			)
			.limit(1);

		let isPR = false;

		if (existingPR.length === 0) {
			// No existing PR for this rep count - this is a new PR
			await db.insert(personalRecords).values({
				id: generateId(),
				userId: locals.user.id,
				exerciseId,
				repCount: reps,
				weight,
				unit,
				date: new Date(),
				setId
			});
			isPR = true;
		} else if (weight > existingPR[0].weight) {
			// Beat existing PR
			await db
				.delete(personalRecords)
				.where(eq(personalRecords.id, existingPR[0].id));

			await db.insert(personalRecords).values({
				id: generateId(),
				userId: locals.user.id,
				exerciseId,
				repCount: reps,
				weight,
				unit,
				date: new Date(),
				setId
			});
			isPR = true;
		}

		return { success: true, isPR, workoutId };
	},

	deleteSet: async ({ request, platform, locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'Unauthorized' });
		}

		const databaseUrl = platform?.env?.DATABASE_URL || env.DATABASE_URL;
		if (!databaseUrl) {
			return fail(500, { error: 'Database not configured' });
		}

		const formData = await request.formData();
		const setId = formData.get('setId') as string;
		const workoutId = formData.get('workoutId') as string;

		if (!setId) {
			return fail(400, { error: 'Set ID is required' });
		}

		const db = createDb(databaseUrl);

		await db.delete(workoutSets).where(eq(workoutSets.id, setId));

		return { success: true, workoutId };
	},

	finishWorkout: async ({ request, platform, locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'Unauthorized' });
		}

		const databaseUrl = platform?.env?.DATABASE_URL || env.DATABASE_URL;
		if (!databaseUrl) {
			return fail(500, { error: 'Database not configured' });
		}

		const formData = await request.formData();
		const workoutId = formData.get('workoutId') as string;
		const duration = parseInt(formData.get('duration') as string);
		const notes = (formData.get('notes') as string) || null;

		if (!workoutId) {
			return fail(400, { error: 'Workout ID is required' });
		}

		const db = createDb(databaseUrl);

		await db
			.update(workouts)
			.set({
				duration: isNaN(duration) ? null : duration,
				notes,
				updatedAt: new Date()
			})
			.where(and(eq(workouts.id, workoutId), eq(workouts.userId, locals.user.id)));

		redirect(302, '/workout');
	}
};
