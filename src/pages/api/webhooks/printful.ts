import type { APIRoute } from "astro";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { eq } from "drizzle-orm";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const payload = await request.json();
  const eventType = payload.type;
  const orderData = payload.data?.order;

  if (!orderData?.external_id) return Response.json({ received: true });

  const orderId = orderData.external_id;

  switch (eventType) {
    case "package_shipped": {
      const shipment = payload.data?.shipment;
      await db.update(orders).set({
        status: "shipped",
        trackingNumber: shipment?.tracking_number || null,
        trackingUrl: shipment?.tracking_url || null,
        updatedAt: new Date(),
      }).where(eq(orders.id, orderId));
      break;
    }

    case "order_updated": {
      const statusMap: Record<string, string> = {
        draft: "processing", pending: "processing", failed: "printful_failed",
        canceled: "canceled", inprocess: "processing", onhold: "on_hold",
        partial: "partially_shipped", fulfilled: "delivered",
      };
      const newStatus = statusMap[orderData.status] || orderData.status;
      await db.update(orders).set({ status: newStatus, updatedAt: new Date() }).where(eq(orders.id, orderId));
      break;
    }

    case "order_failed": {
      await db.update(orders).set({ status: "printful_failed", updatedAt: new Date() }).where(eq(orders.id, orderId));
      break;
    }
  }

  return Response.json({ received: true });
};
