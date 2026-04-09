import { NextResponse } from "next/server";
import { createBackup } from "@/lib/server/backup";

export async function GET(request: Request) {
  const secret = request.headers.get("x-backup-secret");
  if (!secret || secret !== process.env.BACKUP_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  try {
    const { manifest } = await createBackup(databaseUrl);

    return NextResponse.json({
      ok: true,
      timestamp: manifest.timestamp,
      tables: manifest.tables,
      totalRows: Object.values(manifest.tables).reduce((a, b) => a + b, 0),
    });
  } catch (err) {
    console.error("Backup failed:", err);
    return NextResponse.json({ error: "Backup failed" }, { status: 500 });
  }
}
