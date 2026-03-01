import { json, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { eq } from 'drizzle-orm';
import { createStripe, generateId } from '$lib/server/stripe';
import { createDb, orders } from '$lib/server/db';
import { getMerchProductById, getMerchProductVariant } from '$lib/data/merch';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals, platform, url }) => {
	const stripeSecretKey = platform?.env?.STRIPE_SECRET_KEY || env.STRIPE_SECRET_KEY;
	const databaseUrl = platform?.env?.DATABASE_URL || env.DATABASE_URL;

	if (!stripeSecretKey || !databaseUrl) {
		error(500, 'Stripe not configured');
	}

	const body = await request.json();
	const { productId, variantId, quantity = 1 } = body;

	if (!productId || !variantId) {
		error(400, 'Product and variant are required');
	}

	// Validate product and variant
	const product = getMerchProductById(productId);
	if (!product) {
		error(404, 'Product not found');
	}

	const variant = getMerchProductVariant(productId, variantId);
	if (!variant || !variant.inStock) {
		error(400, 'Variant not available');
	}

	const stripe = createStripe(stripeSecretKey);
	const db = createDb(databaseUrl);

	// Create order in database
	const orderId = generateId();
	const subtotal = product.price * quantity;
	const shipping = 0; // Will be calculated by Stripe shipping options
	const total = subtotal + shipping;

	const orderItems = [
		{
			productId: product.id,
			variantId: variant.id,
			printfulSyncVariantId: variant.printfulSyncVariantId,
			name: product.name,
			size: variant.size,
			color: variant.color,
			quantity,
			price: product.price
		}
	];

	await db.insert(orders).values({
		id: orderId,
		email: locals.user?.email || '',
		userId: locals.user?.id || null,
		status: 'pending',
		items: orderItems,
		subtotal,
		shipping,
		total
	});

	// Create Stripe checkout session with shipping address collection
	const session = await stripe.checkout.sessions.create({
		payment_method_types: ['card'],
		line_items: [
			{
				price_data: {
					currency: 'usd',
					product_data: {
						name: `${product.name} - ${variant.color} / ${variant.size}`,
						description: product.description,
						...(product.images[0]?.startsWith('http') ? { images: [product.images[0]] } : {})
					},
					unit_amount: product.price
				},
				quantity
			}
		],
		mode: 'payment',
		shipping_address_collection: {
			allowed_countries: ['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'ES', 'IT', 'NL', 'BE', 'AT', 'CH', 'SE', 'NO', 'DK', 'FI', 'IE', 'PT', 'PL', 'CZ']
		},
		shipping_options: [
			{
				shipping_rate_data: {
					type: 'fixed_amount',
					fixed_amount: { amount: 500, currency: 'usd' },
					display_name: 'Standard Shipping',
					delivery_estimate: {
						minimum: { unit: 'business_day', value: 5 },
						maximum: { unit: 'business_day', value: 10 }
					}
				}
			},
			{
				shipping_rate_data: {
					type: 'fixed_amount',
					fixed_amount: { amount: 1500, currency: 'usd' },
					display_name: 'Express Shipping',
					delivery_estimate: {
						minimum: { unit: 'business_day', value: 2 },
						maximum: { unit: 'business_day', value: 5 }
					}
				}
			}
		],
		success_url: `${url.origin}/merch/order-confirmation?session_id={CHECKOUT_SESSION_ID}`,
		cancel_url: `${url.origin}/merch/${product.slug}?cancelled=true`,
		metadata: {
			orderId,
			type: 'merch_order'
		},
		customer_email: locals.user?.email || undefined
	});

	// Update order with Stripe session ID
	await db
		.update(orders)
		.set({ stripeSessionId: session.id })
		.where(eq(orders.id, orderId));

	return json({ url: session.url });
};
