import { createLucia } from '$lib/server/auth';
import { createDb } from '$lib/server/db';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const databaseUrl = event.platform?.env?.DATABASE_URL;

	if (!databaseUrl) {
		event.locals.user = null;
		event.locals.session = null;
		return resolve(event);
	}

	const db = createDb(databaseUrl);
	const lucia = createLucia(db);

	const sessionId = event.cookies.get(lucia.sessionCookieName);

	if (!sessionId) {
		event.locals.user = null;
		event.locals.session = null;
		return resolve(event);
	}

	const { session, user } = await lucia.validateSession(sessionId);

	if (session?.fresh) {
		const sessionCookie = lucia.createSessionCookie(session.id);
		event.cookies.set(sessionCookie.name, sessionCookie.value, {
			path: '/',
			...sessionCookie.attributes
		});
	}

	if (!session) {
		const sessionCookie = lucia.createBlankSessionCookie();
		event.cookies.set(sessionCookie.name, sessionCookie.value, {
			path: '/',
			...sessionCookie.attributes
		});
	}

	event.locals.user = user;
	event.locals.session = session;
	return resolve(event);
};
