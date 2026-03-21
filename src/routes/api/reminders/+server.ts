import { json, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { createDb, reminderSchedules } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

// GET — list all reminders for the current user
export const GET: RequestHandler = async ({ platform, locals }) => {
	if (!locals.user) {
		error(401, 'Unauthorized');
	}

	const databaseUrl = platform?.env?.DATABASE_URL || env.DATABASE_URL;
	if (!databaseUrl) {
		return json([]);
	}

	const db = createDb(databaseUrl);

	const reminders = await db
		.select()
		.from(reminderSchedules)
		.where(eq(reminderSchedules.userId, locals.user.id));

	return json(reminders);
};

// POST — create a new reminder
export const POST: RequestHandler = async ({ request, platform, locals }) => {
	if (!locals.user) {
		error(401, 'Unauthorized');
	}

	const databaseUrl = platform?.env?.DATABASE_URL || env.DATABASE_URL;
	if (!databaseUrl) {
		error(500, 'Database not configured');
	}

	let body: { metricId?: string; label?: string; time?: string; days?: number[]; timezone?: string };
	try {
		body = await request.json();
	} catch {
		error(400, 'Invalid JSON');
	}

	if (!body.label || !body.time) {
		error(400, 'Label and time are required');
	}

	if (!/^\d{2}:\d{2}$/.test(body.time)) {
		error(400, 'Time must be in HH:MM format');
	}

	const days = body.days ?? [0, 1, 2, 3, 4, 5, 6];
	if (!Array.isArray(days) || days.some((d) => typeof d !== 'number' || d < 0 || d > 6)) {
		error(400, 'Days must be an array of numbers 0-6');
	}

	const db = createDb(databaseUrl);

	const id = crypto.randomUUID();
	await db.insert(reminderSchedules).values({
		id,
		userId: locals.user.id,
		metricId: body.metricId || null,
		label: body.label,
		time: body.time,
		days,
		timezone: body.timezone || 'America/Chicago',
		enabled: true
	});

	return json({ ok: true, id }, { status: 201 });
};
