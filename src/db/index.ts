import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";

let _db: NeonHttpDatabase | null = null;

export const db = new Proxy({} as NeonHttpDatabase, {
  get(_target, prop) {
    if (!_db) {
      const sql = neon(process.env.DATABASE_URL!);
      _db = drizzle(sql);
    }
    return (_db as unknown as Record<string | symbol, unknown>)[prop];
  },
});
