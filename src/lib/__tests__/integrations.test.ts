import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSelectWhere = vi.fn().mockResolvedValue([]);
const mockSelectFrom = vi.fn().mockReturnValue({ where: mockSelectWhere });
const mockSelect = vi.fn().mockReturnValue({ from: mockSelectFrom });

vi.mock('$lib/server/db', () => ({
	createDb: vi.fn(() => ({
		select: mockSelect
	})),
	integrationConnections: { id: 'id', userId: 'user_id', service: 'service', status: 'status', lastSyncAt: 'last_sync_at', lastSyncError: 'last_sync_error', createdAt: 'created_at' }
}));

vi.mock('$env/dynamic/private', () => ({
	env: { DATABASE_URL: 'postgresql://test' }
}));

vi.mock('drizzle-orm', () => ({
	eq: vi.fn((a, b) => ({ field: a, value: b }))
}));

import { load } from '../../routes/account/integrations/+page.server';

describe('integrations page server', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('redirects unauthenticated users', async () => {
		try {
			await load({
				platform: { env: { DATABASE_URL: 'postgresql://test' } },
				locals: { user: null }
			} as never);
		} catch (e: unknown) {
			const err = e as { status?: number; location?: string };
			expect(err.status).toBe(302);
			expect(err.location).toBe('/login');
		}
	});

	it('returns empty connections when no database', async () => {
		const result = await load({
			platform: { env: {} },
			locals: { user: { id: 'user-1' } }
		} as never);

		expect(result).toEqual({ connections: [] });
	});

	it('returns connections for authenticated user', async () => {
		const connections = [
			{ id: 'conn-1', service: 'oura', status: 'active', lastSyncAt: null, lastSyncError: null, createdAt: new Date() },
			{ id: 'conn-2', service: 'healthkit', status: 'disconnected', lastSyncAt: null, lastSyncError: null, createdAt: new Date() }
		];
		mockSelectWhere.mockResolvedValueOnce(connections);

		const result = await load({
			platform: { env: { DATABASE_URL: 'postgresql://test' } },
			locals: { user: { id: 'user-1' } }
		} as never) as { connections: { service: string }[] };

		expect(result.connections).toHaveLength(2);
		expect(result.connections[0].service).toBe('oura');
	});
});
