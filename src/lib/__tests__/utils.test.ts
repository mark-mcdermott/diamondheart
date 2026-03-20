import { describe, it, expect } from 'vitest';
import { cn } from '$lib/utils';

describe('cn utility', () => {
	it('merges class names', () => {
		expect(cn('foo', 'bar')).toBe('foo bar');
	});

	it('handles conditional classes', () => {
		expect(cn('base', false && 'hidden', 'always')).toBe('base always');
	});

	it('deduplicates tailwind classes', () => {
		expect(cn('p-4', 'p-8')).toBe('p-8');
	});

	it('handles undefined and null', () => {
		expect(cn('base', undefined, null, 'end')).toBe('base end');
	});

	it('handles empty input', () => {
		expect(cn()).toBe('');
	});
});
