import { redirect, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { createDb, integrationConnections } from '$lib/server/db';
import { eq, and } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, platform, locals }) => {
	if (!locals.user) {
		redirect(302, '/login');
	}

	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');

	if (!code || state !== locals.user.id) {
		error(400, 'Invalid OAuth callback');
	}

	const clientId = platform?.env?.OURA_CLIENT_ID || env.OURA_CLIENT_ID;
	const clientSecret = platform?.env?.OURA_CLIENT_SECRET || env.OURA_CLIENT_SECRET;
	const databaseUrl = platform?.env?.DATABASE_URL || env.DATABASE_URL;

	if (!clientId || !clientSecret || !databaseUrl) {
		error(500, 'Oura integration not configured');
	}

	const redirectUri = `${url.origin}/api/integrations/oura/callback`;

	// Exchange code for tokens
	const tokenRes = await fetch('https://api.ouraring.com/oauth/token', {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			grant_type: 'authorization_code',
			code,
			redirect_uri: redirectUri,
			client_id: clientId,
			client_secret: clientSecret
		})
	});

	if (!tokenRes.ok) {
		error(502, 'Failed to exchange Oura authorization code');
	}

	const tokens = (await tokenRes.json()) as {
		access_token: string;
		refresh_token: string;
		expires_in: number;
	};

	const db = createDb(databaseUrl);

	// Upsert connection — deactivate any existing, then insert new
	const existing = await db
		.select()
		.from(integrationConnections)
		.where(and(eq(integrationConnections.userId, locals.user.id), eq(integrationConnections.service, 'oura')));

	if (existing.length > 0) {
		await db
			.update(integrationConnections)
			.set({
				accessToken: tokens.access_token,
				refreshToken: tokens.refresh_token,
				tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
				status: 'active',
				lastSyncError: null,
				updatedAt: new Date()
			})
			.where(eq(integrationConnections.id, existing[0].id));
	} else {
		await db.insert(integrationConnections).values({
			id: crypto.randomUUID(),
			userId: locals.user.id,
			service: 'oura',
			accessToken: tokens.access_token,
			refreshToken: tokens.refresh_token,
			tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
			scopes: 'daily heartrate workout session spo2 stress',
			status: 'active'
		});
	}

	redirect(302, '/account/integrations');
};
