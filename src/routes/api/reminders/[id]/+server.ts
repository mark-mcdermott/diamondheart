import { json, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { createDb, reminderSchedules } from '$lib/server/db';
import { eq, and } from 'drizzle-orm';
import type { RequestHandler } from './$types';

// PATCH — update a reminder (toggle enabled, change time/days, etc.)
export const PATCH: RequestHandler = async ({ params, request, platform, locals }) => {
	if (!locals.user) {
		error(401, 'Unauthorized');
	}

	const databaseUrl = platform?.env?.DATABASE_URL || env.DATABASE_URL;
	if (!databaseUrl) {
		error(500, 'Database not configured');
	}

	const db = createDb(databaseUrl);

	// Verify ownership
	const [existing] = await db
		.select()
		.from(reminderSchedules)
		.where(and(eq(reminderSchedules.id, params.id), eq(reminderSchedules.userId, locals.user.id)));

	if (!existing) {
		error(404, 'Reminder not found');
	}

	let body: { label?: string; time?: string; days?: number[]; timezone?: string; enabled?: boolean; metricId?: string | null };
	try {
		body = await request.json();
	} catch {
		error(400, 'Invalid JSON');
	}

	if (body.time && !/^\d{2}:\d{2}$/.test(body.time)) {
		error(400, 'Time must be in HH:MM format');
	}

	if (body.days && (!Array.isArray(body.days) || body.days.some((d) => typeof d !== 'number' || d < 0 || d > 6))) {
		error(400, 'Days must be an array of numbers 0-6');
	}

	const updates: Record<string, unknown> = { updatedAt: new Date() };
	if (body.label !== undefined) updates.label = body.label;
	if (body.time !== undefined) updates.time = body.time;
	if (body.days !== undefined) updates.days = body.days;
	if (body.timezone !== undefined) updates.timezone = body.timezone;
	if (body.enabled !== undefined) updates.enabled = body.enabled;
	if (body.metricId !== undefined) updates.metricId = body.metricId;

	await db
		.update(reminderSchedules)
		.set(updates)
		.where(eq(reminderSchedules.id, params.id));

	return json({ ok: true });
};

// DELETE — remove a reminder
export const DELETE: RequestHandler = async ({ params, platform, locals }) => {
	if (!locals.user) {
		error(401, 'Unauthorized');
	}

	const databaseUrl = platform?.env?.DATABASE_URL || env.DATABASE_URL;
	if (!databaseUrl) {
		error(500, 'Database not configured');
	}

	const db = createDb(databaseUrl);

	// Verify ownership
	const [existing] = await db
		.select()
		.from(reminderSchedules)
		.where(and(eq(reminderSchedules.id, params.id), eq(reminderSchedules.userId, locals.user.id)));

	if (!existing) {
		error(404, 'Reminder not found');
	}

	await db
		.delete(reminderSchedules)
		.where(eq(reminderSchedules.id, params.id));

	return json({ ok: true });
};
