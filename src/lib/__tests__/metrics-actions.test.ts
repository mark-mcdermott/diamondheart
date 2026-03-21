import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockInsertValues = vi.fn().mockResolvedValue(undefined);
const mockInsert = vi.fn().mockReturnValue({ values: mockInsertValues });
const mockDeleteWhere = vi.fn().mockResolvedValue(undefined);
const mockDelete = vi.fn().mockReturnValue({ where: mockDeleteWhere });
const mockUpdateSetWhere = vi.fn().mockResolvedValue(undefined);
const mockUpdateSet = vi.fn().mockReturnValue({ where: mockUpdateSetWhere });
const mockUpdate = vi.fn().mockReturnValue({ set: mockUpdateSet });
const mockSelectResult: unknown[] = [];
const mockSelectLimit = vi.fn().mockResolvedValue(mockSelectResult);
const mockSelectWhere = vi.fn().mockReturnValue({ limit: mockSelectLimit });
const mockSelectFrom = vi.fn().mockReturnValue({ where: mockSelectWhere, orderBy: vi.fn().mockResolvedValue([]) });
const mockSelect = vi.fn().mockReturnValue({ from: mockSelectFrom });

vi.mock('$lib/server/db', () => ({
	createDb: vi.fn(() => ({
		select: mockSelect,
		insert: mockInsert,
		delete: mockDelete,
		update: mockUpdate
	})),
	trackerCategories: { id: 'id', slug: 'slug', sortOrder: 'sort_order' },
	trackerMetrics: { id: 'id', hidden: 'hidden', archived: 'archived', sortOrder: 'sort_order' }
}));

vi.mock('$env/dynamic/private', () => ({ env: {} }));

vi.mock('drizzle-orm', () => ({
	eq: vi.fn((a, b) => ({ field: a, value: b })),
	sql: Object.assign(vi.fn().mockReturnValue('sql'), {
		join: vi.fn(),
		raw: vi.fn()
	})
}));

import { actions } from '../../routes/metrics/+page.server';

function makeEvent(formData: Record<string, string>) {
	const fd = new FormData();
	for (const [k, v] of Object.entries(formData)) fd.append(k, v);
	return {
		request: { formData: vi.fn().mockResolvedValue(fd) },
		platform: { env: { DATABASE_URL: 'postgresql://test' } },
		locals: { user: { id: 'user-1' }, session: {} }
	};
}

describe('metrics actions', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Default: select returns empty for category lookup, and max sort order
		mockSelectLimit.mockResolvedValue([]);
		mockSelectFrom.mockReturnValue({ where: mockSelectWhere, orderBy: vi.fn().mockResolvedValue([]) });
	});

	describe('addMetric', () => {
		it('rejects unauthenticated requests', async () => {
			const event = makeEvent({ name: 'Steps', valueType: 'number' });
			event.locals.user = null as never;
			const result = await actions.addMetric(event as never);
			expect(result).toMatchObject({ status: 401 });
		});

		it('requires name and valueType', async () => {
			const result = await actions.addMetric(makeEvent({ name: '', valueType: '' }) as never);
			expect(result).toMatchObject({ status: 400, data: { error: 'Name and type are required' } });
		});

		it('requires dailyGoal >= 1', async () => {
			const result = await actions.addMetric(makeEvent({
				name: 'Steps',
				valueType: 'number',
				dailyGoal: '0'
			}) as never);
			expect(result).toMatchObject({ status: 400, data: { error: 'Daily goal must be at least 1' } });
		});

		it('rejects negative dailyGoal', async () => {
			const result = await actions.addMetric(makeEvent({
				name: 'Steps',
				valueType: 'number',
				dailyGoal: '-5'
			}) as never);
			expect(result).toMatchObject({ status: 400 });
		});

		it('succeeds with valid input and creates default category', async () => {
			// Mock: no default category exists, max sort order = -1
			mockSelectLimit.mockResolvedValueOnce([]); // no default category
			mockSelectFrom.mockReturnValueOnce({
				where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }),
				orderBy: vi.fn().mockResolvedValue([])
			});
			// Mock max sort order query
			mockSelect.mockReturnValueOnce({
				from: vi.fn().mockReturnValue({
					where: mockSelectWhere,
					orderBy: vi.fn().mockResolvedValue([])
				})
			});
			mockSelect.mockReturnValueOnce({
				from: vi.fn().mockResolvedValue([{ max: '-1' }])
			});

			const result = await actions.addMetric(makeEvent({
				name: 'Steps',
				valueType: 'number',
				dailyGoal: '10000'
			}) as never);

			expect(result).toEqual({ success: true });
		});

		it('handles invalid fields JSON gracefully', async () => {
			mockSelectLimit.mockResolvedValueOnce([{ id: 'cat-1' }]); // existing default category
			mockSelect.mockReturnValueOnce({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([{ id: 'cat-1' }]) })
				})
			});
			mockSelect.mockReturnValueOnce({
				from: vi.fn().mockResolvedValue([{ max: '0' }])
			});

			const result = await actions.addMetric(makeEvent({
				name: 'Steps',
				valueType: 'number',
				fields: 'not-valid-json{'
			}) as never);

			expect(result).toEqual({ success: true });
		});
	});

	describe('deleteMetric', () => {
		it('rejects unauthenticated requests', async () => {
			const event = makeEvent({ metricId: 'metric-1' });
			event.locals.user = null as never;
			const result = await actions.deleteMetric(event as never);
			expect(result).toMatchObject({ status: 401 });
		});

		it('requires metricId', async () => {
			const result = await actions.deleteMetric(makeEvent({ metricId: '' }) as never);
			expect(result).toMatchObject({ status: 400 });
		});

		it('succeeds with valid metricId', async () => {
			const result = await actions.deleteMetric(makeEvent({ metricId: 'metric-1' }) as never);
			expect(result).toEqual({ success: true });
			expect(mockDelete).toHaveBeenCalled();
		});
	});

	describe('toggleHidden', () => {
		it('requires metricId', async () => {
			const result = await actions.toggleHidden(makeEvent({ metricId: '' }) as never);
			expect(result).toMatchObject({ status: 400 });
		});

		it('returns 404 if metric not found', async () => {
			mockSelectLimit.mockResolvedValue([]);
			mockSelectFrom.mockReturnValue({
				where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([]) })
			});

			const result = await actions.toggleHidden(makeEvent({ metricId: 'nonexistent' }) as never);
			expect(result).toMatchObject({ status: 404 });
		});
	});

	describe('reorder', () => {
		it('requires ids JSON', async () => {
			const result = await actions.reorder(makeEvent({ ids: '' }) as never);
			expect(result).toMatchObject({ status: 400 });
		});

		it('rejects invalid JSON', async () => {
			const result = await actions.reorder(makeEvent({ ids: 'not-json' }) as never);
			expect(result).toMatchObject({ status: 400, data: { error: 'Invalid JSON' } });
		});

		it('succeeds with valid JSON array', async () => {
			const result = await actions.reorder(makeEvent({
				ids: '["id-1","id-2","id-3"]'
			}) as never);

			expect(result).toEqual({ success: true });
		});
	});
});
