import { fail, redirect } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { eq } from 'drizzle-orm';
import { createDb, users } from '$lib/server/db';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		redirect(302, '/login');
	}

	return {
		user: {
			id: locals.user.id,
			email: locals.user.email,
			name: locals.user.name,
			avatarUrl: locals.user.avatarUrl
		}
	};
};

export const actions: Actions = {
	default: async ({ request, locals, platform }) => {
		if (!locals.user) {
			return fail(401, { error: 'Not authenticated' });
		}

		const databaseUrl = platform?.env?.DATABASE_URL || env.DATABASE_URL;
		if (!databaseUrl) {
			return fail(500, { error: 'Database not configured' });
		}

		const db = createDb(databaseUrl);

		const formData = await request.formData();
		const name = formData.get('name') as string;
		const email = formData.get('email') as string;
		const avatarUpload = formData.get('avatarUpload') as string;

		if (!email || !email.includes('@')) {
			return fail(400, { error: 'Valid email is required' });
		}

		// Handle avatar upload
		let avatarUrl: string | null | undefined = undefined;
		if (avatarUpload && avatarUpload.startsWith('data:image/')) {
			const matches = avatarUpload.match(/^data:image\/(\w+);base64,(.+)$/);
			if (matches) {
				const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
				const base64Data = matches[2];
				const binaryData = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
				const filename = `${crypto.randomUUID()}.${ext}`;

				if (!dev && platform?.env?.R2_AVATARS) {
					try {
						await platform.env.R2_AVATARS.put(filename, binaryData, {
							httpMetadata: {
								contentType: `image/${matches[1]}`
							}
						});
						const publicUrl = platform.env.R2_PUBLIC_URL || env.R2_PUBLIC_URL;
						avatarUrl = `${publicUrl}/${filename}`;
					} catch (e) {
						console.error('R2 upload failed:', e);
						avatarUrl = avatarUpload;
					}
				} else {
					// Fallback to base64 (local dev or R2 not available)
					avatarUrl = avatarUpload;
				}
			}
		}

		try {
			const updateData: Record<string, unknown> = {
				name: name?.trim() || null,
				email: email.toLowerCase().trim(),
				updatedAt: new Date()
			};
			if (avatarUrl !== undefined) {
				updateData.avatarUrl = avatarUrl;
			}

			await db
				.update(users)
				.set(updateData)
				.where(eq(users.id, locals.user.id));

			return { success: true };
		} catch (e) {
			if ((e as { code?: string }).code === '23505') {
				return fail(400, { error: 'Email already in use' });
			}
			return fail(500, { error: 'Failed to update profile' });
		}
	}
};
