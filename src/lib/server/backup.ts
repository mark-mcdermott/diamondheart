import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

const ALL_TABLES = [
	'users', 'tracker_categories', 'tracker_metrics', 'tracker_entries', 'tracker_goals',
	'orders', 'contact_submissions', 'exercises', 'workouts', 'workout_sets',
	'personal_records', 'food_log', 'food_log_items', 'custom_foods', 'favorite_foods',
	'favorite_meals', 'favorite_meal_items', 'integration_connections', 'integration_sync_log',
	'reminder_schedules',
] as const;

export interface BackupManifest {
	version: 1;
	timestamp: string;
	tables: Record<string, number>;
}

export async function createBackup(databaseUrl: string): Promise<{ manifest: BackupManifest; data: Record<string, unknown[]> }> {
	const sql = neon(databaseUrl);
	const db = drizzle(sql);

	const data: Record<string, unknown[]> = {};
	const tableCounts: Record<string, number> = {};

	for (const table of ALL_TABLES) {
		const rows = await db.execute(`SELECT * FROM "${table}"`);
		data[table] = rows.rows;
		tableCounts[table] = rows.rows.length;
	}

	return {
		manifest: { version: 1, timestamp: new Date().toISOString(), tables: tableCounts },
		data,
	};
}
