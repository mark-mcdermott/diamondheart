import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockInsertValues = vi.fn().mockResolvedValue(undefined);
const mockInsert = vi.fn().mockReturnValue({ values: mockInsertValues });
const mockSelectResult: unknown[] = [];
const mockSelectWhere = vi.fn().mockResolvedValue(mockSelectResult);
const mockSelectFrom = vi.fn().mockReturnValue({ where: mockSelectWhere });
const mockSelect = vi.fn().mockReturnValue({ from: mockSelectFrom });

vi.mock('$lib/server/db', () => ({
	createDb: vi.fn(() => ({
		select: mockSelect,
		insert: mockInsert
	})),
	trackerCategories: { id: 'id', slug: 'slug' },
	trackerMetrics: { id: 'id', slug: 'slug', categoryId: 'category_id' }
}));

vi.mock('$lib/server/db/schema', () => ({
	trackerCategories: { id: 'id', slug: 'slug' },
	trackerMetrics: { id: 'id', slug: 'slug', categoryId: 'category_id' }
}));

vi.mock('drizzle-orm', () => ({
	eq: vi.fn((a, b) => ({ field: a, value: b }))
}));

import { ensureBiometricMetrics, BIOMETRIC_METRICS, BIOMETRIC_CATEGORY_SLUG } from '../server/biometrics';

describe('biometrics', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSelectWhere.mockResolvedValue([]);
	});

	it('exports 9 biometric metric definitions', () => {
		expect(BIOMETRIC_METRICS).toHaveLength(9);
	});

	it('all slugs start with bio-', () => {
		for (const m of BIOMETRIC_METRICS) {
			expect(m.slug).toMatch(/^bio-/);
		}
	});

	it('each metric has at least one provider', () => {
		for (const m of BIOMETRIC_METRICS) {
			expect(m.providers.length).toBeGreaterThan(0);
		}
	});

	it('category slug is "biometrics"', () => {
		expect(BIOMETRIC_CATEGORY_SLUG).toBe('biometrics');
	});

	it('creates category when it does not exist', async () => {
		// First select returns no existing category
		mockSelectWhere.mockResolvedValueOnce([]);
		// Second select returns no existing metrics
		mockSelectWhere.mockResolvedValueOnce([]);

		const db = { select: mockSelect, insert: mockInsert } as never;
		await ensureBiometricMetrics(db);

		// Should insert category + 9 metrics = 10 inserts
		expect(mockInsert).toHaveBeenCalledTimes(10);
	});

	it('skips category creation when it exists', async () => {
		// Category exists
		mockSelectWhere.mockResolvedValueOnce([{ id: 'cat-bio', slug: 'biometrics' }]);
		// No existing metrics
		mockSelectWhere.mockResolvedValueOnce([]);

		const db = { select: mockSelect, insert: mockInsert } as never;
		await ensureBiometricMetrics(db);

		// Should only insert 9 metrics, not the category
		expect(mockInsert).toHaveBeenCalledTimes(9);
	});

	it('skips metrics that already exist', async () => {
		// Category exists
		mockSelectWhere.mockResolvedValueOnce([{ id: 'cat-bio', slug: 'biometrics' }]);
		// 3 metrics already exist
		mockSelectWhere.mockResolvedValueOnce([
			{ slug: 'bio-steps' },
			{ slug: 'bio-hrv' },
			{ slug: 'bio-spo2' }
		]);

		const db = { select: mockSelect, insert: mockInsert } as never;
		await ensureBiometricMetrics(db);

		// 9 total - 3 existing = 6 inserts
		expect(mockInsert).toHaveBeenCalledTimes(6);
	});

	it('is fully idempotent — no inserts when all metrics exist', async () => {
		mockSelectWhere.mockResolvedValueOnce([{ id: 'cat-bio' }]);
		mockSelectWhere.mockResolvedValueOnce(
			BIOMETRIC_METRICS.map((m) => ({ slug: m.slug }))
		);

		const db = { select: mockSelect, insert: mockInsert } as never;
		await ensureBiometricMetrics(db);

		expect(mockInsert).not.toHaveBeenCalled();
	});
});
