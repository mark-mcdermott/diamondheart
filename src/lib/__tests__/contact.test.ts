import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockValues = vi.fn().mockResolvedValue(undefined);
const mockInsert = vi.fn().mockReturnValue({ values: mockValues });

vi.mock('$lib/server/db', () => ({
	createDb: vi.fn(() => ({ insert: mockInsert })),
	contactSubmissions: {}
}));

vi.mock('$env/dynamic/private', () => ({
	env: {}
}));

import { actions } from '../../routes/contact/+page.server';

function makeEvent(formData: Record<string, string>, platform?: Record<string, unknown>) {
	const fd = new FormData();
	for (const [k, v] of Object.entries(formData)) fd.append(k, v);

	return {
		request: { formData: vi.fn().mockResolvedValue(fd) },
		platform: { env: { DATABASE_URL: 'postgresql://test', ...platform } }
	};
}

describe('contact form', () => {
	beforeEach(() => vi.clearAllMocks());

	it('succeeds with valid input', async () => {
		const result = await actions.default(makeEvent({
			name: 'John Doe',
			email: 'john@example.com',
			message: 'Hello!'
		}) as never);

		expect(result).toEqual({ success: true });
		expect(mockInsert).toHaveBeenCalled();
		expect(mockValues).toHaveBeenCalledWith(
			expect.objectContaining({
				name: 'John Doe',
				email: 'john@example.com',
				message: 'Hello!'
			})
		);
	});

	it('rejects missing name', async () => {
		const result = await actions.default(makeEvent({
			name: '',
			email: 'john@example.com',
			message: 'Hello!'
		}) as never);

		expect(result).toMatchObject({ status: 400, data: { error: 'Name is required' } });
	});

	it('rejects missing email', async () => {
		const result = await actions.default(makeEvent({
			name: 'John',
			email: '',
			message: 'Hello!'
		}) as never);

		expect(result).toMatchObject({ status: 400, data: { error: 'Valid email is required' } });
	});

	it('rejects email without @', async () => {
		const result = await actions.default(makeEvent({
			name: 'John',
			email: 'notanemail',
			message: 'Hello!'
		}) as never);

		expect(result).toMatchObject({ status: 400, data: { error: 'Valid email is required' } });
	});

	it('rejects missing message', async () => {
		const result = await actions.default(makeEvent({
			name: 'John',
			email: 'john@example.com',
			message: ''
		}) as never);

		expect(result).toMatchObject({ status: 400, data: { error: 'Message is required' } });
	});

	it('trims whitespace from inputs', async () => {
		await actions.default(makeEvent({
			name: '  John  ',
			email: '  john@example.com  ',
			message: '  Hello!  '
		}) as never);

		expect(mockValues).toHaveBeenCalledWith(
			expect.objectContaining({
				name: 'John',
				email: 'john@example.com',
				message: 'Hello!'
			})
		);
	});

	it('returns 500 when database is not configured', async () => {
		const fd = new FormData();
		fd.append('name', 'John');
		fd.append('email', 'john@example.com');
		fd.append('message', 'Hello!');

		const event = {
			request: { formData: vi.fn().mockResolvedValue(fd) },
			platform: { env: {} }
		};

		const result = await actions.default(event as never);
		expect(result).toMatchObject({ status: 500 });
	});
});
