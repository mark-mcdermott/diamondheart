import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq } from 'drizzle-orm';
import * as schema from '../src/lib/server/db/schema';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
	console.error('DATABASE_URL not set');
	process.exit(1);
}

const userId = process.argv[2]; // optional — if omitted, seeds for all users

const sql = neon(databaseUrl);
const db = drizzle(sql, { schema });

// Factor Vegetarian & Vegan Meals
// Source: https://foods.fatsecret.com/calories-nutrition/factor
// Nutrition per 1 tray/serving
const factorVegetarianMeals = [
	// Risottos & Mushroom
	{
		name: 'Factor - Vegan Mushroom Marsala',
		calories: 400,
		protein: 10,
		carbs: 48,
		fat: 19,
		servingSize: 1,
		servingUnit: 'tray'
	},
	{
		name: 'Factor - Garlic & Herb Portobello Mushrooms',
		calories: 380,
		protein: 10,
		carbs: 43,
		fat: 22,
		servingSize: 1,
		servingUnit: 'tray'
	},
	{
		name: 'Factor - Caramelized Onion & Goat Cheese Risotto',
		calories: 500,
		protein: 11,
		carbs: 68,
		fat: 20,
		servingSize: 1,
		servingUnit: 'tray'
	},
	{
		name: 'Factor - Truffle Mushroom Risotto',
		calories: 430,
		protein: 11,
		carbs: 49,
		fat: 23,
		servingSize: 1,
		servingUnit: 'tray'
	},
	{
		name: 'Factor - Roasted Vegetable Risotto',
		calories: 490,
		protein: 14,
		carbs: 63,
		fat: 22,
		servingSize: 1,
		servingUnit: 'tray'
	},

	// Tofu
	{
		name: 'Factor - Tofu Tikka Masala',
		calories: 510,
		protein: 19,
		carbs: 48,
		fat: 28,
		servingSize: 1,
		servingUnit: 'tray'
	},
	{
		name: 'Factor - African Peanut Curry & Tofu',
		calories: 620,
		protein: 28,
		carbs: 51,
		fat: 35,
		servingSize: 1,
		servingUnit: 'tray'
	},
	{
		name: 'Factor - Indian Butter Tofu, Lentils & Rice',
		calories: 630,
		protein: 30,
		carbs: 49,
		fat: 35,
		servingSize: 1,
		servingUnit: 'tray'
	},
	{
		name: 'Factor - Smoky Tofu & Baked Beans',
		calories: 690,
		protein: 36,
		carbs: 61,
		fat: 35,
		servingSize: 1,
		servingUnit: 'tray'
	},
	{
		name: 'Factor - Smoked Tofu Almond Stir Fry',
		calories: 530,
		protein: 30,
		carbs: 50,
		fat: 25,
		servingSize: 1,
		servingUnit: 'tray'
	},
	{
		name: 'Factor - Blackened Tofu',
		calories: 540,
		protein: 31,
		carbs: 46,
		fat: 26,
		servingSize: 1,
		servingUnit: 'tray'
	},
	{
		name: 'Factor - Caribbean Spiced Tofu',
		calories: 650,
		protein: 24,
		carbs: 60,
		fat: 36,
		servingSize: 1,
		servingUnit: 'tray'
	},
	{
		name: 'Factor - Tangy Citrus Tofu Bowl',
		calories: 470,
		protein: 24,
		carbs: 41,
		fat: 24,
		servingSize: 1,
		servingUnit: 'tray'
	},

	// Curries & Bowls
	{
		name: 'Factor - Sweet Potato & Chickpea Curry',
		calories: 410,
		protein: 7,
		carbs: 52,
		fat: 19,
		servingSize: 335,
		servingUnit: 'g'
	},
	{
		name: 'Factor - Chickpea Curry with Forbidden Rice & Ginger Green Beans',
		calories: 490,
		protein: 11,
		carbs: 52,
		fat: 24,
		servingSize: 1,
		servingUnit: 'tray'
	},
	{
		name: 'Factor - Three Bean Vegan Chili with Cornbread Casserole',
		calories: 550,
		protein: 18,
		carbs: 65,
		fat: 24,
		servingSize: 1,
		servingUnit: 'tray'
	},
	{
		name: 'Factor - Mujadara (Lentils & Rice) with Tahini Roasted Carrots',
		calories: 480,
		protein: 14,
		carbs: 58,
		fat: 22,
		servingSize: 1,
		servingUnit: 'tray'
	},
	{
		name: 'Factor - Peanut Buddha Bowl with Quinoa',
		calories: 520,
		protein: 20,
		carbs: 48,
		fat: 28,
		servingSize: 1,
		servingUnit: 'tray'
	},
	{
		name: 'Factor - Baja Tofu, Black Beans & Rice',
		calories: 560,
		protein: 22,
		carbs: 55,
		fat: 28,
		servingSize: 1,
		servingUnit: 'tray'
	},
	{
		name: 'Factor - Spicy Sweet Potatoes with Coconut Rice & Miso Green Beans',
		calories: 450,
		protein: 10,
		carbs: 58,
		fat: 20,
		servingSize: 1,
		servingUnit: 'tray'
	},
	{
		name: 'Factor - Vegan Chorizo Bowl',
		calories: 510,
		protein: 18,
		carbs: 52,
		fat: 26,
		servingSize: 1,
		servingUnit: 'tray'
	}
];

async function seedForUser(uid: string) {
	// Skip if user already has custom foods seeded
	const existing = await db.select({ id: schema.customFoods.id })
		.from(schema.customFoods)
		.where(eq(schema.customFoods.userId, uid))
		.limit(1);

	if (existing.length > 0) {
		console.log(`  Skipping user ${uid} — already has custom foods.`);
		return;
	}

	for (const food of factorVegetarianMeals) {
		await db.insert(schema.customFoods).values({
			id: crypto.randomUUID(),
			userId: uid,
			name: food.name,
			calories: food.calories,
			protein: food.protein,
			carbs: food.carbs,
			fat: food.fat,
			servingSize: food.servingSize,
			servingUnit: food.servingUnit
		});
	}

	console.log(`  Seeded ${factorVegetarianMeals.length} meals for user ${uid}.`);
}

async function seed() {
	if (userId) {
		console.log(`Seeding custom foods for user ${userId}...`);
		await seedForUser(userId);
	} else {
		console.log('Seeding custom foods for ALL users...');
		const users = await db.select({ id: schema.users.id }).from(schema.users);
		for (const user of users) {
			await seedForUser(user.id);
		}
	}

	console.log('Done.');
}

seed().catch(console.error);
