import Stripe from 'stripe';

export function createStripe(secretKey: string) {
	return new Stripe(secretKey);
}

export function generateId(): string {
	return crypto.randomUUID();
}
