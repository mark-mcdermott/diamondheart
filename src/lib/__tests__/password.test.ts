import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '$lib/server/password';

describe('password hashing', () => {
	it('produces a valid hash format', async () => {
		const hash = await hashPassword('mypassword');
		const parts = hash.split(':');
		expect(parts).toHaveLength(4);
		expect(parts[0]).toBe('pbkdf2');
		expect(parseInt(parts[1])).toBe(100000);
		expect(parts[2].length).toBeGreaterThan(0); // salt
		expect(parts[3].length).toBeGreaterThan(0); // hash
	});

	it('generates different hashes for the same password (different salts)', async () => {
		const hash1 = await hashPassword('samepassword');
		const hash2 = await hashPassword('samepassword');
		expect(hash1).not.toBe(hash2);
	});

	it('generates different hashes for different passwords', async () => {
		const hash1 = await hashPassword('password1');
		const hash2 = await hashPassword('password2');
		expect(hash1.split(':')[3]).not.toBe(hash2.split(':')[3]);
	});
});

describe('password verification', () => {
	it('verifies correct password', async () => {
		const hash = await hashPassword('correctpassword');
		const result = await verifyPassword(hash, 'correctpassword');
		expect(result).toBe(true);
	});

	it('rejects incorrect password', async () => {
		const hash = await hashPassword('correctpassword');
		const result = await verifyPassword(hash, 'wrongpassword');
		expect(result).toBe(false);
	});

	it('rejects malformed stored hash (wrong prefix)', async () => {
		const result = await verifyPassword('bcrypt:100000:abc:def', 'password');
		expect(result).toBe(false);
	});

	it('rejects malformed stored hash (too few parts)', async () => {
		const result = await verifyPassword('pbkdf2:100000:abc', 'password');
		expect(result).toBe(false);
	});

	it('handles empty password', async () => {
		const hash = await hashPassword('');
		const result = await verifyPassword(hash, '');
		expect(result).toBe(true);
	});

	it('handles special characters', async () => {
		const password = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`"\'\\';
		const hash = await hashPassword(password);
		expect(await verifyPassword(hash, password)).toBe(true);
		expect(await verifyPassword(hash, 'different')).toBe(false);
	});

	it('handles unicode characters', async () => {
		const password = 'пароль密码パスワード';
		const hash = await hashPassword(password);
		expect(await verifyPassword(hash, password)).toBe(true);
	});

	it('handles very long password', async () => {
		const password = 'a'.repeat(10000);
		const hash = await hashPassword(password);
		expect(await verifyPassword(hash, password)).toBe(true);
	});
});
