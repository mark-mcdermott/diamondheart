"use client";

import { CartProvider, useCart } from "@/lib/cart";
import { CartDrawer } from "@/components/blocks/cart-drawer";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

function CartDemoInner() {
  const { addItem, itemCount } = useCart();

  function addSampleItem() {
    addItem({
      productId: "zip-hoodie",
      variantId: "demo-" + Date.now(),
      name: "Zip Up Hoodie",
      size: "M",
      color: "Black",
      price: 5500,
      image: "/merch/hoodie-black-front.png",
      printfulSyncVariantId: "demo",
    });
  }

  return (
    <div className="flex items-center gap-4">
      <Button variant="outline" size="sm" onClick={addSampleItem}>
        <Plus className="h-4 w-4 mr-2" />
        Add Sample Item
      </Button>
      <CartDrawer />
      <span className="text-sm text-muted-foreground">
        {itemCount === 0 ? "Add an item, then click the cart icon →" : `${itemCount} item${itemCount !== 1 ? "s" : ""} in cart`}
      </span>
    </div>
  );
}

export function CartDemo() {
  return (
    <CartProvider>
      <CartDemoInner />
    </CartProvider>
  );
}
