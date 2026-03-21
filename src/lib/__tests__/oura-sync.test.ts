import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Build a chainable mock DB that tracks sequential select calls
let selectCallIndex = 0;
const selectResults: unknown[][] = [];

const mockInsertValues = vi.fn().mockResolvedValue(undefined);
const mockInsert = vi.fn().mockReturnValue({ values: mockInsertValues });
const mockUpdateSetWhere = vi.fn().mockResolvedValue(undefined);
const mockUpdateSet = vi.fn().mockReturnValue({ where: mockUpdateSetWhere });
const mockUpdate = vi.fn().mockReturnValue({ set: mockUpdateSet });

function buildSelectChain() {
	const where = vi.fn().mockImplementation(() => {
		const idx = selectCallIndex++;
		return Promise.resolve(selectResults[idx] ?? []);
	});
	const from = vi.fn().mockImplementation(() => {
		// If no .where() is called (bare select().from()), resolve directly
		const idx = selectCallIndex;
		return {
			where,
			then: (resolve: (v: unknown) => void) => {
				selectCallIndex++;
				resolve(selectResults[idx] ?? []);
			}
		};
	});
	const select = vi.fn().mockReturnValue({ from });
	return { select, from, where };
}

const chain = buildSelectChain();

const mockDb = {
	select: chain.select,
	insert: mockInsert,
	update: mockUpdate
};

vi.mock('$lib/server/db/schema', () => ({
	integrationConnections: { id: 'id', userId: 'user_id', service: 'service' },
	integrationSyncLog: { id: 'id', connectionId: 'connection_id', syncDate: 'sync_date', status: 'status' },
	trackerMetrics: { id: 'id', slug: 'slug', categoryId: 'category_id' },
	trackerEntries: { id: 'id', metricId: 'metric_id' },
	trackerCategories: { id: 'id', slug: 'slug' }
}));

vi.mock('drizzle-orm', () => ({
	eq: vi.fn((a, b) => ({ field: a, value: b })),
	and: vi.fn((...args) => ({ and: args }))
}));

vi.mock('$lib/server/biometrics', () => ({
	ensureBiometricMetrics: vi.fn().mockResolvedValue(undefined),
	BIOMETRIC_METRICS: [
		{ slug: 'bio-steps', name: 'Steps', unit: 'steps', providers: ['healthkit', 'oura'] },
		{ slug: 'bio-resting-hr', name: 'Resting Heart Rate', unit: 'bpm', providers: ['healthkit', 'oura'] },
		{ slug: 'bio-sleep-score', name: 'Sleep Score', unit: '', providers: ['oura'] },
		{ slug: 'bio-sleep-duration', name: 'Sleep Duration', unit: 'hours', providers: ['healthkit', 'oura'] },
		{ slug: 'bio-readiness', name: 'Readiness Score', unit: '', providers: ['oura'] },
		{ slug: 'bio-active-calories', name: 'Active Calories', unit: 'kcal', providers: ['healthkit', 'oura'] },
		{ slug: 'bio-spo2', name: 'Blood Oxygen', unit: '%', providers: ['healthkit', 'oura'] },
		{ slug: 'bio-stress', name: 'Stress Level', unit: '', providers: ['oura'] },
		{ slug: 'bio-hrv', name: 'HRV', unit: 'ms', providers: ['healthkit', 'oura'] }
	]
}));

import { syncOuraData, refreshOuraToken } from '../server/oura';

describe('oura sync', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		selectCallIndex = 0;
		selectResults.length = 0;
		// Re-setup mock chains after clearAllMocks
		mockInsert.mockReturnValue({ values: mockInsertValues });
		mockUpdate.mockReturnValue({ set: mockUpdateSet });
		mockUpdateSet.mockReturnValue({ where: mockUpdateSetWhere });
		chain.select.mockReturnValue({ from: chain.from });
		chain.from.mockImplementation(() => {
			const idx = selectCallIndex;
			return {
				where: vi.fn().mockImplementation(() => {
					const i = selectCallIndex++;
					return Promise.resolve(selectResults[i] ?? []);
				}),
				then: (resolve: (v: unknown) => void) => {
					selectCallIndex++;
					resolve(selectResults[idx] ?? []);
				}
			};
		});
	});

	it('skips sync when sync log already has a success entry', async () => {
		// First select: sync log check — returns existing entry
		selectResults[0] = [{ id: 'sync-1', status: 'success' }];

		const result = await syncOuraData(mockDb as never, 'conn-1', 'token', '2025-01-15');
		expect(result.entriesCreated).toBe(0);
		expect(mockFetch).not.toHaveBeenCalled();
	});

	it('creates entries from Oura API data', async () => {
		// First select (sync log check): no existing sync
		selectResults[0] = [];
		// Second select (trackerMetrics lookup): metrics in DB
		selectResults[1] = [
			{ id: 'm-steps', slug: 'bio-steps' },
			{ id: 'm-sleep', slug: 'bio-sleep-score' },
			{ id: 'm-readiness', slug: 'bio-readiness' },
			{ id: 'm-cal', slug: 'bio-active-calories' }
		];

		mockFetch.mockImplementation((url: string | URL) => {
			const urlStr = url.toString();
			if (urlStr.includes('daily_activity')) {
				return Promise.resolve({
					ok: true,
					json: () => Promise.resolve({ data: [{ steps: 8500, active_calories: 350 }] })
				});
			}
			if (urlStr.includes('daily_sleep')) {
				return Promise.resolve({
					ok: true,
					json: () => Promise.resolve({ data: [{ score: 85, total_sleep_duration: 28800 }] })
				});
			}
			if (urlStr.includes('daily_readiness')) {
				return Promise.resolve({
					ok: true,
					json: () => Promise.resolve({ data: [{ score: 78 }] })
				});
			}
			return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
		});

		const result = await syncOuraData(mockDb as never, 'conn-1', 'test-token', '2025-01-15');

		expect(result.entriesCreated).toBe(4);
		expect(mockInsert).toHaveBeenCalled();
	});

	it('handles Oura API errors gracefully', async () => {
		selectResults[0] = []; // no existing sync
		selectResults[1] = []; // no metrics (empty — nothing to map)

		mockFetch.mockResolvedValue({ ok: false, json: () => Promise.resolve({}) });

		const result = await syncOuraData(mockDb as never, 'conn-1', 'token', '2025-01-15');
		expect(result.entriesCreated).toBe(0);
	});
});

describe('oura token refresh', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		selectCallIndex = 0;
		selectResults.length = 0;
		mockUpdate.mockReturnValue({ set: mockUpdateSet });
		mockUpdateSet.mockReturnValue({ where: mockUpdateSetWhere });
		chain.select.mockReturnValue({ from: chain.from });
		chain.from.mockImplementation(() => {
			const idx = selectCallIndex;
			return {
				where: vi.fn().mockImplementation(() => {
					const i = selectCallIndex++;
					return Promise.resolve(selectResults[i] ?? []);
				}),
				then: (resolve: (v: unknown) => void) => {
					selectCallIndex++;
					resolve(selectResults[idx] ?? []);
				}
			};
		});
	});

	it('returns existing token if not expired', async () => {
		const futureDate = new Date(Date.now() + 3600000);
		selectResults[0] = [{
			id: 'conn-1',
			accessToken: 'valid-token',
			refreshToken: 'refresh-token',
			tokenExpiresAt: futureDate
		}];

		const token = await refreshOuraToken(mockDb as never, 'conn-1', 'client-id', 'client-secret');
		expect(token).toBe('valid-token');
		expect(mockFetch).not.toHaveBeenCalled();
	});

	it('refreshes expired token', async () => {
		const pastDate = new Date(Date.now() - 3600000);
		selectResults[0] = [{
			id: 'conn-1',
			accessToken: 'expired-token',
			refreshToken: 'refresh-token',
			tokenExpiresAt: pastDate
		}];

		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({
				access_token: 'new-token',
				refresh_token: 'new-refresh',
				expires_in: 3600
			})
		});

		const token = await refreshOuraToken(mockDb as never, 'conn-1', 'client-id', 'client-secret');
		expect(token).toBe('new-token');
		expect(mockUpdate).toHaveBeenCalled();
	});

	it('throws when no refresh token exists', async () => {
		selectResults[0] = [{
			id: 'conn-1',
			accessToken: null,
			refreshToken: null
		}];

		await expect(
			refreshOuraToken(mockDb as never, 'conn-1', 'client-id', 'client-secret')
		).rejects.toThrow('No refresh token available');
	});
});
