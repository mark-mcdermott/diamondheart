"use client";

import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/data/products";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { CartItem, CartItemImage, CartItemDetails, CartItemName, CartItemPrice, CartItemQuantity } from "@/components/ui/cart-item";
import { ShoppingCart, Trash2 } from "lucide-react";

export function CartDrawer() {
  const { items, removeItem, updateQuantity, clear, itemCount, subtotal, isOpen, setIsOpen } = useCart();

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        className="relative"
        onClick={() => setIsOpen(true)}
      >
        <ShoppingCart className="h-4 w-4" />
        {itemCount > 0 && (
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">
            {itemCount}
          </span>
        )}
      </Button>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Cart ({itemCount})</SheetTitle>
          </SheetHeader>

          {items.length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-12">
              <p className="text-muted-foreground">Your cart is empty</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto py-4">
              {items.map((item) => (
                <CartItem key={item.variantId}>
                  <CartItemImage src={item.image} alt={item.name} />
                  <CartItemDetails>
                    <CartItemName>{item.name}</CartItemName>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {item.color} / {item.size}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <CartItemQuantity
                        quantity={item.quantity}
                        onIncrement={() => updateQuantity(item.variantId, item.quantity + 1)}
                        onDecrement={() => updateQuantity(item.variantId, item.quantity - 1)}
                      />
                      <CartItemPrice price={item.price} quantity={item.quantity} />
                    </div>
                  </CartItemDetails>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={() => removeItem(item.variantId)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </CartItem>
              ))}
            </div>
          )}

          {items.length > 0 && (
            <SheetFooter className="flex-col gap-3 border-t pt-4">
              <div className="flex items-center justify-between w-full text-sm">
                <span className="font-medium">Subtotal</span>
                <span className="font-bold">{formatPrice(subtotal)}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Shipping calculated at checkout. Printed and shipped by Printful.
              </p>
              <form action="/api/store/checkout" method="POST">
                <Button type="submit" className="w-full">
                  Checkout
                </Button>
              </form>
              <Button variant="outline" size="sm" onClick={clear}>
                Clear Cart
              </Button>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
