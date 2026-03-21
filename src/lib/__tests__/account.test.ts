import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockUpdateSetWhere = vi.fn().mockResolvedValue(undefined);
const mockUpdateSet = vi.fn().mockReturnValue({ where: mockUpdateSetWhere });
const mockUpdate = vi.fn().mockReturnValue({ set: mockUpdateSet });
const mockSelectResult = vi.fn().mockResolvedValue([{ passwordHash: 'pbkdf2:100000:salt:hash' }]);
const mockSelectWhere = vi.fn().mockReturnValue({ then: mockSelectResult, limit: vi.fn().mockResolvedValue([]) });
const mockSelectFrom = vi.fn().mockReturnValue({ where: mockSelectWhere });
const mockSelect = vi.fn().mockReturnValue({ from: mockSelectFrom });

vi.mock('$lib/server/db', () => ({
	createDb: vi.fn(() => ({ select: mockSelect, update: mockUpdate })),
	users: { id: 'id', email: 'email', passwordHash: 'password_hash' }
}));

vi.mock('$lib/server/password', () => ({
	verifyPassword: vi.fn().mockResolvedValue(true),
	hashPassword: vi.fn().mockResolvedValue('pbkdf2:100000:newsalt:newhash')
}));

vi.mock('$env/dynamic/private', () => ({ env: {} }));
vi.mock('$app/environment', () => ({ dev: true }));

vi.mock('drizzle-orm', () => ({
	eq: vi.fn((a, b) => ({ field: a, value: b }))
}));

import { actions, load } from '../../routes/account/+page.server';
import { verifyPassword } from '$lib/server/password';

function makeEvent(formData: Record<string, string>, user = { id: 'user-1', email: 'test@test.com', name: 'Test', avatarUrl: null }) {
	const fd = new FormData();
	for (const [k, v] of Object.entries(formData)) fd.append(k, v);
	return {
		request: { formData: vi.fn().mockResolvedValue(fd) },
		platform: { env: { DATABASE_URL: 'postgresql://test' } },
		locals: { user, session: { id: 'session-1' } }
	};
}

describe('account', () => {
	beforeEach(() => vi.clearAllMocks());

	describe('load', () => {
		it('redirects unauthenticated users', async () => {
			await expect(load({ locals: { user: null } } as never))
				.rejects.toMatchObject({ status: 302 });
		});

		it('returns user data for authenticated users', async () => {
			const result = await load({
				locals: { user: { id: 'user-1', email: 'a@b.com', name: 'Test', avatarUrl: null } }
			} as never) as { user: { id: string; email: string } };
			expect(result.user).toMatchObject({ id: 'user-1', email: 'a@b.com' });
		});
	});

	describe('default action (profile update)', () => {
		it('rejects unauthenticated', async () => {
			const event = makeEvent({ email: 'a@b.com' });
			event.locals.user = null as never;
			const result = await actions.default(event as never);
			expect(result).toMatchObject({ status: 401 });
		});

		it('rejects invalid email', async () => {
			const result = await actions.default(makeEvent({ email: 'notanemail', name: 'Test' }) as never);
			expect(result).toMatchObject({ status: 400, data: { error: 'Valid email is required' } });
		});

		it('updates profile with valid data', async () => {
			const result = await actions.default(makeEvent({
				email: 'new@example.com',
				name: 'New Name'
			}) as never);

			expect(result).toEqual({ success: true });
			expect(mockUpdate).toHaveBeenCalled();
			expect(mockUpdateSet).toHaveBeenCalledWith(
				expect.objectContaining({
					email: 'new@example.com',
					name: 'New Name'
				})
			);
		});

		it('lowercases and trims email', async () => {
			await actions.default(makeEvent({
				email: '  Test@Example.COM  ',
				name: 'Test'
			}) as never);

			expect(mockUpdateSet).toHaveBeenCalledWith(
				expect.objectContaining({ email: 'test@example.com' })
			);
		});

		it('handles duplicate email error', async () => {
			mockUpdateSet.mockReturnValueOnce({
				where: vi.fn().mockRejectedValue({ code: '23505' })
			});

			const result = await actions.default(makeEvent({
				email: 'taken@example.com',
				name: 'Test'
			}) as never);

			expect(result).toMatchObject({ status: 400, data: { error: 'Email already in use' } });
		});
	});

	describe('changePassword', () => {
		it('rejects unauthenticated', async () => {
			const event = makeEvent({ currentPassword: 'old', newPassword: 'new12345', confirmPassword: 'new12345' });
			event.locals.user = null as never;
			const result = await actions.changePassword(event as never);
			expect(result).toMatchObject({ status: 401 });
		});

		it('requires all fields', async () => {
			const result = await actions.changePassword(makeEvent({
				currentPassword: '',
				newPassword: '',
				confirmPassword: ''
			}) as never);
			expect(result).toMatchObject({ status: 400, data: { passwordError: 'All fields are required' } });
		});

		it('requires min 8 char password', async () => {
			const result = await actions.changePassword(makeEvent({
				currentPassword: 'oldpass',
				newPassword: 'short',
				confirmPassword: 'short'
			}) as never);
			expect(result).toMatchObject({ status: 400, data: { passwordError: 'New password must be at least 8 characters' } });
		});

		it('requires matching passwords', async () => {
			const result = await actions.changePassword(makeEvent({
				currentPassword: 'oldpass',
				newPassword: 'newpassword1',
				confirmPassword: 'newpassword2'
			}) as never);
			expect(result).toMatchObject({ status: 400, data: { passwordError: 'New passwords do not match' } });
		});

		it('rejects incorrect current password', async () => {
			mockSelectResult.mockResolvedValueOnce([{ passwordHash: 'hash' }]);
			vi.mocked(verifyPassword).mockResolvedValueOnce(false);

			const result = await actions.changePassword(makeEvent({
				currentPassword: 'wrongcurrent',
				newPassword: 'newpassword1',
				confirmPassword: 'newpassword1'
			}) as never);
			expect(result).toMatchObject({ status: 400, data: { passwordError: 'Current password is incorrect' } });
		});

		it('succeeds with valid password change', async () => {
			mockSelectResult.mockResolvedValueOnce([{ passwordHash: 'hash' }]);
			vi.mocked(verifyPassword).mockResolvedValueOnce(true);

			const result = await actions.changePassword(makeEvent({
				currentPassword: 'correctcurrent',
				newPassword: 'newpassword1',
				confirmPassword: 'newpassword1'
			}) as never);
			expect(result).toEqual({ success: true });
		});
	});
});
