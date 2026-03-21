import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the modules before importing
const mockUpdate = vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }) });
const mockSelect = vi.fn().mockReturnValue({
	from: vi.fn().mockReturnValue({
		where: vi.fn().mockResolvedValue([])
	})
});
const mockDbInstance = { update: mockUpdate, select: mockSelect };

vi.mock('$lib/server/db', () => ({
	createDb: vi.fn(() => mockDbInstance),
	orders: { id: 'id', stripePaymentIntentId: 'stripe_payment_intent_id' }
}));

vi.mock('$lib/server/stripe', () => ({
	createStripe: vi.fn(() => ({
		webhooks: {
			constructEvent: vi.fn()
		}
	}))
}));

vi.mock('$lib/server/printful', () => ({
	createPrintfulClient: vi.fn(() => ({
		createOrder: vi.fn().mockResolvedValue({ id: 12345 }),
		confirmOrder: vi.fn().mockResolvedValue({})
	}))
}));

vi.mock('$env/dynamic/private', () => ({
	env: {}
}));

vi.mock('drizzle-orm', () => ({
	eq: vi.fn((a, b) => ({ field: a, value: b }))
}));

import { POST } from '../../routes/api/webhooks/stripe/+server';
import { createStripe } from '$lib/server/stripe';

describe('Stripe webhook endpoint', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns 500 if Stripe is not configured', async () => {
		const event = {
			request: new Request('http://localhost/api/webhooks/stripe', {
				method: 'POST',
				body: 'test',
				headers: { 'stripe-signature': 'sig_test' }
			}),
			platform: { env: {} }
		};

		await expect(POST(event as never)).rejects.toMatchObject({
			status: 500
		});
	});

	it('returns 400 if signature header is missing', async () => {
		const event = {
			request: new Request('http://localhost/api/webhooks/stripe', {
				method: 'POST',
				body: 'test'
			}),
			platform: {
				env: {
					STRIPE_SECRET_KEY: 'sk_test',
					STRIPE_WEBHOOK_SECRET: 'whsec_test',
					DATABASE_URL: 'postgresql://test'
				}
			}
		};

		await expect(POST(event as never)).rejects.toMatchObject({
			status: 400
		});
	});

	it('returns 400 on invalid signature', async () => {
		const mockStripe = {
			webhooks: {
				constructEvent: vi.fn().mockImplementation(() => {
					throw new Error('Invalid signature');
				})
			}
		};
		vi.mocked(createStripe).mockReturnValue(mockStripe as never);

		const event = {
			request: new Request('http://localhost/api/webhooks/stripe', {
				method: 'POST',
				body: 'test',
				headers: { 'stripe-signature': 'invalid_sig' }
			}),
			platform: {
				env: {
					STRIPE_SECRET_KEY: 'sk_test',
					STRIPE_WEBHOOK_SECRET: 'whsec_test',
					DATABASE_URL: 'postgresql://test'
				}
			}
		};

		await expect(POST(event as never)).rejects.toMatchObject({
			status: 400
		});
	});

	it('handles checkout.session.completed and updates order to paid', async () => {
		const setMock = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });
		mockUpdate.mockReturnValue({ set: setMock });

		// Mock select for Printful order lookup
		mockSelect.mockReturnValue({
			from: vi.fn().mockReturnValue({
				where: vi.fn().mockResolvedValue([{
					id: 'order-1',
					email: 'test@example.com',
					items: [{ quantity: 1 }],
					subtotal: 2500,
					shipping: 500,
					total: 3000
				}])
			})
		});

		const mockStripe = {
			webhooks: {
				constructEvent: vi.fn().mockReturnValue({
					type: 'checkout.session.completed',
					data: {
						object: {
							metadata: { orderId: 'order-1' },
							payment_intent: 'pi_test_123',
							shipping_details: {
								name: 'John Doe',
								address: {
									line1: '123 Main St',
									line2: null,
									city: 'Austin',
									state: 'TX',
									postal_code: '78701',
									country: 'US'
								}
							},
							shipping_cost: { amount_total: 500 },
							amount_total: 3000
						}
					}
				})
			}
		};
		vi.mocked(createStripe).mockReturnValue(mockStripe as never);

		const event = {
			request: new Request('http://localhost/api/webhooks/stripe', {
				method: 'POST',
				body: 'test',
				headers: { 'stripe-signature': 'valid_sig' }
			}),
			platform: {
				env: {
					STRIPE_SECRET_KEY: 'sk_test',
					STRIPE_WEBHOOK_SECRET: 'whsec_test',
					DATABASE_URL: 'postgresql://test'
				}
			}
		};

		const response = await POST(event as never);
		const data = await response.json();

		expect(data.received).toBe(true);
		expect(mockUpdate).toHaveBeenCalled();
		expect(setMock).toHaveBeenCalledWith(
			expect.objectContaining({
				status: 'paid',
				stripePaymentIntentId: 'pi_test_123'
			})
		);
	});

	it('handles payment_intent.payment_failed', async () => {
		const setMock = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });
		mockUpdate.mockReturnValue({ set: setMock });
		mockSelect.mockReturnValue({
			from: vi.fn().mockReturnValue({
				where: vi.fn().mockResolvedValue([{ id: 'order-1' }])
			})
		});

		const mockStripe = {
			webhooks: {
				constructEvent: vi.fn().mockReturnValue({
					type: 'payment_intent.payment_failed',
					data: {
						object: { id: 'pi_failed_123' }
					}
				})
			}
		};
		vi.mocked(createStripe).mockReturnValue(mockStripe as never);

		const event = {
			request: new Request('http://localhost/api/webhooks/stripe', {
				method: 'POST',
				body: 'test',
				headers: { 'stripe-signature': 'valid_sig' }
			}),
			platform: {
				env: {
					STRIPE_SECRET_KEY: 'sk_test',
					STRIPE_WEBHOOK_SECRET: 'whsec_test',
					DATABASE_URL: 'postgresql://test'
				}
			}
		};

		const response = await POST(event as never);
		expect(response.status).toBe(200);
	});
});
