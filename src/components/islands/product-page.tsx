import { CartProvider } from "@/lib/cart";
import { CartDrawer } from "@/components/blocks/cart-drawer";
import { ProductDetailClient } from "@/components/merch/product-detail";
import type { Product } from "@/lib/data/products";

/** A product page is one island so the cart context reaches both the detail and the drawer. */
export function ProductPage({ product }: { product: Product }) {
  return (
    <CartProvider>
      <ProductDetailClient product={product} />
      <CartDrawer />
    </CartProvider>
  );
}
