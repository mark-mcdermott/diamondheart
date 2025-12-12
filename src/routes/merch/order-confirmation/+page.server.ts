import { error, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { createStripe } from '$lib/server/stripe';
import { createDb, orders } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, platform }) => {
	const sessionId = url.searchParams.get('session_id');

	if (!sessionId) {
		redirect(302, '/merch');
	}

	const stripeSecretKey = platform?.env?.STRIPE_SECRET_KEY;
	const databaseUrl = platform?.env?.DATABASE_URL;

	if (!stripeSecretKey || !databaseUrl) {
		error(500, 'Configuration error');
	}

	const stripe = createStripe(stripeSecretKey);
	const db = createDb(databaseUrl);

	try {
		const session = await stripe.checkout.sessions.retrieve(sessionId, {
			expand: ['line_items']
		});

		if (session.payment_status !== 'paid') {
			redirect(302, '/merch?error=payment_incomplete');
		}

		const orderId = session.metadata?.orderId;
		let order = null;

		if (orderId) {
			const [dbOrder] = await db
				.select()
				.from(orders)
				.where(eq(orders.id, orderId))
				.limit(1);
			order = dbOrder;
		}

		return {
			orderNumber: orderId || session.id.slice(-8).toUpperCase(),
			email: session.customer_details?.email || session.customer_email || '',
			total: session.amount_total ? session.amount_total / 100 : 0,
			shippingAddress: session.shipping_details?.address
				? {
						name: session.shipping_details.name,
						line1: session.shipping_details.address.line1,
						line2: session.shipping_details.address.line2,
						city: session.shipping_details.address.city,
						state: session.shipping_details.address.state,
						postalCode: session.shipping_details.address.postal_code,
						country: session.shipping_details.address.country
					}
				: null,
			items: order?.items || []
		};
	} catch (err) {
		console.error('Error retrieving order:', err);
		redirect(302, '/merch?error=order_not_found');
	}
};
