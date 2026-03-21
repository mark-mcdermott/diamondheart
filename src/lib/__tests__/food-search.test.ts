import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$env/dynamic/private', () => ({ env: {} }));

// We need to mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { GET } from '../../routes/api/food/search/+server';

function makeEvent(query: string, apiKey?: string) {
	const url = new URL(`http://localhost/api/food/search${query ? `?q=${encodeURIComponent(query)}` : ''}`);
	return {
		url,
		platform: {
			env: apiKey !== undefined ? { USDA_API_KEY: apiKey } : {}
		}
	};
}

describe('food search API', () => {
	beforeEach(() => vi.clearAllMocks());

	it('returns 500 if USDA API key is not configured', async () => {
		await expect(GET(makeEvent('chicken') as never))
			.rejects.toMatchObject({ status: 500 });
	});

	it('returns empty foods array for empty query', async () => {
		const response = await GET(makeEvent('', 'test-key') as never);
		const data = await response.json();
		expect(data.foods).toEqual([]);
	});

	it('returns empty foods array for whitespace query', async () => {
		const url = new URL('http://localhost/api/food/search?q=%20%20');
		const response = await GET({
			url,
			platform: { env: { USDA_API_KEY: 'test-key' } }
		} as never);
		const data = await response.json();
		expect(data.foods).toEqual([]);
	});

	it('parses USDA response and extracts nutrients', async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({
				foods: [
					{
						fdcId: 171077,
						description: 'Chicken breast, raw',
						foodNutrients: [
							{ nutrientId: 1008, value: 120.5 },
							{ nutrientId: 1003, value: 22.8 },
							{ nutrientId: 1005, value: 0.2 },
							{ nutrientId: 1004, value: 2.6 }
						],
						servingSize: 100,
						servingSizeUnit: 'g'
					}
				]
			})
		});

		const response = await GET(makeEvent('chicken', 'test-key') as never);
		const data = await response.json();

		expect(data.foods).toHaveLength(1);
		expect(data.foods[0]).toEqual({
			fdcId: '171077',
			description: 'Chicken breast, raw',
			calories: 121, // rounded
			protein: 23,
			carbs: 0,
			fat: 3,
			servingSize: 100,
			servingUnit: 'g'
		});
	});

	it('defaults servingSize to 100g when not provided', async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({
				foods: [{
					fdcId: 12345,
					description: 'Apple',
					foodNutrients: [],
					servingSize: null,
					servingSizeUnit: null
				}]
			})
		});

		const response = await GET(makeEvent('apple', 'test-key') as never);
		const data = await response.json();

		expect(data.foods[0].servingSize).toBe(100);
		expect(data.foods[0].servingUnit).toBe('g');
	});

	it('defaults missing nutrients to 0', async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({
				foods: [{
					fdcId: 99999,
					description: 'Water',
					foodNutrients: []
				}]
			})
		});

		const response = await GET(makeEvent('water', 'test-key') as never);
		const data = await response.json();

		expect(data.foods[0]).toMatchObject({
			calories: 0,
			protein: 0,
			carbs: 0,
			fat: 0
		});
	});

	it('converts fdcId to string', async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({
				foods: [{ fdcId: 171077, description: 'Test', foodNutrients: [] }]
			})
		});

		const response = await GET(makeEvent('test', 'test-key') as never);
		const data = await response.json();
		expect(typeof data.foods[0].fdcId).toBe('string');
	});

	it('returns 502 when USDA API fails', async () => {
		mockFetch.mockResolvedValueOnce({ ok: false, status: 503 });

		await expect(GET(makeEvent('chicken', 'test-key') as never))
			.rejects.toMatchObject({ status: 502 });
	});
});
