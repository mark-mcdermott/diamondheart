import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { eq } from 'drizzle-orm';
import { createDb, orders } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, platform }) => {
	const databaseUrl = platform?.env?.DATABASE_URL || env.DATABASE_URL;
	if (!databaseUrl) {
		return json({ error: 'Database not configured' }, { status: 500 });
	}

	const payload = await request.json();
	const eventType = payload.type;
	const orderData = payload.data?.order;

	if (!orderData?.external_id) {
		return json({ received: true });
	}

	const db = createDb(databaseUrl);
	const orderId = orderData.external_id;

	switch (eventType) {
		case 'package_shipped': {
			const shipment = payload.data?.shipment;
			await db
				.update(orders)
				.set({
					status: 'shipped',
					trackingNumber: shipment?.tracking_number || null,
					trackingUrl: shipment?.tracking_url || null,
					updatedAt: new Date()
				})
				.where(eq(orders.id, orderId));
			break;
		}

		case 'order_updated': {
			const statusMap: Record<string, string> = {
				draft: 'processing',
				pending: 'processing',
				failed: 'printful_failed',
				canceled: 'canceled',
				inprocess: 'processing',
				onhold: 'on_hold',
				partial: 'partially_shipped',
				fulfilled: 'delivered'
			};
			const newStatus = statusMap[orderData.status] || orderData.status;
			await db
				.update(orders)
				.set({ status: newStatus, updatedAt: new Date() })
				.where(eq(orders.id, orderId));
			break;
		}

		case 'order_failed': {
			await db
				.update(orders)
				.set({ status: 'printful_failed', updatedAt: new Date() })
				.where(eq(orders.id, orderId));
			break;
		}
	}

	return json({ received: true });
};
