import { fail } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { createDb, contactSubmissions } from '$lib/server/db';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request, platform }) => {
		const databaseUrl = platform?.env?.DATABASE_URL || env.DATABASE_URL;
		if (!databaseUrl) {
			return fail(500, { error: 'Database not configured' });
		}

		const formData = await request.formData();
		const name = (formData.get('name') as string)?.trim();
		const email = (formData.get('email') as string)?.trim();
		const message = (formData.get('message') as string)?.trim();

		if (!name) return fail(400, { error: 'Name is required', name, email, message });
		if (!email || !email.includes('@')) return fail(400, { error: 'Valid email is required', name, email, message });
		if (!message) return fail(400, { error: 'Message is required', name, email, message });

		const db = createDb(databaseUrl);

		await db.insert(contactSubmissions).values({
			id: crypto.randomUUID(),
			name,
			email,
			message
		});

		return { success: true };
	}
};
