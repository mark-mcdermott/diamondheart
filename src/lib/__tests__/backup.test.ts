import { describe, it, expect, vi } from 'vitest';
import { pruneBackups } from '$lib/server/backup';

function createMockBucket(objects: { key: string }[]) {
	const deleted: string[] = [];
	return {
		list: vi.fn().mockResolvedValue({ objects }),
		delete: vi.fn().mockImplementation((key: string) => {
			deleted.push(key);
			return Promise.resolve();
		}),
		put: vi.fn().mockResolvedValue({}),
		get: vi.fn().mockResolvedValue(null),
		_deleted: deleted
	};
}

describe('pruneBackups', () => {
	it('keeps backups within 7 days', async () => {
		const now = new Date();
		const yesterday = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
		const bucket = createMockBucket([
			{ key: `backups/${yesterday}/manifest.json` },
			{ key: `backups/${yesterday}/users.json` }
		]);

		const pruned = await pruneBackups(bucket as never);
		expect(pruned).toEqual([]);
		expect(bucket._deleted).toEqual([]);
	});

	it('prunes non-Sunday backups older than 7 days', async () => {
		const now = new Date();
		let daysAgo = 10;
		let oldDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
		while (oldDate.getUTCDay() === 0) {
			daysAgo++;
			oldDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
		}
		const oldDateStr = oldDate.toISOString().split('T')[0];

		const bucket = createMockBucket([
			{ key: `backups/${oldDateStr}/manifest.json` },
			{ key: `backups/${oldDateStr}/users.json` }
		]);

		const pruned = await pruneBackups(bucket as never);
		expect(pruned).toContain(oldDateStr);
		expect(bucket._deleted).toHaveLength(2);
	});

	it('keeps Sunday backups within 28 days', async () => {
		const now = new Date();
		let daysAgo = 8;
		let sunday = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
		while (sunday.getUTCDay() !== 0) {
			daysAgo++;
			sunday = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
		}
		if (daysAgo > 27) return;

		const sundayStr = sunday.toISOString().split('T')[0];
		const bucket = createMockBucket([
			{ key: `backups/${sundayStr}/manifest.json` },
			{ key: `backups/${sundayStr}/users.json` }
		]);

		const pruned = await pruneBackups(bucket as never);
		expect(pruned).not.toContain(sundayStr);
		expect(bucket._deleted).toEqual([]);
	});

	it('prunes all backups older than 28 days', async () => {
		const now = new Date();
		const oldDate = new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000);
		const oldDateStr = oldDate.toISOString().split('T')[0];

		const bucket = createMockBucket([
			{ key: `backups/${oldDateStr}/manifest.json` }
		]);

		const pruned = await pruneBackups(bucket as never);
		expect(pruned).toContain(oldDateStr);
	});
});
