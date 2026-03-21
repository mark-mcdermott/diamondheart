import { describe, it, expect, vi, beforeEach } from 'vitest';

// Track sequential select calls
let selectCallIndex = 0;
const selectResults: unknown[][] = [];

const mockInsertValues = vi.fn().mockResolvedValue(undefined);
const mockInsert = vi.fn().mockReturnValue({ values: mockInsertValues });
const mockUpdateSetWhere = vi.fn().mockResolvedValue(undefined);
const mockUpdateSet = vi.fn().mockReturnValue({ where: mockUpdateSetWhere });
const mockUpdate = vi.fn().mockReturnValue({ set: mockUpdateSet });
const mockDeleteWhere = vi.fn().mockResolvedValue(undefined);
const mockDelete = vi.fn().mockReturnValue({ where: mockDeleteWhere });

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
		update: mockUpdate,
		delete: mockDelete
	})),
	reminderSchedules: { id: 'id', userId: 'user_id', metricId: 'metric_id' },
	trackerMetrics: { id: 'id', name: 'name', slug: 'slug', archived: 'archived', hidden: 'hidden' }
}));

vi.mock('$env/dynamic/private', () => ({
	env: { DATABASE_URL: 'postgresql://test' }
}));

vi.mock('drizzle-orm', () => ({
	eq: vi.fn((a, b) => ({ field: a, value: b })),
	and: vi.fn((...args) => ({ and: args }))
}));

import { GET, POST } from '../../routes/api/reminders/+server';
import { PATCH, DELETE as DELETE_HANDLER } from '../../routes/api/reminders/[id]/+server';

function resetChain() {
	selectCallIndex = 0;
	selectResults.length = 0;
	vi.clearAllMocks();
	mockInsert.mockReturnValue({ values: mockInsertValues });
	mockUpdate.mockReturnValue({ set: mockUpdateSet });
	mockUpdateSet.mockReturnValue({ where: mockUpdateSetWhere });
	mockDelete.mockReturnValue({ where: mockDeleteWhere });
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

describe('reminders API - GET', () => {
	beforeEach(resetChain);

	it('rejects unauthenticated requests', async () => {
		try {
			await GET({
				platform: { env: { DATABASE_URL: 'postgresql://test' } },
				locals: { user: null }
			} as never);
		} catch (e: unknown) {
			expect((e as { status?: number }).status).toBe(401);
		}
	});

	it('returns empty array when no database', async () => {
		const res = await GET({
			platform: { env: {} },
			locals: { user: { id: 'user-1' } }
		} as never);
		const body = await res.json();
		expect(body).toEqual([]);
	});

	it('returns reminders for authenticated user', async () => {
		selectResults[0] = [
			{ id: 'r-1', label: 'Log water', time: '09:00', days: [1, 2, 3, 4, 5], enabled: true }
		];

		const res = await GET({
			platform: { env: { DATABASE_URL: 'postgresql://test' } },
			locals: { user: { id: 'user-1' } }
		} as never);
		const body = await res.json();
		expect(body).toHaveLength(1);
		expect(body[0].label).toBe('Log water');
	});
});

describe('reminders API - POST', () => {
	beforeEach(resetChain);

	it('rejects unauthenticated requests', async () => {
		try {
			await POST({
				request: new Request('http://localhost/api/reminders', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ label: 'Test', time: '09:00' })
				}),
				platform: { env: { DATABASE_URL: 'postgresql://test' } },
				locals: { user: null }
			} as never);
		} catch (e: unknown) {
			expect((e as { status?: number }).status).toBe(401);
		}
	});

	it('requires label and time', async () => {
		try {
			await POST({
				request: new Request('http://localhost/api/reminders', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ label: '', time: '' })
				}),
				platform: { env: { DATABASE_URL: 'postgresql://test' } },
				locals: { user: { id: 'user-1' } }
			} as never);
		} catch (e: unknown) {
			expect((e as { status?: number }).status).toBe(400);
		}
	});

	it('validates time format', async () => {
		try {
			await POST({
				request: new Request('http://localhost/api/reminders', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ label: 'Test', time: '9am' })
				}),
				platform: { env: { DATABASE_URL: 'postgresql://test' } },
				locals: { user: { id: 'user-1' } }
			} as never);
		} catch (e: unknown) {
			expect((e as { status?: number }).status).toBe(400);
		}
	});

	it('creates a reminder with valid input', async () => {
		const res = await POST({
			request: new Request('http://localhost/api/reminders', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ label: 'Log water', time: '09:00', days: [1, 2, 3, 4, 5] })
			}),
			platform: { env: { DATABASE_URL: 'postgresql://test' } },
			locals: { user: { id: 'user-1' } }
		} as never);

		expect(res.status).toBe(201);
		const body = await res.json();
		expect(body.ok).toBe(true);
		expect(body.id).toBeDefined();
		expect(mockInsert).toHaveBeenCalled();
	});

	it('defaults to all days when not specified', async () => {
		await POST({
			request: new Request('http://localhost/api/reminders', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ label: 'Daily log', time: '08:00' })
			}),
			platform: { env: { DATABASE_URL: 'postgresql://test' } },
			locals: { user: { id: 'user-1' } }
		} as never);

		const insertCall = mockInsertValues.mock.calls[0][0];
		expect(insertCall.days).toEqual([0, 1, 2, 3, 4, 5, 6]);
	});
});

describe('reminders API - PATCH', () => {
	beforeEach(resetChain);

	it('returns 404 when reminder not found', async () => {
		selectResults[0] = []; // no matching reminder

		try {
			await PATCH({
				params: { id: 'nonexistent' },
				request: new Request('http://localhost/api/reminders/nonexistent', {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ enabled: false })
				}),
				platform: { env: { DATABASE_URL: 'postgresql://test' } },
				locals: { user: { id: 'user-1' } }
			} as never);
		} catch (e: unknown) {
			expect((e as { status?: number }).status).toBe(404);
		}
	});

	it('updates an existing reminder', async () => {
		selectResults[0] = [{ id: 'r-1', userId: 'user-1', enabled: true }];

		const res = await PATCH({
			params: { id: 'r-1' },
			request: new Request('http://localhost/api/reminders/r-1', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ enabled: false })
			}),
			platform: { env: { DATABASE_URL: 'postgresql://test' } },
			locals: { user: { id: 'user-1' } }
		} as never);

		const body = await res.json();
		expect(body.ok).toBe(true);
		expect(mockUpdate).toHaveBeenCalled();
	});
});

describe('reminders API - DELETE', () => {
	beforeEach(resetChain);

	it('returns 404 when reminder not found', async () => {
		selectResults[0] = [];

		try {
			await DELETE_HANDLER({
				params: { id: 'nonexistent' },
				platform: { env: { DATABASE_URL: 'postgresql://test' } },
				locals: { user: { id: 'user-1' } }
			} as never);
		} catch (e: unknown) {
			expect((e as { status?: number }).status).toBe(404);
		}
	});

	it('deletes an existing reminder', async () => {
		selectResults[0] = [{ id: 'r-1', userId: 'user-1' }];

		const res = await DELETE_HANDLER({
			params: { id: 'r-1' },
			platform: { env: { DATABASE_URL: 'postgresql://test' } },
			locals: { user: { id: 'user-1' } }
		} as never);

		const body = await res.json();
		expect(body.ok).toBe(true);
		expect(mockDelete).toHaveBeenCalled();
	});
});
