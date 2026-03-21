import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockInsertValues = vi.fn().mockResolvedValue(undefined);
const mockInsert = vi.fn().mockReturnValue({ values: mockInsertValues });
const mockUpdateSetWhere = vi.fn().mockResolvedValue(undefined);
const mockUpdateSet = vi.fn().mockReturnValue({ where: mockUpdateSetWhere });
const mockUpdate = vi.fn().mockReturnValue({ set: mockUpdateSet });
const mockSelectWhere = vi.fn().mockResolvedValue([]);
const mockSelectFrom = vi.fn().mockReturnValue({ where: mockSelectWhere });
const mockSelect = vi.fn().mockReturnValue({ from: mockSelectFrom });

vi.mock('$lib/server/db', () => ({
	createDb: vi.fn(() => ({
		select: mockSelect,
		insert: mockInsert,
		update: mockUpdate
	})),
	integrationConnections: { id: 'id', userId: 'user_id', service: 'service' }
}));

vi.mock('$env/dynamic/private', () => ({
	env: {
		OURA_CLIENT_ID: 'test-client-id',
		OURA_CLIENT_SECRET: 'test-client-secret',
		DATABASE_URL: 'postgresql://test'
	}
}));

vi.mock('drizzle-orm', () => ({
	eq: vi.fn((a, b) => ({ field: a, value: b })),
	and: vi.fn((...args) => ({ and: args }))
}));

import { GET as authorizeHandler } from '../../routes/api/integrations/oura/authorize/+server';
import { POST as disconnectHandler } from '../../routes/api/integrations/oura/disconnect/+server';

describe('oura authorize', () => {
	it('redirects to Oura OAuth when configured', async () => {
		const event = {
			platform: { env: { OURA_CLIENT_ID: 'test-client-id' } },
			locals: { user: { id: 'user-1' } },
			url: new URL('http://localhost:5173/api/integrations/oura/authorize')
		};

		try {
			await authorizeHandler(event as never);
		} catch (e: unknown) {
			// SvelteKit redirect throws
			const err = e as { status?: number; location?: string };
			expect(err.status).toBe(302);
			expect(err.location).toContain('cloud.ouraring.com/oauth/authorize');
			expect(err.location).toContain('client_id=test-client-id');
		}
	});

	it('redirects to login when unauthenticated', async () => {
		const event = {
			platform: { env: {} },
			locals: { user: null },
			url: new URL('http://localhost:5173/api/integrations/oura/authorize')
		};

		try {
			await authorizeHandler(event as never);
		} catch (e: unknown) {
			const err = e as { status?: number; location?: string };
			expect(err.status).toBe(302);
			expect(err.location).toBe('/login');
		}
	});
});

describe('oura disconnect', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('rejects unauthenticated requests', async () => {
		const event = {
			platform: { env: { DATABASE_URL: 'postgresql://test' } },
			locals: { user: null }
		};

		try {
			await disconnectHandler(event as never);
		} catch (e: unknown) {
			const err = e as { status?: number };
			expect(err.status).toBe(401);
		}
	});

	it('returns 404 when no connection exists', async () => {
		mockSelectWhere.mockResolvedValueOnce([]);

		const event = {
			platform: { env: { DATABASE_URL: 'postgresql://test' } },
			locals: { user: { id: 'user-1' } }
		};

		try {
			await disconnectHandler(event as never);
		} catch (e: unknown) {
			const err = e as { status?: number };
			expect(err.status).toBe(404);
		}
	});

	it('disconnects an existing connection', async () => {
		mockSelectWhere.mockResolvedValueOnce([{ id: 'conn-1', service: 'oura' }]);

		const event = {
			platform: { env: { DATABASE_URL: 'postgresql://test' } },
			locals: { user: { id: 'user-1' } }
		};

		const response = await disconnectHandler(event as never);
		const body = await response.json();
		expect(body.ok).toBe(true);
		expect(mockUpdate).toHaveBeenCalled();
	});
});
