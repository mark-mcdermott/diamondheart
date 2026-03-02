import { error, json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { eq } from 'drizzle-orm';
import { createStripe } from '$lib/server/stripe';
import { createDb, orders } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, platform }) => {
	const stripeSecretKey = platform?.env?.STRIPE_SECRET_KEY || env.STRIPE_SECRET_KEY;
	const webhookSecret = platform?.env?.STRIPE_WEBHOOK_SECRET || env.STRIPE_WEBHOOK_SECRET;
	const databaseUrl = platform?.env?.DATABASE_URL || env.DATABASE_URL;

	if (!stripeSecretKey || !webhookSecret || !databaseUrl) {
		error(500, 'Stripe webhook not configured');
	}

	const stripe = createStripe(stripeSecretKey);
	const body = await request.text();
	const signature = request.headers.get('stripe-signature');

	if (!signature) {
		error(400, 'Missing stripe-signature header');
	}

	let event;
	try {
		event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
	} catch (err) {
		console.error('Webhook signature verification failed:', err);
		error(400, 'Invalid signature');
	}

	const db = createDb(databaseUrl);

	switch (event.type) {
		case 'checkout.session.completed': {
			const session = event.data.object;
			const orderId = session.metadata?.orderId;

			if (!orderId) break;

			const shippingAddress = session.shipping_details?.address
				? {
						name: session.shipping_details.name,
						line1: session.shipping_details.address.line1,
						line2: session.shipping_details.address.line2,
						city: session.shipping_details.address.city,
						state: session.shipping_details.address.state,
						postal_code: session.shipping_details.address.postal_code,
						country: session.shipping_details.address.country
					}
				: null;

			await db
				.update(orders)
				.set({
					status: 'paid',
					stripePaymentIntentId: session.payment_intent as string,
					shippingAddress,
					shipping: session.shipping_cost?.amount_total ?? 0,
					total: session.amount_total ?? 0,
					updatedAt: new Date()
				})
				.where(eq(orders.id, orderId));

			// TODO: Trigger Printful order creation here when Printful sync variant IDs are configured
			// const order = await db.select().from(orders).where(eq(orders.id, orderId)).then(r => r[0]);
			// if (order) await createPrintfulOrder(order);

			break;
		}

		case 'payment_intent.payment_failed': {
			const paymentIntent = event.data.object;
			// Find order by payment intent and mark as failed
			const matchingOrders = await db
				.select()
				.from(orders)
				.where(eq(orders.stripePaymentIntentId, paymentIntent.id));

			if (matchingOrders.length > 0) {
				await db
					.update(orders)
					.set({ status: 'payment_failed', updatedAt: new Date() })
					.where(eq(orders.id, matchingOrders[0].id));
			}
			break;
		}
	}

	return json({ received: true });
};
