import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { generateId } from 'lucia';
import { createLucia } from '$lib/server/auth';
import { createDb, users } from '$lib/server/db';
import { hashPassword } from '$lib/server/password';
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
		const name = formData.get('name');

		// Validate inputs
		if (typeof email !== 'string' || !email.includes('@')) {
			return fail(400, { error: 'Invalid email address' });
		}

		if (typeof password !== 'string' || password.length < 8) {
			return fail(400, { error: 'Password must be at least 8 characters' });
		}

		const databaseUrl = platform?.env?.DATABASE_URL;
		if (!databaseUrl) {
			return fail(500, { error: 'Database not configured' });
		}

		const db = createDb(databaseUrl);
		const lucia = createLucia(db);

		// Check if user already exists
		const [existingUser] = await db
			.select()
			.from(users)
			.where(eq(users.email, email.toLowerCase()))
			.limit(1);

		if (existingUser) {
			return fail(400, { error: 'Email already registered' });
		}

		// Create user
		const userId = generateId(15);
		const passwordHash = await hashPassword(password);

		await db.insert(users).values({
			id: userId,
			email: email.toLowerCase(),
			passwordHash,
			name: typeof name === 'string' && name.length > 0 ? name : null
		});

		// Create session
		const session = await lucia.createSession(userId, {});
		const sessionCookie = lucia.createSessionCookie(session.id);

		cookies.set(sessionCookie.name, sessionCookie.value, {
			path: '/',
			...sessionCookie.attributes
		});

		redirect(302, '/');
	}
};
