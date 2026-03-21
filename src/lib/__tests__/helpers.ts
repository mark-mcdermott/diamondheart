import { vi } from 'vitest';

// Mock database builder — returns a chainable mock that resolves to the given data
export function mockDb(overrides: Record<string, unknown> = {}) {
	const chainable = () => {
		const chain: Record<string, unknown> = {};
		const methods = ['select', 'insert', 'update', 'delete', 'from', 'set', 'values',
			'where', 'orderBy', 'limit', 'innerJoin', 'leftJoin', 'groupBy', 'then'];

		for (const method of methods) {
			chain[method] = vi.fn().mockReturnValue(chain);
		}

		// Make it thenable so `await db.select()...` resolves
		chain.then = vi.fn().mockImplementation((resolve: (v: unknown) => void) => resolve([]));
		chain.execute = vi.fn().mockResolvedValue({ rows: [] });

		return chain;
	};

	const db = chainable();
	Object.assign(db, overrides);
	return db;
}

// Create a mock SvelteKit form action event
export function mockActionEvent(opts: {
	formData?: Record<string, string>;
	locals?: Record<string, unknown>;
	platform?: Record<string, unknown>;
	cookies?: Record<string, unknown>;
	url?: string;
} = {}) {
	const formData = new FormData();
	if (opts.formData) {
		for (const [key, value] of Object.entries(opts.formData)) {
			formData.append(key, value);
		}
	}

	return {
		request: {
			formData: vi.fn().mockResolvedValue(formData),
			text: vi.fn().mockResolvedValue(''),
			json: vi.fn().mockResolvedValue({}),
			headers: new Headers()
		},
		locals: opts.locals ?? { user: null, session: null },
		platform: {
			env: {
				DATABASE_URL: 'postgresql://test:test@localhost/test',
				...opts.platform
			}
		},
		cookies: {
			set: vi.fn(),
			get: vi.fn(),
			delete: vi.fn(),
			...opts.cookies
		},
		url: new URL(opts.url || 'http://localhost:5173/test')
	};
}

// Create a mock SvelteKit request event for API routes
export function mockRequestEvent(opts: {
	method?: string;
	body?: unknown;
	headers?: Record<string, string>;
	platform?: Record<string, unknown>;
	url?: string;
	locals?: Record<string, unknown>;
} = {}) {
	const headers = new Headers(opts.headers);

	return {
		request: new Request(opts.url || 'http://localhost:5173/api/test', {
			method: opts.method || 'GET',
			headers,
			body: opts.body ? (typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body)) : undefined
		}),
		platform: {
			env: {
				DATABASE_URL: 'postgresql://test:test@localhost/test',
				...opts.platform
			}
		},
		url: new URL(opts.url || 'http://localhost:5173/api/test'),
		locals: opts.locals ?? { user: null, session: null }
	};
}
