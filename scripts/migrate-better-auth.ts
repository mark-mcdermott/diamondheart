/**
 * Applies the Better Auth schema (Phase 2 of docs/PORT-PLAN.md) as explicit SQL,
 * then backfills a credential `account` row for every user from `password_hash`
 * so existing passwords keep working. Every statement is idempotent.
 *
 *   pnpm db:migrate:better-auth              # against DATABASE_URL (development)
 *   pnpm db:migrate:better-auth --production # refuses unless the URL is production
 *
 * Never `db:push` against production — see CLAUDE.md.
 */
import { neon } from "@neondatabase/serverless";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  const production = process.argv.includes("--production");
  const isProductionHost = url.includes("ep-patient-fire");
  if (production !== isProductionHost) {
    throw new Error(
      production
        ? "--production given but DATABASE_URL is not the production host"
        : "DATABASE_URL is the production host; pass --production to confirm"
    );
  }
  console.log(`Migrating ${production ? "PRODUCTION" : "development"} (${url.replace(/\/\/.*@/, "//<redacted>@")})`);

  const sql = neon(url);

  await sql`alter table users add column if not exists email_verified boolean not null default false`;
  // Better Auth never writes this column; a NOT NULL here would make every sign-up fail.
  await sql`alter table users alter column password_hash drop not null`;

  await sql`create table if not exists session (
    id text primary key,
    user_id text not null references users(id) on delete cascade,
    token text not null unique,
    expires_at timestamptz not null,
    ip_address text,
    user_agent text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  )`;

  await sql`create table if not exists account (
    id text primary key,
    user_id text not null references users(id) on delete cascade,
    account_id text not null,
    provider_id text not null,
    access_token text,
    refresh_token text,
    id_token text,
    access_token_expires_at timestamptz,
    refresh_token_expires_at timestamptz,
    scope text,
    password text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  )`;

  await sql`create table if not exists verification (
    id text primary key,
    identifier text not null,
    value text not null,
    expires_at timestamptz not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  )`;

  const backfilled = await sql`insert into account (id, user_id, account_id, provider_id, password)
    select gen_random_uuid()::text, u.id, u.id, 'credential', u.password_hash
    from users u
    where not exists (
      select 1 from account a where a.user_id = u.id and a.provider_id = 'credential'
    )
    returning user_id`;

  const [counts] = await sql`select
    (select count(*)::int from users) as users,
    (select count(*)::int from account where provider_id = 'credential') as credential_accounts`;

  console.log(`Backfilled ${backfilled.length} credential account rows.`);
  console.log(`users: ${counts.users}, credential accounts: ${counts.credential_accounts}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
