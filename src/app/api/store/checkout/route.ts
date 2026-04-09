import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { users, orders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getProductById, getProductVariant } from "@/lib/data/products";
import Stripe from "stripe";

export async function POST(request: Request) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });

  const body = await request.json();
  const { productId, variantId, quantity = 1 } = body;

  if (!productId || !variantId) {
    return NextResponse.json({ error: "Product and variant are required" }, { status: 400 });
  }

  const product = getProductById(productId);
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  const variant = getProductVariant(productId, variantId);
  if (!variant || !variant.inStock) {
    return NextResponse.json({ error: "Variant not available" }, { status: 400 });
  }

  // Get user email if logged in
  let email: string | undefined;
  const session = await getCurrentUser();
  if (session) {
    const [user] = await db.select({ email: users.email }).from(users).where(eq(users.id, session.userId)).limit(1);
    email = user?.email;
  }

  const stripe = new Stripe(stripeKey);
  const orderId = crypto.randomUUID();
  const subtotal = product.price * quantity;

  const orderItems = [{
    productId: product.id,
    variantId: variant.id,
    printfulSyncVariantId: variant.printfulSyncVariantId,
    name: product.name,
    size: variant.size,
    color: variant.color,
    quantity,
    price: product.price,
  }];

  await db.insert(orders).values({
    id: orderId,
    email: email || "",
    userId: session?.userId || null,
    status: "pending",
    items: orderItems,
    subtotal,
    shipping: 0,
    total: subtotal,
  });

  const { origin } = new URL(request.url);

  const checkoutSession = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [{
      price_data: {
        currency: "usd",
        product_data: {
          name: `${product.name} - ${variant.color} / ${variant.size}`,
          description: product.description,
        },
        unit_amount: product.price,
      },
      quantity,
    }],
    mode: "payment",
    shipping_address_collection: {
      allowed_countries: ["US", "CA", "GB", "AU", "DE", "FR", "ES", "IT", "NL", "BE", "AT", "CH", "SE", "NO", "DK", "FI", "IE", "PT", "PL", "CZ"],
    },
    shipping_options: [
      {
        shipping_rate_data: {
          type: "fixed_amount",
          fixed_amount: { amount: 500, currency: "usd" },
          display_name: "Standard Shipping",
          delivery_estimate: { minimum: { unit: "business_day", value: 5 }, maximum: { unit: "business_day", value: 10 } },
        },
      },
      {
        shipping_rate_data: {
          type: "fixed_amount",
          fixed_amount: { amount: 1500, currency: "usd" },
          display_name: "Express Shipping",
          delivery_estimate: { minimum: { unit: "business_day", value: 2 }, maximum: { unit: "business_day", value: 5 } },
        },
      },
    ],
    success_url: `${origin}/merch/order-confirmation?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/merch/${product.slug}?cancelled=true`,
    metadata: { orderId, type: "merch_order" },
    customer_email: email,
  });

  await db.update(orders).set({ stripeSessionId: checkoutSession.id }).where(eq(orders.id, orderId));

  return NextResponse.json({ url: checkoutSession.url });
}
