import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PrintfulClient } from '$lib/server/printful';

describe('PrintfulClient', () => {
	let client: PrintfulClient;

	beforeEach(() => {
		client = new PrintfulClient('test-api-key');
		vi.restoreAllMocks();
	});

	describe('createOrder', () => {
		it('sends correct request to Printful API', async () => {
			const mockResponse = { id: 12345, external_id: 'order-1', status: 'draft' };
			vi.spyOn(globalThis, 'fetch').mockResolvedValue(
				new Response(JSON.stringify({ result: mockResponse }), { status: 200 })
			);

			const result = await client.createOrder(
				'order-1',
				{
					name: 'John Doe',
					address1: '123 Main St',
					city: 'Anytown',
					country_code: 'US',
					zip: '12345',
					email: 'john@example.com'
				},
				[{ sync_variant_id: 'sv-123', quantity: 2 }]
			);

			expect(result).toEqual(mockResponse);
			expect(fetch).toHaveBeenCalledWith(
				'https://api.printful.com/orders',
				expect.objectContaining({
					method: 'POST',
					headers: expect.objectContaining({
						Authorization: 'Bearer test-api-key',
						'Content-Type': 'application/json'
					})
				})
			);

			const callBody = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
			expect(callBody.external_id).toBe('order-1');
			expect(callBody.items).toHaveLength(1);
			expect(callBody.items[0].sync_variant_id).toBe('sv-123');
		});

		it('includes retail costs when provided', async () => {
			vi.spyOn(globalThis, 'fetch').mockResolvedValue(
				new Response(JSON.stringify({ result: { id: 1, external_id: 'o-1', status: 'draft' } }), { status: 200 })
			);

			await client.createOrder(
				'o-1',
				{ name: 'Jane', address1: '456 Oak', city: 'Town', country_code: 'US', zip: '00000', email: 'j@e.com' },
				[{ sync_variant_id: 'sv-1', quantity: 1 }],
				{ subtotal: 2500, shipping: 500, total: 3000 }
			);

			const callBody = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
			expect(callBody.retail_costs).toEqual({
				subtotal: '25.00',
				shipping: '5.00',
				total: '30.00'
			});
		});

		it('throws on API error', async () => {
			vi.spyOn(globalThis, 'fetch').mockResolvedValue(
				new Response(JSON.stringify({ error: { message: 'Invalid API key' } }), { status: 401 })
			);

			await expect(
				client.createOrder(
					'o-1',
					{ name: 'J', address1: 'A', city: 'C', country_code: 'US', zip: '0', email: 'e@e.com' },
					[{ sync_variant_id: 'sv-1', quantity: 1 }]
				)
			).rejects.toThrow('Invalid API key');
		});
	});

	describe('confirmOrder', () => {
		it('sends POST to confirm endpoint', async () => {
			vi.spyOn(globalThis, 'fetch').mockResolvedValue(
				new Response(JSON.stringify({ result: { id: 12345, status: 'pending' } }), { status: 200 })
			);

			const result = await client.confirmOrder(12345);

			expect(result.status).toBe('pending');
			expect(fetch).toHaveBeenCalledWith(
				'https://api.printful.com/orders/12345/confirm',
				expect.objectContaining({ method: 'POST' })
			);
		});
	});
});
