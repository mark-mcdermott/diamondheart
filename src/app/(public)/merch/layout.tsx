import { CartProvider } from "@/lib/cart";

export default function MerchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CartProvider>{children}</CartProvider>;
}
