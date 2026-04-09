import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

export default function OrderConfirmationPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-green-50 dark:bg-green-950 flex items-center justify-center mx-auto mb-6">
        <Check className="w-8 h-8 text-green-500" />
      </div>
      <h1>Order Confirmed</h1>
      <p className="text-muted-foreground mt-4 mb-8">
        Thanks for your purchase! You&apos;ll receive a confirmation email shortly.
        Your order will be printed and shipped by our fulfillment partner.
      </p>
      <div className="flex gap-3 justify-center">
        <Button asChild>
          <Link href="/merch">Continue Shopping</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/dashboard">Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
