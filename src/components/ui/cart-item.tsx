import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Minus, Plus } from "lucide-react";

export function CartItem({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("flex gap-4 py-4 border-b border-border last:border-0", className)}>
      {children}
    </div>
  );
}

export function CartItemImage({ src, alt = "" }: { src?: string; alt?: string }) {
  return (
    <div className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
      {src ? (
        <img src={src} alt={alt} width={80} height={80} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
      )}
    </div>
  );
}

export function CartItemDetails({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("flex-1 min-w-0", className)}>{children}</div>;
}

export function CartItemName({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h4 className={cn("font-medium text-foreground truncate", className)}>{children}</h4>;
}

export function CartItemPrice({
  price,
  quantity = 1,
  currency = "$",
}: {
  price: number;
  quantity?: number;
  currency?: string;
}) {
  return (
    <span className="font-semibold text-foreground">
      {currency}{((price * quantity) / 100).toFixed(2)}
    </span>
  );
}

export function CartItemQuantity({
  quantity,
  onIncrement,
  onDecrement,
  min = 1,
  max = 99,
}: {
  quantity: number;
  onIncrement?: () => void;
  onDecrement?: () => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        className="h-7 w-7"
        onClick={onDecrement}
        disabled={quantity <= min}
      >
        <Minus className="h-3 w-3" />
      </Button>
      <span className="text-sm font-medium w-6 text-center">{quantity}</span>
      <Button
        variant="outline"
        size="icon"
        className="h-7 w-7"
        onClick={onIncrement}
        disabled={quantity >= max}
      >
        <Plus className="h-3 w-3" />
      </Button>
    </div>
  );
}
