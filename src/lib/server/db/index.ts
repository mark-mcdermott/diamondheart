import { neon } from '@neondatabase/serverless';
import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http';
import * as schema from './schema';

export function createDb(databaseUrl: string) {
	const sql = neon(databaseUrl);
	return drizzle(sql, { schema });
}

export type Database = NeonHttpDatabase<typeof schema>;
export * from './schema';
