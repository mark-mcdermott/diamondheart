// Product and variant types for the merch store
// Products are defined statically with Printful sync variant IDs

export interface MerchVariant {
	id: string;
	size: string;
	color: string;
	colorHex: string;
	printfulSyncVariantId: string; // Printful's sync variant ID for ordering
	inStock: boolean;
}

export interface MerchProduct {
	id: string;
	slug: string;
	name: string;
	description: string;
	price: number; // in cents
	images: string[];
	category: 'tshirt' | 'hoodie' | 'mug' | 'sticker' | 'other';
	variants: MerchVariant[];
}

// Define your merch products here
// After setting up Printful sync products, add your printfulSyncVariantId values
export const merchProducts: MerchProduct[] = [
	{
		id: 'logo-tee',
		slug: 'logo-tee',
		name: 'Logo T-Shirt',
		description: 'A comfortable t-shirt featuring our logo. Perfect for everyday wear.',
		price: 2500, // $25.00
		images: ['/merch/logo-tee.png'],
		category: 'tshirt',
		variants: [
			// Add your Printful sync variant IDs here
			{ id: 'logo-tee-s-white', size: 'S', color: 'White', colorHex: '#ffffff', printfulSyncVariantId: '', inStock: true },
			{ id: 'logo-tee-m-white', size: 'M', color: 'White', colorHex: '#ffffff', printfulSyncVariantId: '', inStock: true },
			{ id: 'logo-tee-l-white', size: 'L', color: 'White', colorHex: '#ffffff', printfulSyncVariantId: '', inStock: true },
			{ id: 'logo-tee-xl-white', size: 'XL', color: 'White', colorHex: '#ffffff', printfulSyncVariantId: '', inStock: true },
			{ id: 'logo-tee-s-black', size: 'S', color: 'Black', colorHex: '#1a1a1a', printfulSyncVariantId: '', inStock: true },
			{ id: 'logo-tee-m-black', size: 'M', color: 'Black', colorHex: '#1a1a1a', printfulSyncVariantId: '', inStock: true },
			{ id: 'logo-tee-l-black', size: 'L', color: 'Black', colorHex: '#1a1a1a', printfulSyncVariantId: '', inStock: true },
			{ id: 'logo-tee-xl-black', size: 'XL', color: 'Black', colorHex: '#1a1a1a', printfulSyncVariantId: '', inStock: true },
		]
	},
	{
		id: 'logo-hoodie',
		slug: 'logo-hoodie',
		name: 'Logo Hoodie',
		description: 'A cozy hoodie featuring our logo. Perfect for cooler weather.',
		price: 4500, // $45.00
		images: ['/merch/logo-hoodie.png'],
		category: 'hoodie',
		variants: [
			{ id: 'logo-hoodie-s-white', size: 'S', color: 'White', colorHex: '#ffffff', printfulSyncVariantId: '', inStock: true },
			{ id: 'logo-hoodie-m-white', size: 'M', color: 'White', colorHex: '#ffffff', printfulSyncVariantId: '', inStock: true },
			{ id: 'logo-hoodie-l-white', size: 'L', color: 'White', colorHex: '#ffffff', printfulSyncVariantId: '', inStock: true },
			{ id: 'logo-hoodie-xl-white', size: 'XL', color: 'White', colorHex: '#ffffff', printfulSyncVariantId: '', inStock: true },
		]
	}
];

// Helper functions
export function getMerchProduct(slug: string): MerchProduct | undefined {
	return merchProducts.find(p => p.slug === slug);
}

export function getMerchProductById(id: string): MerchProduct | undefined {
	return merchProducts.find(p => p.id === id);
}

export function getMerchProductVariant(productId: string, variantId: string): MerchVariant | undefined {
	const product = merchProducts.find(p => p.id === productId);
	return product?.variants.find(v => v.id === variantId);
}

export function getMerchAvailableSizes(product: MerchProduct): string[] {
	return [...new Set(product.variants.filter(v => v.inStock).map(v => v.size))];
}

export function getMerchAvailableColors(product: MerchProduct): { color: string; hex: string }[] {
	const colors = new Map<string, string>();
	product.variants
		.filter(v => v.inStock)
		.forEach(v => colors.set(v.color, v.colorHex));
	return Array.from(colors.entries()).map(([color, hex]) => ({ color, hex }));
}

export function getMerchVariantByOptions(product: MerchProduct, size: string, color: string): MerchVariant | undefined {
	return product.variants.find(v => v.size === size && v.color === color && v.inStock);
}

export function formatMerchPrice(cents: number): string {
	return `$${(cents / 100).toFixed(2)}`;
}
