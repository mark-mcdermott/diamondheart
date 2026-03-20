import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './db/schema';

// Local R2 types — @cloudflare/workers-types isn't hoisted by pnpm
export interface R2Object {
	key: string;
}
export interface R2Bucket {
	put(key: string, value: string | ArrayBuffer | Uint8Array | ReadableStream, options?: { httpMetadata?: { contentType?: string } }): Promise<unknown>;
	get(key: string): Promise<unknown>;
	delete(key: string): Promise<void>;
	list(options?: { prefix?: string }): Promise<{ objects: R2Object[] }>;
}

const ALL_TABLES = [
	'users',
	'sessions',
	'tracker_categories',
	'tracker_metrics',
	'tracker_entries',
	'tracker_goals',
	'orders',
	'contact_submissions',
	'exercises',
	'workouts',
	'workout_sets',
	'personal_records',
	'food_log',
	'food_log_items',
	'custom_foods',
	'favorite_foods',
	'favorite_meals',
	'favorite_meal_items'
] as const;

// Tables to skip in backups (ephemeral data)
const SKIP_TABLES = ['sessions'] as const;

export interface BackupManifest {
	version: 1;
	timestamp: string;
	tables: Record<string, number>;
}

export async function createBackup(databaseUrl: string): Promise<{ manifest: BackupManifest; data: Record<string, unknown[]> }> {
	const sql = neon(databaseUrl);
	const db = drizzle(sql, { schema });

	const data: Record<string, unknown[]> = {};
	const tableCounts: Record<string, number> = {};

	for (const table of ALL_TABLES) {
		if ((SKIP_TABLES as readonly string[]).includes(table)) continue;
		const rows = await db.execute(`SELECT * FROM "${table}"`);
		data[table] = rows.rows;
		tableCounts[table] = rows.rows.length;
	}

	const manifest: BackupManifest = {
		version: 1,
		timestamp: new Date().toISOString(),
		tables: tableCounts
	};

	return { manifest, data };
}

export async function storeBackup(
	bucket: R2Bucket,
	manifest: BackupManifest,
	data: Record<string, unknown[]>
): Promise<string> {
	const dateKey = manifest.timestamp.split('T')[0]; // YYYY-MM-DD
	const prefix = `backups/${dateKey}`;

	// Store each table as a separate JSON file for granular restores
	for (const [table, rows] of Object.entries(data)) {
		await bucket.put(`${prefix}/${table}.json`, JSON.stringify(rows), {
			httpMetadata: { contentType: 'application/json' }
		});
	}

	// Store manifest
	await bucket.put(`${prefix}/manifest.json`, JSON.stringify(manifest, null, 2), {
		httpMetadata: { contentType: 'application/json' }
	});

	return prefix;
}

export async function pruneBackups(bucket: R2Bucket): Promise<string[]> {
	// Keep 7 daily + 4 weekly (Sundays) — prune anything older
	const now = new Date();
	const dailyCutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
	const weeklyCutoff = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);

	const listed = await bucket.list({ prefix: 'backups/' });
	const backupDates = new Set<string>();

	for (const obj of listed.objects) {
		const match = obj.key.match(/^backups\/(\d{4}-\d{2}-\d{2})\//);
		if (match) backupDates.add(match[1]);
	}

	const pruned: string[] = [];

	for (const dateStr of backupDates) {
		const date = new Date(dateStr + 'T00:00:00Z');
		const isSunday = date.getUTCDay() === 0;

		// Keep if within 7 days
		if (date >= dailyCutoff) continue;
		// Keep Sundays within 28 days
		if (isSunday && date >= weeklyCutoff) continue;

		// Delete all files for this date
		const toDelete = listed.objects
			.filter((obj) => obj.key.startsWith(`backups/${dateStr}/`))
			.map((obj) => obj.key);

		for (const key of toDelete) {
			await bucket.delete(key);
		}
		pruned.push(dateStr);
	}

	return pruned;
}
