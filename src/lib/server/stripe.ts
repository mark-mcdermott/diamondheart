import Stripe from 'stripe';

export function createStripe(secretKey: string) {
	return new Stripe(secretKey, {
		apiVersion: '2024-11-20.acacia'
	});
}

export function generateId(): string {
	return crypto.randomUUID();
}
