import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { eq } from 'drizzle-orm';
import { createDb, users } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, platform }) => {
	const databaseUrl = platform?.env?.DATABASE_URL || env.DATABASE_URL;
	if (!databaseUrl) {
		error(500, 'Database not configured');
	}

	const db = createDb(databaseUrl);

	const [profileUser] = await db
		.select({
			id: users.id,
			email: users.email,
			name: users.name,
			createdAt: users.createdAt
		})
		.from(users)
		.where(eq(users.id, params.id))
		.limit(1);

	if (!profileUser) {
		error(404, 'User not found');
	}

	return { profileUser };
};
