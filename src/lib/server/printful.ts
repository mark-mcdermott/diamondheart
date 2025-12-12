// Printful API integration
interface PrintfulRecipient {
	name: string;
	address1: string;
	address2?: string;
	city: string;
	state_code?: string;
	country_code: string;
	zip: string;
	email: string;
}

interface PrintfulOrderItem {
	sync_variant_id: string;
	quantity: number;
}

interface PrintfulOrder {
	id: number;
	external_id: string;
	status: string;
}

export class PrintfulClient {
	private apiKey: string;
	private baseUrl = 'https://api.printful.com';

	constructor(apiKey: string) {
		this.apiKey = apiKey;
	}

	private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
		const response = await fetch(`${this.baseUrl}${endpoint}`, {
			...options,
			headers: {
				Authorization: `Bearer ${this.apiKey}`,
				'Content-Type': 'application/json',
				...options.headers
			}
		});
		const data = await response.json();
		if (!response.ok) throw new Error(data.error?.message || `Printful API error: ${response.status}`);
		return data.result;
	}

	async createOrder(orderId: string, recipient: PrintfulRecipient, items: PrintfulOrderItem[], retailCosts?: { subtotal: number; shipping: number; total: number }): Promise<PrintfulOrder> {
		const orderData: Record<string, unknown> = { external_id: orderId, recipient, items };
		if (retailCosts) {
			orderData.retail_costs = {
				subtotal: (retailCosts.subtotal / 100).toFixed(2),
				shipping: (retailCosts.shipping / 100).toFixed(2),
				total: (retailCosts.total / 100).toFixed(2)
			};
		}
		return this.request<PrintfulOrder>('/orders', { method: 'POST', body: JSON.stringify(orderData) });
	}

	async confirmOrder(orderId: number): Promise<PrintfulOrder> {
		return this.request<PrintfulOrder>(`/orders/${orderId}/confirm`, { method: 'POST' });
	}
}

export function createPrintfulClient(apiKey: string): PrintfulClient {
	return new PrintfulClient(apiKey);
}
