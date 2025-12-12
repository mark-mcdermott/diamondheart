import { createDb, users } from '$lib/server/db';
import { asc } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ platform }) => {
	const databaseUrl = platform?.env?.DATABASE_URL;

	if (!databaseUrl) {
		return { users: [] };
	}

	const db = createDb(databaseUrl);

	const allUsers = await db
		.select({
			id: users.id,
			name: users.name,
			email: users.email,
			createdAt: users.createdAt
		})
		.from(users)
		.orderBy(asc(users.name));

	return { users: allUsers };
};
