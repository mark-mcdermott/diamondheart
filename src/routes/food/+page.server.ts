import { redirect, fail } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { createDb, foodLog, foodLogItems, customFoods, favoriteFoods, favoriteMeals, favoriteMealItems } from '$lib/server/db';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ platform, locals }) => {
	if (!locals.user) {
		redirect(302, '/login');
	}

	const databaseUrl = platform?.env?.DATABASE_URL || env.DATABASE_URL;

	if (!databaseUrl) {
		return { meals: {}, totals: { calories: 0, protein: 0, carbs: 0, fat: 0 }, recentFoods: [], customFoods: [], favoriteFoods: [], favoriteMeals: [] };
	}

	const db = createDb(databaseUrl);

	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const tomorrow = new Date(today);
	tomorrow.setDate(tomorrow.getDate() + 1);

	// Get today's food logs with items
	const todayLogs = await db
		.select({
			logId: foodLog.id,
			mealType: foodLog.mealType,
			itemId: foodLogItems.id,
			itemName: foodLogItems.name,
			fdcId: foodLogItems.fdcId,
			servingSize: foodLogItems.servingSize,
			servingUnit: foodLogItems.servingUnit,
			calories: foodLogItems.calories,
			protein: foodLogItems.protein,
			carbs: foodLogItems.carbs,
			fat: foodLogItems.fat,
			quantity: foodLogItems.quantity
		})
		.from(foodLog)
		.leftJoin(foodLogItems, eq(foodLogItems.foodLogId, foodLog.id))
		.where(
			and(
				eq(foodLog.userId, locals.user.id),
				gte(foodLog.date, today),
				lte(foodLog.date, tomorrow)
			)
		);

	// Group by meal type
	const meals: Record<string, Array<{
		id: string;
		name: string;
		fdcId: string | null;
		servingSize: number;
		servingUnit: string;
		calories: number;
		protein: number;
		carbs: number;
		fat: number;
		quantity: number;
	}>> = {
		breakfast: [],
		lunch: [],
		dinner: [],
		snack: []
	};

	const totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };

	for (const row of todayLogs) {
		if (!row.itemId) continue;

		const item = {
			id: row.itemId,
			name: row.itemName!,
			fdcId: row.fdcId,
			servingSize: row.servingSize!,
			servingUnit: row.servingUnit!,
			calories: row.calories!,
			protein: row.protein!,
			carbs: row.carbs!,
			fat: row.fat!,
			quantity: row.quantity!
		};

		const meal = row.mealType as string;
		if (meals[meal]) {
			meals[meal].push(item);
		}

		totals.calories += item.calories * item.quantity;
		totals.protein += item.protein * item.quantity;
		totals.carbs += item.carbs * item.quantity;
		totals.fat += item.fat * item.quantity;
	}

	// Get recent/frequent foods (last 30 days, distinct by name)
	const recentFoods = await db
		.select({
			name: foodLogItems.name,
			fdcId: foodLogItems.fdcId,
			servingSize: foodLogItems.servingSize,
			servingUnit: foodLogItems.servingUnit,
			calories: foodLogItems.calories,
			protein: foodLogItems.protein,
			carbs: foodLogItems.carbs,
			fat: foodLogItems.fat,
			count: sql<number>`count(*)`.as('count')
		})
		.from(foodLogItems)
		.innerJoin(foodLog, eq(foodLogItems.foodLogId, foodLog.id))
		.where(
			and(
				eq(foodLog.userId, locals.user.id),
				gte(foodLog.date, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
			)
		)
		.groupBy(
			foodLogItems.name,
			foodLogItems.fdcId,
			foodLogItems.servingSize,
			foodLogItems.servingUnit,
			foodLogItems.calories,
			foodLogItems.protein,
			foodLogItems.carbs,
			foodLogItems.fat
		)
		.orderBy(desc(sql`count(*)`))
		.limit(10);

	// Load user's custom foods for search
	const userCustomFoods = await db
		.select()
		.from(customFoods)
		.where(eq(customFoods.userId, locals.user.id))
		.orderBy(customFoods.name);

	// Load favorite foods
	const userFavoriteFoods = await db
		.select()
		.from(favoriteFoods)
		.where(eq(favoriteFoods.userId, locals.user.id))
		.orderBy(favoriteFoods.name);

	// Load favorite meals with items
	const userFavoriteMeals = await db
		.select()
		.from(favoriteMeals)
		.where(eq(favoriteMeals.userId, locals.user.id))
		.orderBy(favoriteMeals.name);

	const favoriteMealItemsList = userFavoriteMeals.length > 0
		? await db
			.select()
			.from(favoriteMealItems)
			.where(sql`${favoriteMealItems.favoriteMealId} IN (${sql.join(userFavoriteMeals.map(m => sql`${m.id}`), sql`, `)})`)
		: [];

	const favMealsWithItems = userFavoriteMeals.map(meal => ({
		...meal,
		items: favoriteMealItemsList.filter(item => item.favoriteMealId === meal.id)
	}));

	return { meals, totals, recentFoods, customFoods: userCustomFoods, favoriteFoods: userFavoriteFoods, favoriteMeals: favMealsWithItems };
};

function generateId() {
	return crypto.randomUUID();
}

export const actions: Actions = {
	addFood: async ({ request, platform, locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'Unauthorized' });
		}

		const databaseUrl = platform?.env?.DATABASE_URL || env.DATABASE_URL;
		if (!databaseUrl) {
			return fail(500, { error: 'Database not configured' });
		}

		const formData = await request.formData();
		const mealType = formData.get('mealType') as string;
		const name = formData.get('name') as string;
		const fdcId = (formData.get('fdcId') as string) || null;
		const servingSize = parseInt(formData.get('servingSize') as string) || 100;
		const servingUnit = (formData.get('servingUnit') as string) || 'g';
		const calories = parseInt(formData.get('calories') as string) || 0;
		const protein = parseInt(formData.get('protein') as string) || 0;
		const carbs = parseInt(formData.get('carbs') as string) || 0;
		const fat = parseInt(formData.get('fat') as string) || 0;
		const quantity = parseInt(formData.get('quantity') as string) || 1;

		if (!mealType || !name) {
			return fail(400, { error: 'Meal type and food name are required' });
		}

		const db = createDb(databaseUrl);

		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const tomorrow = new Date(today);
		tomorrow.setDate(tomorrow.getDate() + 1);

		// Find or create food log for this meal today
		const existingLogs = await db
			.select()
			.from(foodLog)
			.where(
				and(
					eq(foodLog.userId, locals.user.id),
					eq(foodLog.mealType, mealType),
					gte(foodLog.date, today),
					lte(foodLog.date, tomorrow)
				)
			)
			.limit(1);

		let logId: string;

		if (existingLogs.length > 0) {
			logId = existingLogs[0].id;
		} else {
			logId = generateId();
			await db.insert(foodLog).values({
				id: logId,
				userId: locals.user.id,
				date: new Date(),
				mealType
			});
		}

		// Add the food item
		await db.insert(foodLogItems).values({
			id: generateId(),
			foodLogId: logId,
			name,
			fdcId,
			servingSize,
			servingUnit,
			calories,
			protein,
			carbs,
			fat,
			quantity
		});

		return { success: true };
	},

	removeFood: async ({ request, platform, locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'Unauthorized' });
		}

		const databaseUrl = platform?.env?.DATABASE_URL || env.DATABASE_URL;
		if (!databaseUrl) {
			return fail(500, { error: 'Database not configured' });
		}

		const formData = await request.formData();
		const itemId = formData.get('itemId') as string;

		if (!itemId) {
			return fail(400, { error: 'Item ID is required' });
		}

		const db = createDb(databaseUrl);

		// Verify ownership: join through foodLogItems -> foodLog -> check userId
		const items = await db
			.select({ id: foodLogItems.id, userId: foodLog.userId })
			.from(foodLogItems)
			.innerJoin(foodLog, eq(foodLogItems.foodLogId, foodLog.id))
			.where(eq(foodLogItems.id, itemId))
			.limit(1);

		if (items.length === 0 || items[0].userId !== locals.user.id) {
			return fail(403, { error: 'Not authorized to delete this item' });
		}

		await db.delete(foodLogItems).where(eq(foodLogItems.id, itemId));

		return { success: true };
	},

	createCustomFood: async ({ request, platform, locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'Unauthorized' });
		}

		const databaseUrl = platform?.env?.DATABASE_URL || env.DATABASE_URL;
		if (!databaseUrl) {
			return fail(500, { error: 'Database not configured' });
		}

		const formData = await request.formData();
		const name = formData.get('name') as string;
		const calories = parseInt(formData.get('calories') as string) || 0;
		const protein = parseInt(formData.get('protein') as string) || 0;
		const carbs = parseInt(formData.get('carbs') as string) || 0;
		const fat = parseInt(formData.get('fat') as string) || 0;
		const servingSize = parseInt(formData.get('servingSize') as string) || 100;
		const servingUnit = (formData.get('servingUnit') as string) || 'g';

		if (!name) {
			return fail(400, { error: 'Food name is required' });
		}

		const db = createDb(databaseUrl);

		await db.insert(customFoods).values({
			id: generateId(),
			userId: locals.user.id,
			name,
			calories,
			protein,
			carbs,
			fat,
			servingSize,
			servingUnit
		});

		return { success: true, customFoodCreated: true };
	},

	favoriteFood: async ({ request, platform, locals }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' });
		const databaseUrl = platform?.env?.DATABASE_URL || env.DATABASE_URL;
		if (!databaseUrl) return fail(500, { error: 'Database not configured' });

		const formData = await request.formData();
		const name = formData.get('name') as string;
		const fdcId = (formData.get('fdcId') as string) || null;
		const servingSize = parseInt(formData.get('servingSize') as string) || 100;
		const servingUnit = (formData.get('servingUnit') as string) || 'g';
		const calories = parseInt(formData.get('calories') as string) || 0;
		const protein = parseInt(formData.get('protein') as string) || 0;
		const carbs = parseInt(formData.get('carbs') as string) || 0;
		const fat = parseInt(formData.get('fat') as string) || 0;

		if (!name) return fail(400, { error: 'Food name is required' });

		const db = createDb(databaseUrl);

		await db.insert(favoriteFoods).values({
			id: generateId(),
			userId: locals.user.id,
			name,
			fdcId,
			servingSize,
			servingUnit,
			calories,
			protein,
			carbs,
			fat
		});

		return { success: true, favorited: true };
	},

	unfavoriteFood: async ({ request, platform, locals }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' });
		const databaseUrl = platform?.env?.DATABASE_URL || env.DATABASE_URL;
		if (!databaseUrl) return fail(500, { error: 'Database not configured' });

		const formData = await request.formData();
		const favoriteId = formData.get('favoriteId') as string;
		if (!favoriteId) return fail(400, { error: 'Favorite ID is required' });

		const db = createDb(databaseUrl);

		await db.delete(favoriteFoods).where(
			and(eq(favoriteFoods.id, favoriteId), eq(favoriteFoods.userId, locals.user.id))
		);

		return { success: true };
	},

	saveFavoriteMeal: async ({ request, platform, locals }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' });
		const databaseUrl = platform?.env?.DATABASE_URL || env.DATABASE_URL;
		if (!databaseUrl) return fail(500, { error: 'Database not configured' });

		const formData = await request.formData();
		const name = formData.get('mealName') as string;
		const mealType = formData.get('mealType') as string;

		if (!name || !mealType) return fail(400, { error: 'Meal name is required' });

		const db = createDb(databaseUrl);

		// Get items from the meal type for today
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const tomorrow = new Date(today);
		tomorrow.setDate(tomorrow.getDate() + 1);

		const todayItems = await db
			.select({
				name: foodLogItems.name,
				fdcId: foodLogItems.fdcId,
				servingSize: foodLogItems.servingSize,
				servingUnit: foodLogItems.servingUnit,
				calories: foodLogItems.calories,
				protein: foodLogItems.protein,
				carbs: foodLogItems.carbs,
				fat: foodLogItems.fat,
				quantity: foodLogItems.quantity
			})
			.from(foodLogItems)
			.innerJoin(foodLog, eq(foodLogItems.foodLogId, foodLog.id))
			.where(
				and(
					eq(foodLog.userId, locals.user.id),
					eq(foodLog.mealType, mealType),
					gte(foodLog.date, today),
					lte(foodLog.date, tomorrow)
				)
			);

		if (todayItems.length === 0) return fail(400, { error: 'No items in this meal to save' });

		const mealId = generateId();
		await db.insert(favoriteMeals).values({
			id: mealId,
			userId: locals.user.id,
			name
		});

		for (const item of todayItems) {
			await db.insert(favoriteMealItems).values({
				id: generateId(),
				favoriteMealId: mealId,
				name: item.name,
				fdcId: item.fdcId,
				servingSize: item.servingSize,
				servingUnit: item.servingUnit,
				calories: item.calories,
				protein: item.protein,
				carbs: item.carbs,
				fat: item.fat,
				quantity: item.quantity
			});
		}

		return { success: true, mealSaved: true };
	},

	deleteFavoriteMeal: async ({ request, platform, locals }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' });
		const databaseUrl = platform?.env?.DATABASE_URL || env.DATABASE_URL;
		if (!databaseUrl) return fail(500, { error: 'Database not configured' });

		const formData = await request.formData();
		const mealId = formData.get('mealId') as string;
		if (!mealId) return fail(400, { error: 'Meal ID is required' });

		const db = createDb(databaseUrl);

		await db.delete(favoriteMeals).where(
			and(eq(favoriteMeals.id, mealId), eq(favoriteMeals.userId, locals.user.id))
		);

		return { success: true };
	},

	logFavoriteMeal: async ({ request, platform, locals }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' });
		const databaseUrl = platform?.env?.DATABASE_URL || env.DATABASE_URL;
		if (!databaseUrl) return fail(500, { error: 'Database not configured' });

		const formData = await request.formData();
		const mealId = formData.get('mealId') as string;
		const mealType = formData.get('mealType') as string;

		if (!mealId || !mealType) return fail(400, { error: 'Meal ID and type are required' });

		const db = createDb(databaseUrl);

		// Get items for this favorite meal
		const items = await db
			.select()
			.from(favoriteMealItems)
			.where(eq(favoriteMealItems.favoriteMealId, mealId));

		if (items.length === 0) return fail(400, { error: 'Favorite meal has no items' });

		// Find or create food log for today
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const tomorrow = new Date(today);
		tomorrow.setDate(tomorrow.getDate() + 1);

		const existingLogs = await db
			.select()
			.from(foodLog)
			.where(
				and(
					eq(foodLog.userId, locals.user.id),
					eq(foodLog.mealType, mealType),
					gte(foodLog.date, today),
					lte(foodLog.date, tomorrow)
				)
			)
			.limit(1);

		let logId: string;
		if (existingLogs.length > 0) {
			logId = existingLogs[0].id;
		} else {
			logId = generateId();
			await db.insert(foodLog).values({
				id: logId,
				userId: locals.user.id,
				date: new Date(),
				mealType
			});
		}

		// Log all items from the favorite meal
		for (const item of items) {
			await db.insert(foodLogItems).values({
				id: generateId(),
				foodLogId: logId,
				name: item.name,
				fdcId: item.fdcId,
				servingSize: item.servingSize,
				servingUnit: item.servingUnit,
				calories: item.calories,
				protein: item.protein,
				carbs: item.carbs,
				fat: item.fat,
				quantity: item.quantity
			});
		}

		return { success: true };
	}
};
