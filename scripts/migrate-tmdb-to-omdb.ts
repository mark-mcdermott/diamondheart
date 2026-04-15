import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL not set");

const sql = neon(url);

async function run() {
  await sql`ALTER TABLE entertainment_items DROP COLUMN IF EXISTS tmdb_id`;
  await sql`ALTER TABLE entertainment_items DROP COLUMN IF EXISTS poster_path`;
  await sql`ALTER TABLE entertainment_items DROP COLUMN IF EXISTS backdrop_path`;
  await sql`ALTER TABLE entertainment_items ADD COLUMN IF NOT EXISTS imdb_id text`;
  await sql`ALTER TABLE entertainment_items ADD COLUMN IF NOT EXISTS poster_url text`;
  console.log("entertainment_items migrated to OMDB schema");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
