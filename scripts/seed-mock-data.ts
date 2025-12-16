import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { trackerCategories, trackerMetrics, trackerEntries } from '../src/lib/server/db/schema';
import { eq } from 'drizzle-orm';
import 'dotenv/config';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
	console.error('DATABASE_URL not set');
	process.exit(1);
}

const sql = neon(databaseUrl);
const db = drizzle(sql);

function generateId() {
	return crypto.randomUUID();
}

function randomInt(min: number, max: number) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomBool(probability = 0.7) {
	return Math.random() < probability;
}

async function seed() {
	console.log('Seeding mock data...');

	// Create or get default category
	let categoryId: string;
	const [existingCategory] = await db
		.select()
		.from(trackerCategories)
		.where(eq(trackerCategories.slug, 'default'))
		.limit(1);

	if (existingCategory) {
		categoryId = existingCategory.id;
		console.log('Using existing category:', categoryId);
	} else {
		categoryId = generateId();
		await db.insert(trackerCategories).values({
			id: categoryId,
			name: 'General',
			slug: 'default',
			sortOrder: '0'
		});
		console.log('Created category:', categoryId);
	}

	// Define metrics
	const metricsData = [
		{ name: 'Meditation', slug: 'meditation', valueType: 'none', unit: null },
		{ name: 'Water', slug: 'water', valueType: 'int', unit: 'glasses' },
		{ name: 'Exercise', slug: 'exercise', valueType: 'int', unit: 'minutes' }
	];

	const metricIds: Record<string, string> = {};

	// Create metrics if they don't exist
	for (const metric of metricsData) {
		const [existing] = await db
			.select()
			.from(trackerMetrics)
			.where(eq(trackerMetrics.slug, metric.slug))
			.limit(1);

		if (existing) {
			metricIds[metric.slug] = existing.id;
			console.log(`Metric "${metric.name}" exists:`, existing.id);
		} else {
			const id = generateId();
			await db.insert(trackerMetrics).values({
				id,
				categoryId,
				name: metric.name,
				slug: metric.slug,
				valueType: metric.valueType,
				unit: metric.unit,
				sortOrder: '0'
			});
			metricIds[metric.slug] = id;
			console.log(`Created metric "${metric.name}":`, id);
		}
	}

	// Generate entries for the past 3 months
	const today = new Date();
	const threeMonthsAgo = new Date(today);
	threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

	const entries: Array<{
		id: string;
		metricId: string;
		value: string;
		notes: string | null;
		date: Date;
	}> = [];

	// Loop through each day
	const currentDate = new Date(threeMonthsAgo);
	while (currentDate <= today) {
		const dateForEntry = new Date(currentDate);

		// Meditation - ~70% chance each day
		if (randomBool(0.7)) {
			const hour = randomInt(6, 9); // Morning meditation
			dateForEntry.setHours(hour, randomInt(0, 59), 0, 0);
			entries.push({
				id: generateId(),
				metricId: metricIds['meditation'],
				value: 'done',
				notes: null,
				date: new Date(dateForEntry)
			});
		}

		// Water - daily, 4-12 glasses
		if (randomBool(0.9)) {
			const glasses = randomInt(4, 12);
			dateForEntry.setHours(20, randomInt(0, 59), 0, 0); // Evening log
			entries.push({
				id: generateId(),
				metricId: metricIds['water'],
				value: glasses.toString(),
				notes: glasses >= 8 ? 'Good hydration day!' : null,
				date: new Date(dateForEntry)
			});
		}

		// Exercise - ~50% chance, 15-60 minutes
		if (randomBool(0.5)) {
			const minutes = randomInt(15, 60);
			const hour = randomInt(6, 19);
			dateForEntry.setHours(hour, randomInt(0, 59), 0, 0);
			const exerciseTypes = ['Running', 'Weights', 'Yoga', 'Cycling', 'Walking', null];
			const note = exerciseTypes[randomInt(0, exerciseTypes.length - 1)];
			entries.push({
				id: generateId(),
				metricId: metricIds['exercise'],
				value: minutes.toString(),
				notes: note,
				date: new Date(dateForEntry)
			});
		}

		currentDate.setDate(currentDate.getDate() + 1);
	}

	// Insert entries in batches
	console.log(`Inserting ${entries.length} entries...`);
	const batchSize = 50;
	for (let i = 0; i < entries.length; i += batchSize) {
		const batch = entries.slice(i, i + batchSize);
		await db.insert(trackerEntries).values(batch);
		console.log(`Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(entries.length / batchSize)}`);
	}

	console.log('Seeding complete!');
	console.log(`- Meditation entries: ${entries.filter(e => e.metricId === metricIds['meditation']).length}`);
	console.log(`- Water entries: ${entries.filter(e => e.metricId === metricIds['water']).length}`);
	console.log(`- Exercise entries: ${entries.filter(e => e.metricId === metricIds['exercise']).length}`);
}

seed().catch(console.error);
