import bcrypt from "bcryptjs";

/**
 * Password hashing, independent of any framework. bcrypt for everything
 * written by this app; the SvelteKit version stored `pbkdf2:` hashes, which
 * are still verified so those accounts keep signing in. Better Auth takes
 * over hashing in Phase 2 of the port and calls `verifyPassword` for legacy
 * hashes.
 */

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

const PBKDF2_KEY_LENGTH = 32;

function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function verifyPbkdf2(password: string, storedHash: string): Promise<boolean> {
  const parts = storedHash.split(":");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;

  const iterations = parseInt(parts[1], 10);
  const salt = base64ToBytes(parts[2]);
  const stored = base64ToBytes(parts[3]);

  const keyMaterial = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const derived = new Uint8Array(
    await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations, hash: "SHA-256" }, keyMaterial, PBKDF2_KEY_LENGTH * 8)
  );

  if (derived.length !== stored.length) return false;
  let diff = 0;
  for (let i = 0; i < derived.length; i++) diff |= derived[i] ^ stored[i];
  return diff === 0;
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (hash.startsWith("pbkdf2:")) return verifyPbkdf2(password, hash);
  return bcrypt.compare(password, hash);
}
