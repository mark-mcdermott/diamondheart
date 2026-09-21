import type { APIRoute } from "astro";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { PrintfulClient } from "@/lib/server/printful";
import Stripe from "stripe";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripeKey || !webhookSecret) {
    return Response.json({ error: "Not configured" }, { status: 500 });
  }

  const stripe = new Stripe(stripeKey);
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) return Response.json({ error: "Missing signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.orderId;
      if (!orderId) break;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sd = (session as any).shipping_details as { name?: string; address?: Record<string, string | null> } | undefined;
      const shippingAddress = sd?.address
        ? {
            name: sd.name,
            line1: sd.address.line1,
            line2: sd.address.line2,
            city: sd.address.city,
            state: sd.address.state,
            postal_code: sd.address.postal_code,
            country: sd.address.country,
          }
        : null;

      await db.update(orders).set({
        status: "paid",
        stripePaymentIntentId: session.payment_intent as string,
        shippingAddress,
        shipping: session.shipping_cost?.amount_total ?? 0,
        total: session.amount_total ?? 0,
        updatedAt: new Date(),
      }).where(eq(orders.id, orderId));

      // Printful order creation
      const printfulApiKey = process.env.PRINTFUL_API_KEY;
      if (printfulApiKey) {
        try {
          const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
          if (order) {
            const items = (order.items as Array<{ printfulSyncVariantId?: string; quantity: number }>)
              .filter((item) => item.printfulSyncVariantId)
              .map((item) => ({ sync_variant_id: item.printfulSyncVariantId!, quantity: item.quantity }));

            if (items.length > 0 && shippingAddress) {
              const printful = new PrintfulClient(printfulApiKey);
              const pfOrder = await printful.createOrder(
                orderId,
                {
                  name: shippingAddress.name || "",
                  address1: shippingAddress.line1 || "",
                  address2: shippingAddress.line2 || undefined,
                  city: shippingAddress.city || "",
                  state_code: shippingAddress.state || undefined,
                  country_code: shippingAddress.country || "US",
                  zip: shippingAddress.postal_code || "",
                  email: order.email,
                },
                items,
                { subtotal: order.subtotal, shipping: order.shipping, total: order.total }
              );
              await printful.confirmOrder(pfOrder.id);
              await db.update(orders).set({ printfulOrderId: String(pfOrder.id), status: "processing", updatedAt: new Date() }).where(eq(orders.id, orderId));
            }
          }
        } catch (err) {
          console.error("Printful order creation failed:", err);
        }
      }
      break;
    }

    case "payment_intent.payment_failed": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const matchingOrders = await db.select().from(orders).where(eq(orders.stripePaymentIntentId, paymentIntent.id));
      if (matchingOrders.length > 0) {
        await db.update(orders).set({ status: "payment_failed", updatedAt: new Date() }).where(eq(orders.id, matchingOrders[0].id));
      }
      break;
    }
  }

  return Response.json({ received: true });
};
