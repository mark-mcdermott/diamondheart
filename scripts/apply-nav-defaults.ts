/**
 * Brings an existing account's nav in line with DEFAULT_NAV_ITEMS.
 *
 * Nav rows are created per user at signup, so changing the defaults only
 * affects new accounts. This applies them to accounts that already exist —
 * which also repairs accounts seeded from the old drifted list that was missing
 * Metrics entirely.
 *
 *   node --env-file=.env --import tsx scripts/apply-nav-defaults.ts --email you@example.com
 *   node --env-file=.env --import tsx scripts/apply-nav-defaults.ts --all
 *
 * Nothing is deleted. Custom entries (metric categories a user added to their
 * nav) are left exactly as they are.
 */
import { neon } from "@neondatabase/serverless";
import { randomUUID } from "crypto";
import { DEFAULT_NAV_ITEMS } from "../src/lib/nav-utils";

const sql = neon(process.env.DATABASE_URL!);

type User = { id: string; email: string };

function parseArgs(): { email?: string; all: boolean; dryRun: boolean } {
  const argv = process.argv.slice(2);
  const at = (flag: string) => {
    const i = argv.indexOf(flag);
    return i === -1 ? undefined : argv[i + 1];
  };
  return { email: at("--email"), all: argv.includes("--all"), dryRun: argv.includes("--dry-run") };
}

async function applyTo(user: User, dryRun: boolean): Promise<void> {
  const existing = (await sql.query(
    "select id, href, label, visible, locked, sort_order, item_type from user_nav_items where user_id = $1",
    [user.id]
  )) as { id: string; href: string; visible: boolean; item_type: string }[];

  const byHref = new Map(existing.map((r) => [r.href, r]));
  const custom = existing.filter((r) => r.item_type === "metric_category");

  let added = 0;
  let changed = 0;

  for (const [i, item] of DEFAULT_NAV_ITEMS.entries()) {
    const row = byHref.get(item.href);
    if (!row) {
      if (!dryRun) {
        await sql.query(
          `insert into user_nav_items (id, user_id, label, href, item_type, sort_order, visible, locked)
           values ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [randomUUID(), user.id, item.label, item.href, item.itemType, i, item.visible, item.locked]
        );
      }
      added++;
      continue;
    }
    if (row.visible !== item.visible) {
      if (!dryRun) {
        await sql.query(
          "update user_nav_items set label=$1, item_type=$2, sort_order=$3, visible=$4, locked=$5, updated_at=now() where id=$6",
          [item.label, item.itemType, i, item.visible, item.locked, row.id]
        );
      }
      changed++;
    } else if (!dryRun) {
      await sql.query(
        "update user_nav_items set label=$1, item_type=$2, sort_order=$3, locked=$4, updated_at=now() where id=$5",
        [item.label, item.itemType, i, item.locked, row.id]
      );
    }
  }

  const verb = dryRun ? "would apply" : "applied";
  console.log(
    `${user.email}: ${verb} — ${added} added, ${changed} visibility changes, ${custom.length} custom entries untouched`
  );
}

async function main() {
  const { email, all, dryRun } = parseArgs();
  if (!email && !all) {
    console.error("Usage: --email <address> | --all   [--dry-run]");
    process.exit(2);
  }

  const users = (await (email
    ? sql.query("select id, email from users where email = $1", [email])
    : sql.query("select id, email from users order by created_at"))) as User[];

  if (users.length === 0) throw new Error(email ? `No user with email ${email}` : "No users");
  if (dryRun) console.log("(dry run — nothing will be written)\n");

  for (const u of users) await applyTo(u, dryRun);
  console.log(`\n${dryRun ? "Checked" : "Updated"} ${users.length} account(s).`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
