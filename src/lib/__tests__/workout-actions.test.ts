import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockInsertValues = vi.fn().mockResolvedValue(undefined);
const mockInsert = vi.fn().mockReturnValue({ values: mockInsertValues });
const mockDeleteWhere = vi.fn().mockResolvedValue(undefined);
const mockDelete = vi.fn().mockReturnValue({ where: mockDeleteWhere });
const mockUpdateSetWhere = vi.fn().mockResolvedValue(undefined);
const mockUpdateSet = vi.fn().mockReturnValue({ where: mockUpdateSetWhere });
const mockUpdate = vi.fn().mockReturnValue({ set: mockUpdateSet });

// Configurable select mock
let selectResults: unknown[] = [];
const mockSelectLimit = vi.fn().mockImplementation(() => Promise.resolve(selectResults));
const mockSelectOrderBy = vi.fn().mockReturnValue({ limit: mockSelectLimit });
const mockSelectWhere = vi.fn().mockReturnValue({ orderBy: mockSelectOrderBy, limit: mockSelectLimit });
const mockSelectFrom = vi.fn().mockReturnValue({ where: mockSelectWhere });
const mockSelect = vi.fn().mockReturnValue({ from: mockSelectFrom });

vi.mock('$lib/server/db', () => ({
	createDb: vi.fn(() => ({
		select: mockSelect,
		insert: mockInsert,
		delete: mockDelete,
		update: mockUpdate
	})),
	exercises: { id: 'id', isCustom: 'is_custom', userId: 'user_id', name: 'name', muscleGroup: 'muscle_group' },
	workouts: { id: 'id', userId: 'user_id', date: 'date' },
	workoutSets: { id: 'id', workoutId: 'workout_id', exerciseId: 'exercise_id', setNumber: 'set_number' },
	personalRecords: { id: 'id', userId: 'user_id', exerciseId: 'exercise_id', repCount: 'rep_count', weight: 'weight' }
}));

vi.mock('$env/dynamic/private', () => ({ env: {} }));

vi.mock('drizzle-orm', () => ({
	eq: vi.fn((a, b) => ({ field: a, value: b })),
	and: vi.fn((...args: unknown[]) => args),
	desc: vi.fn((a) => ({ desc: a }))
}));

import { actions } from '../../routes/workout/+page.server';

function makeEvent(formData: Record<string, string>) {
	const fd = new FormData();
	for (const [k, v] of Object.entries(formData)) fd.append(k, v);
	return {
		request: { formData: vi.fn().mockResolvedValue(fd) },
		platform: { env: { DATABASE_URL: 'postgresql://test' } },
		locals: { user: { id: 'user-1' }, session: {} }
	};
}

describe('workout actions', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		selectResults = [];
	});

	describe('startWorkout', () => {
		it('rejects unauthenticated requests', async () => {
			const event = makeEvent({ name: 'Leg Day' });
			event.locals.user = null as never;
			const result = await actions.startWorkout(event as never);
			expect(result).toMatchObject({ status: 401 });
		});

		it('creates a workout and redirects', async () => {
			await expect(actions.startWorkout(makeEvent({ name: 'Push Day' }) as never))
				.rejects.toMatchObject({ status: 302 });

			expect(mockInsert).toHaveBeenCalled();
			expect(mockInsertValues).toHaveBeenCalledWith(
				expect.objectContaining({
					userId: 'user-1',
					name: 'Push Day'
				})
			);
		});
	});

	describe('addSet', () => {
		it('rejects unauthenticated requests', async () => {
			const event = makeEvent({ workoutId: 'w1', exerciseId: 'e1', reps: '10', weight: '135' });
			event.locals.user = null as never;
			const result = await actions.addSet(event as never);
			expect(result).toMatchObject({ status: 401 });
		});

		it('requires all fields', async () => {
			const result = await actions.addSet(makeEvent({
				workoutId: '',
				exerciseId: '',
				reps: '',
				weight: ''
			}) as never);
			expect(result).toMatchObject({ status: 400 });
		});

		it('rejects NaN reps', async () => {
			const result = await actions.addSet(makeEvent({
				workoutId: 'w1',
				exerciseId: 'e1',
				reps: 'abc',
				weight: '135'
			}) as never);
			expect(result).toMatchObject({ status: 400 });
		});

		it('creates set and detects new PR when no prior record exists', async () => {
			// First select: existing sets (none) → set number = 1
			mockSelectLimit.mockResolvedValueOnce([]);
			// Second select: existing PR (none) → new PR
			mockSelectLimit.mockResolvedValueOnce([]);

			const result = await actions.addSet(makeEvent({
				workoutId: 'w1',
				exerciseId: 'e1',
				reps: '5',
				weight: '225'
			}) as never);

			expect(result).toMatchObject({ success: true, isPR: true });
			// Should have called insert twice: once for set, once for PR
			expect(mockInsert).toHaveBeenCalledTimes(2);
		});

		it('detects PR when beating existing record', async () => {
			// First select: existing sets → set number = 2
			mockSelectLimit.mockResolvedValueOnce([{ setNumber: 1 }]);
			// Second select: existing PR with lower weight
			mockSelectLimit.mockResolvedValueOnce([{ id: 'pr-1', weight: 200 }]);

			const result = await actions.addSet(makeEvent({
				workoutId: 'w1',
				exerciseId: 'e1',
				reps: '5',
				weight: '225'
			}) as never);

			expect(result).toMatchObject({ success: true, isPR: true });
			// Should delete old PR + insert set + insert new PR
			expect(mockDelete).toHaveBeenCalled();
		});

		it('does not flag PR when weight is lower than existing', async () => {
			// First select: existing sets
			mockSelectLimit.mockResolvedValueOnce([]);
			// Second select: existing PR with higher weight
			mockSelectLimit.mockResolvedValueOnce([{ id: 'pr-1', weight: 300 }]);

			const result = await actions.addSet(makeEvent({
				workoutId: 'w1',
				exerciseId: 'e1',
				reps: '5',
				weight: '225'
			}) as never);

			expect(result).toMatchObject({ success: true, isPR: false });
		});

		it('increments set number correctly', async () => {
			mockSelectLimit.mockResolvedValueOnce([{ setNumber: 3 }]);
			mockSelectLimit.mockResolvedValueOnce([{ id: 'pr-1', weight: 500 }]);

			await actions.addSet(makeEvent({
				workoutId: 'w1',
				exerciseId: 'e1',
				reps: '5',
				weight: '135'
			}) as never);

			expect(mockInsertValues).toHaveBeenCalledWith(
				expect.objectContaining({ setNumber: 4 })
			);
		});
	});

	describe('deleteSet', () => {
		it('requires setId', async () => {
			const result = await actions.deleteSet(makeEvent({ setId: '', workoutId: 'w1' }) as never);
			expect(result).toMatchObject({ status: 400 });
		});

		it('deletes set and returns workoutId', async () => {
			const result = await actions.deleteSet(makeEvent({ setId: 'set-1', workoutId: 'w1' }) as never);
			expect(result).toMatchObject({ success: true, workoutId: 'w1' });
			expect(mockDelete).toHaveBeenCalled();
		});
	});

	describe('finishWorkout', () => {
		it('requires workoutId', async () => {
			const result = await actions.finishWorkout(makeEvent({ workoutId: '' }) as never);
			expect(result).toMatchObject({ status: 400 });
		});

		it('finishes workout with duration and notes then redirects', async () => {
			await expect(actions.finishWorkout(makeEvent({
				workoutId: 'w1',
				duration: '45',
				notes: 'Felt strong today'
			}) as never)).rejects.toMatchObject({ status: 302 });

			expect(mockUpdate).toHaveBeenCalled();
			expect(mockUpdateSet).toHaveBeenCalledWith(
				expect.objectContaining({
					duration: 45,
					notes: 'Felt strong today'
				})
			);
		});

		it('sets duration to null for invalid values', async () => {
			await expect(actions.finishWorkout(makeEvent({
				workoutId: 'w1',
				duration: 'not-a-number',
				notes: ''
			}) as never)).rejects.toMatchObject({ status: 302 });

			expect(mockUpdateSet).toHaveBeenCalledWith(
				expect.objectContaining({ duration: null })
			);
		});
	});
});
