import { describe, it, expect } from 'vitest';
import { cn } from '../utils';
import { formatPrice, getProduct, products } from '../data/products';

describe('utils', () => {
  it('cn merges classes', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });
});

describe('products', () => {
  it('products array is defined', () => {
    expect(Array.isArray(products)).toBe(true);
  });

  it('formatPrice formats cents to dollars', () => {
    expect(formatPrice(2500)).toBe('$25.00');
    expect(formatPrice(100)).toBe('$1.00');
    expect(formatPrice(0)).toBe('$0.00');
  });

  it('getProduct finds by slug', () => {
    if (products.length > 0) {
      const first = products[0];
      expect(getProduct(first.slug)).toBe(first);
    }
    expect(getProduct('nonexistent')).toBeUndefined();
  });
});
