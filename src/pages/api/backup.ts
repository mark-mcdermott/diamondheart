import type { APIRoute } from "astro";
import { createBackup } from "@/lib/server/backup";

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const secret = request.headers.get("x-backup-secret");
  if (!secret || secret !== process.env.BACKUP_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return Response.json({ error: "Database not configured" }, { status: 500 });
  }

  try {
    const { manifest } = await createBackup(databaseUrl);

    return Response.json({
      ok: true,
      timestamp: manifest.timestamp,
      tables: manifest.tables,
      totalRows: Object.values(manifest.tables).reduce((a, b) => a + b, 0),
    });
  } catch (err) {
    console.error("Backup failed:", err);
    return Response.json({ error: "Backup failed" }, { status: 500 });
  }
};
