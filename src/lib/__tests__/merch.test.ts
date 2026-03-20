import { describe, it, expect } from 'vitest';
import {
	getMerchProduct,
	getMerchProductById,
	getMerchProductVariant,
	getMerchAvailableSizes,
	getMerchAvailableColors,
	getMerchVariantByOptions,
	formatMerchPrice,
	merchProducts
} from '$lib/data/merch';

describe('merch helpers', () => {
	describe('getMerchProduct', () => {
		it('finds product by slug', () => {
			const product = getMerchProduct('logo-tee');
			expect(product).toBeDefined();
			expect(product!.name).toBe('Logo T-Shirt');
		});

		it('returns undefined for unknown slug', () => {
			expect(getMerchProduct('does-not-exist')).toBeUndefined();
		});
	});

	describe('getMerchProductById', () => {
		it('finds product by id', () => {
			const product = getMerchProductById('logo-hoodie');
			expect(product).toBeDefined();
			expect(product!.name).toBe('Logo Hoodie');
		});

		it('returns undefined for unknown id', () => {
			expect(getMerchProductById('nope')).toBeUndefined();
		});
	});

	describe('getMerchProductVariant', () => {
		it('finds variant by product and variant id', () => {
			const variant = getMerchProductVariant('logo-tee', 'logo-tee-m-black');
			expect(variant).toBeDefined();
			expect(variant!.size).toBe('M');
			expect(variant!.color).toBe('Black');
		});

		it('returns undefined for wrong product id', () => {
			expect(getMerchProductVariant('nope', 'logo-tee-m-black')).toBeUndefined();
		});

		it('returns undefined for wrong variant id', () => {
			expect(getMerchProductVariant('logo-tee', 'nope')).toBeUndefined();
		});
	});

	describe('getMerchAvailableSizes', () => {
		it('returns unique in-stock sizes', () => {
			const product = merchProducts[0]; // logo-tee
			const sizes = getMerchAvailableSizes(product);
			expect(sizes).toEqual(['S', 'M', 'L', 'XL']);
		});

		it('excludes out-of-stock sizes', () => {
			const product = {
				...merchProducts[0],
				variants: merchProducts[0].variants.map(v =>
					v.size === 'XL' ? { ...v, inStock: false } : v
				)
			};
			const sizes = getMerchAvailableSizes(product);
			expect(sizes).toEqual(['S', 'M', 'L']);
		});
	});

	describe('getMerchAvailableColors', () => {
		it('returns unique in-stock colors with hex values', () => {
			const product = merchProducts[0]; // logo-tee has white and black
			const colors = getMerchAvailableColors(product);
			expect(colors).toHaveLength(2);
			expect(colors.map(c => c.color)).toContain('White');
			expect(colors.map(c => c.color)).toContain('Black');
		});

		it('returns single color for hoodie', () => {
			const product = merchProducts[1]; // logo-hoodie has only white
			const colors = getMerchAvailableColors(product);
			expect(colors).toHaveLength(1);
			expect(colors[0].color).toBe('White');
		});
	});

	describe('getMerchVariantByOptions', () => {
		it('finds variant by size and color', () => {
			const product = merchProducts[0];
			const variant = getMerchVariantByOptions(product, 'L', 'Black');
			expect(variant).toBeDefined();
			expect(variant!.id).toBe('logo-tee-l-black');
		});

		it('returns undefined for unavailable combo', () => {
			const product = merchProducts[1]; // hoodie only has white
			expect(getMerchVariantByOptions(product, 'M', 'Black')).toBeUndefined();
		});
	});

	describe('formatMerchPrice', () => {
		it('formats cents to dollar string', () => {
			expect(formatMerchPrice(2500)).toBe('$25.00');
			expect(formatMerchPrice(4500)).toBe('$45.00');
			expect(formatMerchPrice(999)).toBe('$9.99');
			expect(formatMerchPrice(0)).toBe('$0.00');
		});
	});
});
