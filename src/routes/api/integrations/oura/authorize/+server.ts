import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ platform, locals, url }) => {
	if (!locals.user) {
		redirect(302, '/login');
	}

	const clientId = platform?.env?.OURA_CLIENT_ID || env.OURA_CLIENT_ID;
	if (!clientId) {
		return new Response(JSON.stringify({ error: 'Oura integration not configured' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const redirectUri = `${url.origin}/api/integrations/oura/callback`;
	const scopes = 'daily heartrate workout session spo2 stress';

	const ouraUrl = new URL('https://cloud.ouraring.com/oauth/authorize');
	ouraUrl.searchParams.set('client_id', clientId);
	ouraUrl.searchParams.set('redirect_uri', redirectUri);
	ouraUrl.searchParams.set('response_type', 'code');
	ouraUrl.searchParams.set('scope', scopes);
	ouraUrl.searchParams.set('state', locals.user.id);

	redirect(302, ouraUrl.toString());
};
