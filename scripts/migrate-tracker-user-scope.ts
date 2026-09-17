/**
 * Adds user ownership to the tracker_* tables.
 *
 * These four tables predate multi-user support, so every row was visible to
 * every account. This adds user_id, assigns existing rows to a single owner,
 * then locks the column down as NOT NULL with a cascading FK.
 *
 * Owner defaults to TRACKER_BACKFILL_EMAIL, else the oldest admin account.
 * Safe to re-run.
 */
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

const TABLES = [
  "tracker_categories",
  "tracker_metrics",
  "tracker_entries",
  "tracker_goals",
] as const;

async function resolveOwnerId(): Promise<string> {
  const email = process.env.TRACKER_BACKFILL_EMAIL;
  if (email) {
    const rows = await sql.query("select id from users where email = $1", [email]);
    if (!rows.length) throw new Error(`No user with email ${email}`);
    return rows[0].id as string;
  }
  const rows = await sql.query(
    "select id, email from users where role = 'admin' order by created_at limit 1"
  );
  if (!rows.length) throw new Error("No admin user to assign existing tracker rows to");
  console.log(`  owner defaulted to oldest admin: ${rows[0].email}`);
  return rows[0].id as string;
}

async function hasColumn(table: string, column: string): Promise<boolean> {
  const rows = await sql.query(
    "select 1 from information_schema.columns where table_name = $1 and column_name = $2",
    [table, column]
  );
  return rows.length > 0;
}

async function main() {
  const ownerId = await resolveOwnerId();
  console.log(`Assigning existing tracker rows to user ${ownerId}\n`);

  for (const table of TABLES) {
    if (await hasColumn(table, "user_id")) {
      console.log(`${table}: user_id already present, skipping`);
      continue;
    }

    await sql.query(`alter table ${table} add column user_id text`);
    const updated = await sql.query(
      `update ${table} set user_id = $1 where user_id is null`,
      [ownerId]
    );
    await sql.query(`alter table ${table} alter column user_id set not null`);
    await sql.query(
      `alter table ${table}
         add constraint ${table}_user_id_users_id_fk
         foreign key (user_id) references users(id) on delete cascade`
    );
    console.log(`${table}: added user_id, backfilled ${updated.length ?? 0} rows, set not null + fk`);
  }

  // Category slugs were globally unique; they are now unique per user.
  const dupes = await sql.query(
    `select constraint_name from information_schema.table_constraints
      where table_name = 'tracker_categories' and constraint_type = 'UNIQUE'`
  );
  for (const row of dupes) {
    const name = row.constraint_name as string;
    if (name === "tracker_categories_user_slug_unique") continue;
    await sql.query(`alter table tracker_categories drop constraint "${name}"`);
    console.log(`tracker_categories: dropped old unique constraint ${name}`);
  }
  await sql.query(
    `alter table tracker_categories
       add constraint tracker_categories_user_slug_unique unique (user_id, slug)`
  ).catch((e: Error) => {
    if (!/already exists/.test(e.message)) throw e;
    console.log("tracker_categories: per-user slug unique already present");
  });

  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
