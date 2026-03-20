/**
 * Restore database from a backup stored in R2.
 *
 * Usage:
 *   npx tsx scripts/restore-db.ts                    # restore latest backup
 *   npx tsx scripts/restore-db.ts 2026-03-20         # restore specific date
 *   npx tsx scripts/restore-db.ts 2026-03-20 users   # restore single table
 *
 * Requires:
 *   DATABASE_URL        — Neon connection string
 *   R2_ENDPOINT         — R2 S3-compatible endpoint (https://<account_id>.r2.cloudflarestorage.com)
 *   R2_ACCESS_KEY_ID    — R2 API token access key
 *   R2_SECRET_ACCESS_KEY — R2 API token secret key
 *   R2_BACKUP_BUCKET    — Bucket name (default: ortholinear-backups)
 */
import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

const TABLE_ORDER = [
	'users',
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
];

interface BackupManifest {
	version: number;
	timestamp: string;
	tables: Record<string, number>;
}

async function r2Fetch(path: string): Promise<Response> {
	const endpoint = process.env.R2_ENDPOINT;
	const bucket = process.env.R2_BACKUP_BUCKET || 'ortholinear-backups';
	const accessKey = process.env.R2_ACCESS_KEY_ID;
	const secretKey = process.env.R2_SECRET_ACCESS_KEY;

	if (!endpoint || !accessKey || !secretKey) {
		throw new Error('R2 credentials not configured. Set R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY');
	}

	// Use presigned-style URL via S3 compatible API
	const url = `${endpoint}/${bucket}/${path}`;
	const res = await fetch(url, {
		headers: {
			'Authorization': `AWS4-HMAC-SHA256 Credential=${accessKey}`,
			'x-amz-content-sha256': 'UNSIGNED-PAYLOAD'
		}
	});
	return res;
}

async function listBackupDates(): Promise<string[]> {
	// Fetch the bucket listing — for simplicity we'll try known recent dates
	const dates: string[] = [];
	const now = new Date();
	for (let i = 0; i < 30; i++) {
		const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
		const dateStr = d.toISOString().split('T')[0];
		const res = await r2Fetch(`backups/${dateStr}/manifest.json`);
		if (res.ok) dates.push(dateStr);
	}
	return dates;
}

async function restore(dateStr: string | null, tableFilter: string | null) {
	const databaseUrl = process.env.DATABASE_URL;
	if (!databaseUrl) throw new Error('DATABASE_URL is required');

	// Find the backup date
	let targetDate = dateStr;
	if (!targetDate) {
		console.log('No date specified, finding latest backup...');
		const dates = await listBackupDates();
		if (dates.length === 0) throw new Error('No backups found in the last 30 days');
		targetDate = dates[0];
		console.log(`Latest backup: ${targetDate}`);
	}

	// Fetch manifest
	const manifestRes = await r2Fetch(`backups/${targetDate}/manifest.json`);
	if (!manifestRes.ok) throw new Error(`No backup found for ${targetDate}`);
	const manifest: BackupManifest = await manifestRes.json();

	console.log(`\nBackup from: ${manifest.timestamp}`);
	console.log('Tables:');
	for (const [table, count] of Object.entries(manifest.tables)) {
		console.log(`  ${table}: ${count} rows`);
	}

	const tables = tableFilter ? [tableFilter] : TABLE_ORDER.filter((t) => t in manifest.tables);

	// Confirm
	console.log(`\n⚠️  This will TRUNCATE and replace ${tables.length} table(s) in the target database.`);
	console.log(`Target: ${databaseUrl.replace(/:[^@]+@/, ':***@')}`);
	console.log('Press Ctrl+C within 5 seconds to abort...\n');
	await new Promise((r) => setTimeout(r, 5000));

	const sql = neon(databaseUrl);
	const db = drizzle(sql);

	// Disable FK constraints during restore
	await db.execute('SET session_replication_role = replica');

	for (const table of tables) {
		console.log(`Restoring ${table}...`);
		const dataRes = await r2Fetch(`backups/${targetDate}/${table}.json`);
		if (!dataRes.ok) {
			console.log(`  ⚠️  No data file for ${table}, skipping`);
			continue;
		}

		const rows: Record<string, unknown>[] = await dataRes.json();
		await db.execute(`TRUNCATE TABLE "${table}" CASCADE`);

		if (rows.length === 0) {
			console.log(`  (empty table)`);
			continue;
		}

		// Insert in batches of 100
		const batchSize = 100;
		for (let i = 0; i < rows.length; i += batchSize) {
			const batch = rows.slice(i, i + batchSize);
			const columns = Object.keys(batch[0]);
			const placeholders = batch
				.map((_, rowIdx) =>
					`(${columns.map((_, colIdx) => `$${rowIdx * columns.length + colIdx + 1}`).join(', ')})`
				)
				.join(', ');
			const values = batch.flatMap((row) => columns.map((col) => {
				const val = row[col];
				// Serialize objects/arrays as JSON strings for jsonb columns
				if (val !== null && typeof val === 'object') return JSON.stringify(val);
				return val;
			}));

			await db.execute(
				`INSERT INTO "${table}" (${columns.map((c) => `"${c}"`).join(', ')}) VALUES ${placeholders}`,
				values
			);
		}

		console.log(`  ✓ ${rows.length} rows`);
	}

	// Re-enable FK constraints
	await db.execute('SET session_replication_role = DEFAULT');

	console.log('\nRestore complete.');
}

const [dateArg, tableArg] = process.argv.slice(2);
restore(dateArg || null, tableArg || null).catch((err) => {
	console.error('Restore failed:', err.message);
	process.exit(1);
});
