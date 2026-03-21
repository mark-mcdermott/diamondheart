import { describe, it, expect, vi, beforeEach } from 'vitest';

// Track sequential select calls
let selectCallIndex = 0;
const selectResults: unknown[][] = [];

const mockInsertValues = vi.fn().mockResolvedValue(undefined);
const mockInsert = vi.fn().mockReturnValue({ values: mockInsertValues });
const mockUpdateSetWhere = vi.fn().mockResolvedValue(undefined);
const mockUpdateSet = vi.fn().mockReturnValue({ where: mockUpdateSetWhere });
const mockUpdate = vi.fn().mockReturnValue({ set: mockUpdateSet });

function makeFrom() {
	return vi.fn().mockImplementation(() => {
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
}

const mockFrom = makeFrom();
const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });

vi.mock('$lib/server/db', () => ({
	createDb: vi.fn(() => ({
		select: mockSelect,
		insert: mockInsert,
		update: mockUpdate
	})),
	integrationConnections: { id: 'id', userId: 'user_id', service: 'service', status: 'status' },
	integrationSyncLog: { id: 'id', connectionId: 'connection_id', syncDate: 'sync_date', status: 'status' },
	trackerMetrics: { id: 'id', slug: 'slug' },
	trackerEntries: { id: 'id' }
}));

vi.mock('$env/dynamic/private', () => ({
	env: { DATABASE_URL: 'postgresql://test' }
}));

vi.mock('drizzle-orm', () => ({
	eq: vi.fn((a, b) => ({ field: a, value: b })),
	and: vi.fn((...args) => ({ and: args }))
}));

vi.mock('$lib/server/biometrics', () => ({
	ensureBiometricMetrics: vi.fn().mockResolvedValue(undefined),
	BIOMETRIC_METRICS: [
		{ slug: 'bio-steps', name: 'Steps', unit: 'steps', providers: ['healthkit'] },
		{ slug: 'bio-resting-hr', name: 'Resting Heart Rate', unit: 'bpm', providers: ['healthkit'] },
		{ slug: 'bio-hrv', name: 'HRV', unit: 'ms', providers: ['healthkit'] },
		{ slug: 'bio-sleep-duration', name: 'Sleep Duration', unit: 'hours', providers: ['healthkit'] },
		{ slug: 'bio-active-calories', name: 'Active Calories', unit: 'kcal', providers: ['healthkit'] },
		{ slug: 'bio-spo2', name: 'Blood Oxygen', unit: '%', providers: ['healthkit'] }
	]
}));

import { POST as syncHandler } from '../../routes/api/integrations/healthkit/sync/+server';
import { POST as connectHandler } from '../../routes/api/integrations/healthkit/connect/+server';
import { POST as disconnectHandler } from '../../routes/api/integrations/healthkit/disconnect/+server';

function resetChain() {
	selectCallIndex = 0;
	selectResults.length = 0;
	mockInsert.mockReturnValue({ values: mockInsertValues });
	mockUpdate.mockReturnValue({ set: mockUpdateSet });
	mockUpdateSet.mockReturnValue({ where: mockUpdateSetWhere });
	mockSelect.mockReturnValue({ from: mockFrom });
	mockFrom.mockImplementation(() => {
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
}

function makeRequestEvent(body?: unknown, overrides: Record<string, unknown> = {}) {
	return {
		request: new Request('http://localhost:5173/api/integrations/healthkit/sync', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: body ? JSON.stringify(body) : undefined
		}),
		platform: { env: { DATABASE_URL: 'postgresql://test' } },
		locals: { user: { id: 'user-1' }, session: {} },
		...overrides
	};
}

describe('healthkit sync', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		resetChain();
	});

	it('rejects unauthenticated requests', async () => {
		try {
			await syncHandler(makeRequestEvent({ date: '2025-01-15' }, { locals: { user: null } }) as never);
		} catch (e: unknown) {
			expect((e as { status?: number }).status).toBe(401);
		}
	});

	it('returns 404 when no active HealthKit connection', async () => {
		selectResults[0] = []; // no connection

		try {
			await syncHandler(makeRequestEvent({ date: '2025-01-15' }) as never);
		} catch (e: unknown) {
			expect((e as { status?: number }).status).toBe(404);
		}
	});

	it('validates date format', async () => {
		selectResults[0] = [{ id: 'conn-1', status: 'active' }]; // active connection

		try {
			await syncHandler(makeRequestEvent({ date: 'invalid' }) as never);
		} catch (e: unknown) {
			expect((e as { status?: number }).status).toBe(400);
		}
	});

	it('returns skipped when already synced', async () => {
		selectResults[0] = [{ id: 'conn-1', status: 'active' }]; // active connection
		selectResults[1] = [{ id: 'sync-1', status: 'success' }]; // existing sync log

		const response = await syncHandler(makeRequestEvent({ date: '2025-01-15' }) as never);
		const body = await response.json();
		expect(body.ok).toBe(true);
		expect(body.skipped).toBe(true);
	});

	it('creates entries from payload', async () => {
		selectResults[0] = [{ id: 'conn-1', status: 'active' }]; // active connection
		selectResults[1] = []; // no existing sync
		// Third select: metrics in DB (from trackerMetrics)
		selectResults[2] = [
			{ id: 'm-steps', slug: 'bio-steps' },
			{ id: 'm-hr', slug: 'bio-resting-hr' },
			{ id: 'm-cal', slug: 'bio-active-calories' }
		];

		const response = await syncHandler(makeRequestEvent({
			date: '2025-01-15',
			steps: 10000,
			restingHeartRate: 58,
			activeCalories: 450
		}) as never);

		const body = await response.json();
		expect(body.ok).toBe(true);
		expect(body.entriesCreated).toBe(3);
	});
});

describe('healthkit connect', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		resetChain();
	});

	it('rejects unauthenticated requests', async () => {
		try {
			await connectHandler({
				platform: { env: { DATABASE_URL: 'postgresql://test' } },
				locals: { user: null }
			} as never);
		} catch (e: unknown) {
			expect((e as { status?: number }).status).toBe(401);
		}
	});

	it('creates a new connection', async () => {
		selectResults[0] = []; // no existing connection

		const response = await connectHandler({
			platform: { env: { DATABASE_URL: 'postgresql://test' } },
			locals: { user: { id: 'user-1' } }
		} as never);

		const body = await response.json();
		expect(body.ok).toBe(true);
		expect(body.connectionId).toBeDefined();
		expect(mockInsert).toHaveBeenCalled();
	});

	it('reactivates an existing disconnected connection', async () => {
		selectResults[0] = [{ id: 'conn-1', status: 'disconnected' }]; // existing

		const response = await connectHandler({
			platform: { env: { DATABASE_URL: 'postgresql://test' } },
			locals: { user: { id: 'user-1' } }
		} as never);

		const body = await response.json();
		expect(body.ok).toBe(true);
		expect(mockUpdate).toHaveBeenCalled();
	});
});

describe('healthkit disconnect', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		resetChain();
	});

	it('returns 404 when no connection exists', async () => {
		selectResults[0] = [];

		try {
			await disconnectHandler({
				platform: { env: { DATABASE_URL: 'postgresql://test' } },
				locals: { user: { id: 'user-1' } }
			} as never);
		} catch (e: unknown) {
			expect((e as { status?: number }).status).toBe(404);
		}
	});

	it('disconnects an existing connection', async () => {
		selectResults[0] = [{ id: 'conn-1' }];

		const response = await disconnectHandler({
			platform: { env: { DATABASE_URL: 'postgresql://test' } },
			locals: { user: { id: 'user-1' } }
		} as never);

		const body = await response.json();
		expect(body.ok).toBe(true);
		expect(mockUpdate).toHaveBeenCalled();
	});
});
