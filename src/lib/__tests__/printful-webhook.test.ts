import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockWhere = vi.fn().mockResolvedValue(undefined);
const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
const mockUpdate = vi.fn().mockReturnValue({ set: mockSet });

vi.mock('$lib/server/db', () => ({
	createDb: vi.fn(() => ({ update: mockUpdate })),
	orders: { id: 'id' }
}));

vi.mock('$env/dynamic/private', () => ({
	env: {}
}));

vi.mock('drizzle-orm', () => ({
	eq: vi.fn((a, b) => ({ field: a, value: b }))
}));

import { POST } from '../../routes/api/webhooks/printful/+server';

describe('Printful webhook endpoint', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns 500 if database is not configured', async () => {
		const event = {
			request: new Request('http://localhost/api/webhooks/printful', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ type: 'test', data: {} })
			}),
			platform: { env: {} }
		};

		const response = await POST(event as never);
		expect(response.status).toBe(500);
	});

	it('returns ok if no external_id in payload', async () => {
		const event = {
			request: new Request('http://localhost/api/webhooks/printful', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ type: 'order_updated', data: { order: {} } })
			}),
			platform: { env: { DATABASE_URL: 'postgresql://test' } }
		};

		const response = await POST(event as never);
		const data = await response.json();
		expect(data.received).toBe(true);
	});

	it('handles package_shipped and sets tracking info', async () => {
		const event = {
			request: new Request('http://localhost/api/webhooks/printful', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					type: 'package_shipped',
					data: {
						order: { external_id: 'order-1' },
						shipment: {
							tracking_number: 'TRACK123',
							tracking_url: 'https://track.example.com/TRACK123'
						}
					}
				})
			}),
			platform: { env: { DATABASE_URL: 'postgresql://test' } }
		};

		const response = await POST(event as never);
		expect(response.status).toBe(200);
		expect(mockSet).toHaveBeenCalledWith(
			expect.objectContaining({
				status: 'shipped',
				trackingNumber: 'TRACK123',
				trackingUrl: 'https://track.example.com/TRACK123'
			})
		);
	});

	it('handles order_updated with status mapping', async () => {
		const statusTests = [
			{ input: 'draft', expected: 'processing' },
			{ input: 'pending', expected: 'processing' },
			{ input: 'inprocess', expected: 'processing' },
			{ input: 'onhold', expected: 'on_hold' },
			{ input: 'partial', expected: 'partially_shipped' },
			{ input: 'fulfilled', expected: 'delivered' },
			{ input: 'failed', expected: 'printful_failed' },
			{ input: 'canceled', expected: 'canceled' }
		];

		for (const { input, expected } of statusTests) {
			vi.clearAllMocks();

			const event = {
				request: new Request('http://localhost/api/webhooks/printful', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({
						type: 'order_updated',
						data: {
							order: { external_id: 'order-1', status: input }
						}
					})
				}),
				platform: { env: { DATABASE_URL: 'postgresql://test' } }
			};

			await POST(event as never);
			expect(mockSet).toHaveBeenCalledWith(
				expect.objectContaining({ status: expected })
			);
		}
	});

	it('handles order_failed', async () => {
		const event = {
			request: new Request('http://localhost/api/webhooks/printful', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					type: 'order_failed',
					data: {
						order: { external_id: 'order-1' }
					}
				})
			}),
			platform: { env: { DATABASE_URL: 'postgresql://test' } }
		};

		const response = await POST(event as never);
		expect(response.status).toBe(200);
		expect(mockSet).toHaveBeenCalledWith(
			expect.objectContaining({ status: 'printful_failed' })
		);
	});

	it('handles missing shipment data gracefully', async () => {
		const event = {
			request: new Request('http://localhost/api/webhooks/printful', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					type: 'package_shipped',
					data: {
						order: { external_id: 'order-1' }
					}
				})
			}),
			platform: { env: { DATABASE_URL: 'postgresql://test' } }
		};

		const response = await POST(event as never);
		expect(response.status).toBe(200);
		expect(mockSet).toHaveBeenCalledWith(
			expect.objectContaining({
				status: 'shipped',
				trackingNumber: null,
				trackingUrl: null
			})
		);
	});
});
