import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSelectLimit = vi.fn().mockResolvedValue([]);
const mockSelectWhere = vi.fn().mockReturnValue({ limit: mockSelectLimit });
const mockSelectFrom = vi.fn().mockReturnValue({ where: mockSelectWhere });
const mockSelect = vi.fn().mockReturnValue({ from: mockSelectFrom });

vi.mock('$lib/server/db', () => ({
	createDb: vi.fn(() => ({ select: mockSelect })),
	users: { email: 'email' }
}));

vi.mock('$lib/server/auth', () => ({
	createLucia: vi.fn(() => ({
		createSession: vi.fn().mockResolvedValue({ id: 'session-1' }),
		createSessionCookie: vi.fn().mockReturnValue({
			name: 'auth_session',
			value: 'cookie-value',
			attributes: { httpOnly: true }
		})
	}))
}));

vi.mock('$lib/server/password', () => ({
	verifyPassword: vi.fn().mockResolvedValue(false)
}));

vi.mock('$env/dynamic/private', () => ({ env: {} }));

vi.mock('drizzle-orm', () => ({
	eq: vi.fn((a, b) => ({ field: a, value: b }))
}));

import { actions, load } from '../../routes/login/+page.server';
import { verifyPassword } from '$lib/server/password';

function makeEvent(formData: Record<string, string>) {
	const fd = new FormData();
	for (const [k, v] of Object.entries(formData)) fd.append(k, v);
	return {
		request: { formData: vi.fn().mockResolvedValue(fd) },
		platform: { env: { DATABASE_URL: 'postgresql://test' } },
		locals: { user: null, session: null },
		cookies: { set: vi.fn(), get: vi.fn() }
	};
}

describe('login', () => {
	beforeEach(() => vi.clearAllMocks());

	describe('load', () => {
		it('redirects authenticated users to dashboard', async () => {
			await expect(load({ locals: { user: { id: '1' }, session: { id: 's1' } } } as never))
				.rejects.toMatchObject({ status: 302 });
		});

		it('returns empty for unauthenticated users', async () => {
			const result = await load({ locals: { user: null, session: null } } as never);
			expect(result).toEqual({});
		});
	});

	describe('default action', () => {
		it('rejects invalid email (no @)', async () => {
			const result = await actions.default(makeEvent({
				email: 'notanemail',
				password: 'password123'
			}) as never);
			expect(result).toMatchObject({ status: 400, data: { error: 'Invalid email address' } });
		});

		it('rejects empty password', async () => {
			const result = await actions.default(makeEvent({
				email: 'test@example.com',
				password: ''
			}) as never);
			expect(result).toMatchObject({ status: 400, data: { error: 'Password is required' } });
		});

		it('rejects non-existent user', async () => {
			mockSelectLimit.mockResolvedValueOnce([]);

			const result = await actions.default(makeEvent({
				email: 'nonexistent@example.com',
				password: 'password123'
			}) as never);
			expect(result).toMatchObject({ status: 400, data: { error: 'Invalid email or password' } });
		});

		it('rejects wrong password', async () => {
			mockSelectLimit.mockResolvedValueOnce([{
				id: 'user-1',
				email: 'test@example.com',
				passwordHash: 'pbkdf2:100000:salt:hash'
			}]);
			vi.mocked(verifyPassword).mockResolvedValueOnce(false);

			const result = await actions.default(makeEvent({
				email: 'test@example.com',
				password: 'wrongpassword'
			}) as never);
			expect(result).toMatchObject({ status: 400, data: { error: 'Invalid email or password' } });
		});

		it('uses same error message for missing user and wrong password (no enumeration)', async () => {
			// Missing user
			mockSelectLimit.mockResolvedValueOnce([]);
			const noUser = await actions.default(makeEvent({
				email: 'missing@example.com',
				password: 'password123'
			}) as never);

			// Wrong password
			mockSelectLimit.mockResolvedValueOnce([{
				id: 'user-1',
				email: 'test@example.com',
				passwordHash: 'hash'
			}]);
			vi.mocked(verifyPassword).mockResolvedValueOnce(false);
			const wrongPw = await actions.default(makeEvent({
				email: 'test@example.com',
				password: 'wrong'
			}) as never);

			expect((noUser as { data: { error: string } }).data.error)
				.toBe((wrongPw as { data: { error: string } }).data.error);
		});

		it('creates session and redirects on valid login', async () => {
			mockSelectLimit.mockResolvedValueOnce([{
				id: 'user-1',
				email: 'test@example.com',
				passwordHash: 'pbkdf2:100000:salt:hash'
			}]);
			vi.mocked(verifyPassword).mockResolvedValueOnce(true);

			const event = makeEvent({
				email: 'test@example.com',
				password: 'correctpassword'
			});

			await expect(actions.default(event as never))
				.rejects.toMatchObject({ status: 302 });

			expect(event.cookies.set).toHaveBeenCalledWith(
				'auth_session',
				'cookie-value',
				expect.objectContaining({ path: '/' })
			);
		});

		it('lowercases email before lookup', async () => {
			mockSelectLimit.mockResolvedValueOnce([]);

			await actions.default(makeEvent({
				email: 'Test@Example.COM',
				password: 'password123'
			}) as never);

			// The eq() mock should have been called with lowercase email
			const { eq } = await import('drizzle-orm');
			expect(eq).toHaveBeenCalledWith('email', 'test@example.com');
		});
	});
});
