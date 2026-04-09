import { notFound } from "next/navigation";
import { getProduct } from "@/lib/data/products";
import { ProductDetailClient } from "./product-detail-client";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = getProduct(slug);

  if (!product) notFound();

  return <ProductDetailClient product={product} />;
}
