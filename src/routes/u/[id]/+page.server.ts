import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { createDb, users } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, platform }) => {
	if (!platform?.env?.DATABASE_URL) {
		error(500, 'Database not configured');
	}

	const db = createDb(platform.env.DATABASE_URL);

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
