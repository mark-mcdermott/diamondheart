import { describe, it, expect, vi, beforeEach } from 'vitest';

// Chainable mock builder
function chain(resolveValue: unknown = []) {
	const obj: Record<string, unknown> = {};
	const methods = ['select', 'insert', 'update', 'delete', 'from', 'set', 'values',
		'where', 'orderBy', 'limit', 'innerJoin', 'leftJoin', 'groupBy'];
	for (const m of methods) obj[m] = vi.fn().mockReturnValue(obj);
	obj.then = vi.fn().mockImplementation((resolve: (v: unknown) => void) => resolve(resolveValue));
	return obj;
}

const mockDbChain = chain();
const mockInsertChain = chain();
const mockDeleteChain = chain();
const mockSelectChain = chain();

vi.mock('$lib/server/db', () => ({
	createDb: vi.fn(() => ({
		select: vi.fn().mockReturnValue(mockSelectChain),
		insert: vi.fn().mockReturnValue(mockInsertChain),
		delete: vi.fn().mockReturnValue(mockDeleteChain)
	})),
	foodLog: { id: 'id', userId: 'user_id', mealType: 'meal_type', date: 'date' },
	foodLogItems: { id: 'id', foodLogId: 'food_log_id', name: 'name' },
	customFoods: { id: 'id', userId: 'user_id', name: 'name' },
	favoriteFoods: { id: 'id', userId: 'user_id', name: 'name' },
	favoriteMeals: { id: 'id', userId: 'user_id', name: 'name' },
	favoriteMealItems: { id: 'id', favoriteMealId: 'favorite_meal_id' }
}));

vi.mock('$env/dynamic/private', () => ({ env: {} }));

vi.mock('drizzle-orm', () => ({
	eq: vi.fn((a, b) => ({ field: a, value: b })),
	and: vi.fn((...args: unknown[]) => args),
	gte: vi.fn((a, b) => ({ field: a, gte: b })),
	lte: vi.fn((a, b) => ({ field: a, lte: b })),
	desc: vi.fn((a) => ({ desc: a })),
	sql: Object.assign(vi.fn(), { join: vi.fn() })
}));

import { actions } from '../../routes/food/+page.server';

function makeEvent(formData: Record<string, string>, user = { id: 'user-1', email: 'test@test.com', name: 'Test', avatarUrl: null }) {
	const fd = new FormData();
	for (const [k, v] of Object.entries(formData)) fd.append(k, v);
	return {
		request: { formData: vi.fn().mockResolvedValue(fd) },
		platform: { env: { DATABASE_URL: 'postgresql://test' } },
		locals: { user, session: {} }
	};
}

describe('food actions', () => {
	beforeEach(() => vi.clearAllMocks());

	describe('addFood', () => {
		it('rejects unauthenticated requests', async () => {
			const event = makeEvent({ mealType: 'lunch', name: 'Rice' });
			event.locals.user = null as never;
			const result = await actions.addFood(event as never);
			expect(result).toMatchObject({ status: 401 });
		});

		it('requires mealType and name', async () => {
			const result = await actions.addFood(makeEvent({ mealType: '', name: '' }) as never);
			expect(result).toMatchObject({ status: 400, data: { error: 'Meal type and food name are required' } });
		});

		it('requires name', async () => {
			const result = await actions.addFood(makeEvent({ mealType: 'lunch', name: '' }) as never);
			expect(result).toMatchObject({ status: 400 });
		});

		it('succeeds with valid input', async () => {
			// Mock: no existing log found
			mockSelectChain.then = vi.fn().mockImplementation((resolve: (v: unknown) => void) => resolve([]));
			mockSelectChain.limit = vi.fn().mockResolvedValue([]);

			const result = await actions.addFood(makeEvent({
				mealType: 'lunch',
				name: 'Chicken Breast',
				calories: '165',
				protein: '31',
				carbs: '0',
				fat: '4',
				quantity: '1'
			}) as never);

			expect(result).toEqual({ success: true });
		});
	});

	describe('removeFood', () => {
		it('rejects unauthenticated requests', async () => {
			const event = makeEvent({ itemId: 'item-1' });
			event.locals.user = null as never;
			const result = await actions.removeFood(event as never);
			expect(result).toMatchObject({ status: 401 });
		});

		it('requires itemId', async () => {
			const result = await actions.removeFood(makeEvent({ itemId: '' }) as never);
			expect(result).toMatchObject({ status: 400, data: { error: 'Item ID is required' } });
		});

		it('rejects if item not owned by user', async () => {
			// Mock: item found but belongs to different user
			mockSelectChain.limit = vi.fn().mockResolvedValue([{ id: 'item-1', userId: 'other-user' }]);

			const result = await actions.removeFood(makeEvent({ itemId: 'item-1' }) as never);
			expect(result).toMatchObject({ status: 403 });
		});
	});

	describe('createCustomFood', () => {
		it('rejects unauthenticated requests', async () => {
			const event = makeEvent({ name: 'My Food' });
			event.locals.user = null as never;
			const result = await actions.createCustomFood(event as never);
			expect(result).toMatchObject({ status: 401 });
		});

		it('requires food name', async () => {
			const result = await actions.createCustomFood(makeEvent({ name: '' }) as never);
			expect(result).toMatchObject({ status: 400, data: { error: 'Food name is required' } });
		});

		it('succeeds with valid input', async () => {
			const result = await actions.createCustomFood(makeEvent({
				name: 'Protein Shake',
				calories: '200',
				protein: '30',
				carbs: '10',
				fat: '5'
			}) as never);

			expect(result).toEqual({ success: true, customFoodCreated: true });
		});
	});

	describe('favoriteFood', () => {
		it('rejects unauthenticated requests', async () => {
			const event = makeEvent({ name: 'Chicken' });
			event.locals.user = null as never;
			const result = await actions.favoriteFood(event as never);
			expect(result).toMatchObject({ status: 401 });
		});

		it('requires food name', async () => {
			const result = await actions.favoriteFood(makeEvent({ name: '' }) as never);
			expect(result).toMatchObject({ status: 400 });
		});

		it('succeeds with valid input', async () => {
			const result = await actions.favoriteFood(makeEvent({ name: 'Chicken', calories: '165' }) as never);
			expect(result).toEqual({ success: true, favorited: true });
		});
	});

	describe('unfavoriteFood', () => {
		it('rejects unauthenticated requests', async () => {
			const event = makeEvent({ favoriteId: 'fav-1' });
			event.locals.user = null as never;
			const result = await actions.unfavoriteFood(event as never);
			expect(result).toMatchObject({ status: 401 });
		});

		it('requires favoriteId', async () => {
			const result = await actions.unfavoriteFood(makeEvent({ favoriteId: '' }) as never);
			expect(result).toMatchObject({ status: 400 });
		});
	});

	describe('saveFavoriteMeal', () => {
		it('rejects unauthenticated requests', async () => {
			const event = makeEvent({ mealName: 'Lunch', mealType: 'lunch' });
			event.locals.user = null as never;
			const result = await actions.saveFavoriteMeal(event as never);
			expect(result).toMatchObject({ status: 401 });
		});

		it('requires meal name and type', async () => {
			const result = await actions.saveFavoriteMeal(makeEvent({ mealName: '', mealType: '' }) as never);
			expect(result).toMatchObject({ status: 400 });
		});
	});

	describe('deleteFavoriteMeal', () => {
		it('requires mealId', async () => {
			const result = await actions.deleteFavoriteMeal(makeEvent({ mealId: '' }) as never);
			expect(result).toMatchObject({ status: 400 });
		});
	});

	describe('logFavoriteMeal', () => {
		it('rejects unauthenticated requests', async () => {
			const event = makeEvent({ mealId: 'meal-1', mealType: 'lunch' });
			event.locals.user = null as never;
			const result = await actions.logFavoriteMeal(event as never);
			expect(result).toMatchObject({ status: 401 });
		});

		it('requires mealId and mealType', async () => {
			const result = await actions.logFavoriteMeal(makeEvent({ mealId: '', mealType: '' }) as never);
			expect(result).toMatchObject({ status: 400 });
		});
	});
});
