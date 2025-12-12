import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { createLucia } from '$lib/server/auth';
import { createDb, users } from '$lib/server/db';
import { verifyPassword } from '$lib/server/password';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user && locals.session) {
		redirect(302, '/');
	}
	return {};
};

export const actions: Actions = {
	default: async ({ request, cookies, platform }) => {
		const formData = await request.formData();
		const email = formData.get('email');
		const password = formData.get('password');

		// Validate inputs
		if (typeof email !== 'string' || !email.includes('@')) {
			return fail(400, { error: 'Invalid email address' });
		}

		if (typeof password !== 'string' || password.length < 1) {
			return fail(400, { error: 'Password is required' });
		}

		const databaseUrl = platform?.env?.DATABASE_URL;
		if (!databaseUrl) {
			return fail(500, { error: 'Database not configured' });
		}

		const db = createDb(databaseUrl);
		const lucia = createLucia(db);

		// Find user
		const [existingUser] = await db
			.select()
			.from(users)
			.where(eq(users.email, email.toLowerCase()))
			.limit(1);

		if (!existingUser) {
			return fail(400, { error: 'Invalid email or password' });
		}

		// Verify password
		const validPassword = await verifyPassword(existingUser.passwordHash, password);

		if (!validPassword) {
			return fail(400, { error: 'Invalid email or password' });
		}

		// Create session
		const session = await lucia.createSession(existingUser.id, {});
		const sessionCookie = lucia.createSessionCookie(session.id);

		cookies.set(sessionCookie.name, sessionCookie.value, {
			path: '/',
			...sessionCookie.attributes
		});

		redirect(302, '/');
	}
};
