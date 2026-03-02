import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../src/lib/server/db/schema';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
	console.error('DATABASE_URL not set');
	process.exit(1);
}

const sql = neon(databaseUrl);
const db = drizzle(sql, { schema });

const exerciseData = [
	// Chest
	{ name: 'Bench Press', muscleGroup: 'chest', equipment: 'barbell' },
	{ name: 'Incline Bench Press', muscleGroup: 'chest', equipment: 'barbell' },
	{ name: 'Dumbbell Bench Press', muscleGroup: 'chest', equipment: 'dumbbell' },
	{ name: 'Incline Dumbbell Press', muscleGroup: 'chest', equipment: 'dumbbell' },
	{ name: 'Cable Fly', muscleGroup: 'chest', equipment: 'cable' },
	{ name: 'Dumbbell Fly', muscleGroup: 'chest', equipment: 'dumbbell' },
	{ name: 'Push-Up', muscleGroup: 'chest', equipment: 'bodyweight' },
	{ name: 'Chest Dip', muscleGroup: 'chest', equipment: 'bodyweight' },

	// Back
	{ name: 'Deadlift', muscleGroup: 'back', equipment: 'barbell' },
	{ name: 'Barbell Row', muscleGroup: 'back', equipment: 'barbell' },
	{ name: 'Dumbbell Row', muscleGroup: 'back', equipment: 'dumbbell' },
	{ name: 'Pull-Up', muscleGroup: 'back', equipment: 'bodyweight' },
	{ name: 'Chin-Up', muscleGroup: 'back', equipment: 'bodyweight' },
	{ name: 'Lat Pulldown', muscleGroup: 'back', equipment: 'cable' },
	{ name: 'Seated Cable Row', muscleGroup: 'back', equipment: 'cable' },
	{ name: 'T-Bar Row', muscleGroup: 'back', equipment: 'barbell' },

	// Legs
	{ name: 'Squat', muscleGroup: 'legs', equipment: 'barbell' },
	{ name: 'Front Squat', muscleGroup: 'legs', equipment: 'barbell' },
	{ name: 'Leg Press', muscleGroup: 'legs', equipment: 'machine' },
	{ name: 'Romanian Deadlift', muscleGroup: 'legs', equipment: 'barbell' },
	{ name: 'Leg Curl', muscleGroup: 'legs', equipment: 'machine' },
	{ name: 'Leg Extension', muscleGroup: 'legs', equipment: 'machine' },
	{ name: 'Bulgarian Split Squat', muscleGroup: 'legs', equipment: 'dumbbell' },
	{ name: 'Calf Raise', muscleGroup: 'legs', equipment: 'machine' },
	{ name: 'Hip Thrust', muscleGroup: 'legs', equipment: 'barbell' },
	{ name: 'Goblet Squat', muscleGroup: 'legs', equipment: 'dumbbell' },

	// Shoulders
	{ name: 'Overhead Press', muscleGroup: 'shoulders', equipment: 'barbell' },
	{ name: 'Dumbbell Shoulder Press', muscleGroup: 'shoulders', equipment: 'dumbbell' },
	{ name: 'Lateral Raise', muscleGroup: 'shoulders', equipment: 'dumbbell' },
	{ name: 'Front Raise', muscleGroup: 'shoulders', equipment: 'dumbbell' },
	{ name: 'Face Pull', muscleGroup: 'shoulders', equipment: 'cable' },
	{ name: 'Reverse Fly', muscleGroup: 'shoulders', equipment: 'dumbbell' },
	{ name: 'Arnold Press', muscleGroup: 'shoulders', equipment: 'dumbbell' },

	// Arms
	{ name: 'Barbell Curl', muscleGroup: 'arms', equipment: 'barbell' },
	{ name: 'Dumbbell Curl', muscleGroup: 'arms', equipment: 'dumbbell' },
	{ name: 'Hammer Curl', muscleGroup: 'arms', equipment: 'dumbbell' },
	{ name: 'Tricep Pushdown', muscleGroup: 'arms', equipment: 'cable' },
	{ name: 'Skull Crusher', muscleGroup: 'arms', equipment: 'barbell' },
	{ name: 'Overhead Tricep Extension', muscleGroup: 'arms', equipment: 'dumbbell' },
	{ name: 'Close-Grip Bench Press', muscleGroup: 'arms', equipment: 'barbell' },
	{ name: 'Preacher Curl', muscleGroup: 'arms', equipment: 'barbell' },

	// Core
	{ name: 'Plank', muscleGroup: 'core', equipment: 'bodyweight' },
	{ name: 'Hanging Leg Raise', muscleGroup: 'core', equipment: 'bodyweight' },
	{ name: 'Cable Crunch', muscleGroup: 'core', equipment: 'cable' },
	{ name: 'Ab Wheel Rollout', muscleGroup: 'core', equipment: 'other' },
	{ name: 'Russian Twist', muscleGroup: 'core', equipment: 'bodyweight' },
	{ name: 'Woodchop', muscleGroup: 'core', equipment: 'cable' }
];

async function seed() {
	console.log('Seeding exercises...');

	for (const exercise of exerciseData) {
		await db.insert(schema.exercises).values({
			id: crypto.randomUUID(),
			name: exercise.name,
			muscleGroup: exercise.muscleGroup,
			equipment: exercise.equipment,
			isCustom: false
		});
	}

	console.log(`Seeded ${exerciseData.length} exercises.`);
}

seed().catch(console.error);
