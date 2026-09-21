import { useState } from "react";
import { Link } from "@/app/link";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import {
  type Product,
  getAvailableSizes,
  getAvailableColors,
  getVariantByOptions,
  getProductImage,
  formatPrice,
} from "@/lib/data/products";
import { ArrowLeft, ShoppingBag } from "lucide-react";

interface ProductDetailClientProps {
  product: Product;
}

export function ProductDetailClient({ product }: ProductDetailClientProps) {
  const { addItem } = useCart();
  const colors = getAvailableColors(product);
  const sizes = getAvailableSizes(product);

  const [selectedColor, setSelectedColor] = useState(colors[0]?.color || "");
  const [selectedSize, setSelectedSize] = useState(sizes[0] || "");

  const variant = getVariantByOptions(product, selectedSize, selectedColor);
  const image = getProductImage(product, selectedColor);

  function handleAddToCart() {
    if (!variant) return;
    addItem({
      productId: product.id,
      variantId: variant.id,
      name: product.name,
      size: variant.size,
      color: variant.color,
      price: product.price,
      image,
      printfulSyncVariantId: variant.printfulSyncVariantId,
    });
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <Button variant="outline" size="sm" asChild className="mb-8">
        <Link href="/merch">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Merch
        </Link>
      </Button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Image */}
        <div className="aspect-square bg-muted rounded-xl flex items-center justify-center overflow-hidden">
          {image && image !== "/placeholder.png" ? (
            <img src={image} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <ShoppingBag className="w-16 h-16 text-muted-foreground" />
          )}
        </div>

        {/* Details */}
        <div>
          <h1>{product.name}</h1>
          <p className="text-2xl font-semibold mt-2">{formatPrice(product.price)}</p>
          <p className="text-muted-foreground mt-4">{product.description}</p>

          {/* Color Selection */}
          {colors.length > 1 && (
            <div className="mt-6">
              <p className="text-sm font-medium mb-2">Color</p>
              <div className="flex gap-2">
                {colors.map((c) => (
                  <button
                    key={c.color}
                    onClick={() => setSelectedColor(c.color)}
                    className={`w-10 h-10 rounded-full border-2 transition-colors ${
                      selectedColor === c.color ? "border-foreground" : "border-border"
                    }`}
                    style={{ backgroundColor: c.hex }}
                    title={c.color}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Size Selection */}
          <div className="mt-6">
            <p className="text-sm font-medium mb-2">Size</p>
            <div className="flex gap-2">
              {sizes.map((size) => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    selectedSize === size
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-foreground border-border hover:border-foreground/50"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Add to Cart */}
          <Button
            className="w-full mt-8"
            size="lg"
            onClick={handleAddToCart}
            disabled={!variant}
          >
            <ShoppingBag className="w-4 h-4 mr-2" />
            Add to Cart
          </Button>
        </div>
      </div>
    </div>
  );
}
