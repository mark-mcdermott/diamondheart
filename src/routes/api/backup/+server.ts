import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createBackup, storeBackup, pruneBackups } from '$lib/server/backup';

// Triggered by Cloudflare Cron Trigger (see wrangler.toml)
// Also callable manually with the backup secret for on-demand backups
export const GET: RequestHandler = async ({ platform, request }) => {
	const secret = request.headers.get('x-backup-secret');
	const expectedSecret = platform?.env?.BACKUP_SECRET;

	if (!expectedSecret || secret !== expectedSecret) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const databaseUrl = platform?.env?.DATABASE_URL;
	const bucket = platform?.env?.R2_BACKUPS;

	if (!databaseUrl) {
		return json({ error: 'DATABASE_URL not configured' }, { status: 500 });
	}
	if (!bucket) {
		return json({ error: 'R2_BACKUPS bucket not configured' }, { status: 500 });
	}

	try {
		const { manifest, data } = await createBackup(databaseUrl);
		const prefix = await storeBackup(bucket, manifest, data);
		const pruned = await pruneBackups(bucket);

		return json({
			ok: true,
			backup: prefix,
			tables: manifest.tables,
			totalRows: Object.values(manifest.tables).reduce((a, b) => a + b, 0),
			pruned
		});
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Unknown error';
		return json({ error: 'Backup failed', detail: message }, { status: 500 });
	}
};
