export interface ProductVariant {
	id: string;
	size: string;
	color: string;
	colorHex: string;
	printfulSyncVariantId: string;
	inStock: boolean;
}

export interface Product {
	id: string;
	slug: string;
	name: string;
	description: string;
	price: number; // in cents
	images: { [color: string]: { front: string; back: string } };
	category: 'tshirt' | 'hoodie' | 'mug' | 'sticker';
	variants: ProductVariant[];
}

export const products: Product[] = [
	{
		id: 'logo-tee',
		slug: 'logo-tee',
		name: 'Logo T-Shirt',
		description: 'A comfortable t-shirt featuring the Diamondheart logo. Perfect for everyday wear.',
		price: 2500,
		images: {
			'White': { front: '/merch/logo-tee.png', back: '/merch/logo-tee.png' },
			'Black': { front: '/merch/logo-tee.png', back: '/merch/logo-tee.png' },
		},
		category: 'tshirt',
		variants: [
			{ id: 'logo-tee-s-white', size: 'S', color: 'White', colorHex: '#ffffff', printfulSyncVariantId: '', inStock: true },
			{ id: 'logo-tee-m-white', size: 'M', color: 'White', colorHex: '#ffffff', printfulSyncVariantId: '', inStock: true },
			{ id: 'logo-tee-l-white', size: 'L', color: 'White', colorHex: '#ffffff', printfulSyncVariantId: '', inStock: true },
			{ id: 'logo-tee-xl-white', size: 'XL', color: 'White', colorHex: '#ffffff', printfulSyncVariantId: '', inStock: true },
			{ id: 'logo-tee-s-black', size: 'S', color: 'Black', colorHex: '#1a1a1a', printfulSyncVariantId: '', inStock: true },
			{ id: 'logo-tee-m-black', size: 'M', color: 'Black', colorHex: '#1a1a1a', printfulSyncVariantId: '', inStock: true },
			{ id: 'logo-tee-l-black', size: 'L', color: 'Black', colorHex: '#1a1a1a', printfulSyncVariantId: '', inStock: true },
			{ id: 'logo-tee-xl-black', size: 'XL', color: 'Black', colorHex: '#1a1a1a', printfulSyncVariantId: '', inStock: true },
		],
	},
	{
		id: 'logo-hoodie',
		slug: 'logo-hoodie',
		name: 'Logo Hoodie',
		description: 'A cozy hoodie featuring the Diamondheart logo. Perfect for cooler weather.',
		price: 4500,
		images: {
			'White': { front: '/merch/logo-hoodie.png', back: '/merch/logo-hoodie.png' },
		},
		category: 'hoodie',
		variants: [
			{ id: 'logo-hoodie-s-white', size: 'S', color: 'White', colorHex: '#ffffff', printfulSyncVariantId: '', inStock: true },
			{ id: 'logo-hoodie-m-white', size: 'M', color: 'White', colorHex: '#ffffff', printfulSyncVariantId: '', inStock: true },
			{ id: 'logo-hoodie-l-white', size: 'L', color: 'White', colorHex: '#ffffff', printfulSyncVariantId: '', inStock: true },
			{ id: 'logo-hoodie-xl-white', size: 'XL', color: 'White', colorHex: '#ffffff', printfulSyncVariantId: '', inStock: true },
		],
	},
];

export function getProduct(slug: string): Product | undefined {
	return products.find((p) => p.slug === slug);
}

export function getProductById(id: string): Product | undefined {
	return products.find((p) => p.id === id);
}

export function getProductVariant(productId: string, variantId: string): ProductVariant | undefined {
	const product = products.find((p) => p.id === productId);
	return product?.variants.find((v) => v.id === variantId);
}

export function getAvailableSizes(product: Product): string[] {
	return [...new Set(product.variants.filter((v) => v.inStock).map((v) => v.size))];
}

export function getAvailableColors(product: Product): { color: string; hex: string }[] {
	const colors = new Map<string, string>();
	product.variants.filter((v) => v.inStock).forEach((v) => colors.set(v.color, v.colorHex));
	return Array.from(colors.entries()).map(([color, hex]) => ({ color, hex }));
}

export function getVariantByOptions(product: Product, size: string, color: string): ProductVariant | undefined {
	return product.variants.find((v) => v.size === size && v.color === color && v.inStock);
}

export function formatPrice(cents: number): string {
	return `$${(cents / 100).toFixed(2)}`;
}

export function getProductImage(product: Product, color: string, side: 'front' | 'back' = 'front'): string {
	const colorImages = product.images[color];
	if (colorImages) return colorImages[side];
	const firstColor = Object.keys(product.images)[0];
	if (firstColor) return product.images[firstColor][side];
	return '/placeholder.png';
}
