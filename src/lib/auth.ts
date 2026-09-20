import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import {
  SESSION_COOKIE,
  SESSION_DURATION_SECONDS as SESSION_DURATION,
  createSessionToken,
  verifySessionToken,
} from "@/lib/session-token";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

// PBKDF2 helpers for backward-compatible password verification
const PBKDF2_KEY_LENGTH = 32;

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function verifyPbkdf2(password: string, storedHash: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);

  const parts = storedHash.split(':');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') {
    return false;
  }

  const iterations = parseInt(parts[1], 10);
  const salt = new Uint8Array(base64ToArrayBuffer(parts[2]));
  const storedHashBuffer = base64ToArrayBuffer(parts[3]);

  const keyMaterial = await crypto.subtle.importKey('raw', passwordBuffer, 'PBKDF2', false, [
    'deriveBits'
  ]);

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: iterations,
      hash: 'SHA-256'
    },
    keyMaterial,
    PBKDF2_KEY_LENGTH * 8
  );

  // Constant-time comparison
  const derivedArray = new Uint8Array(derivedBits);
  const storedArray = new Uint8Array(storedHashBuffer);

  if (derivedArray.length !== storedArray.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < derivedArray.length; i++) {
    result |= derivedArray[i] ^ storedArray[i];
  }

  return result === 0;
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  // Support legacy PBKDF2 hashes from the SvelteKit version
  if (hash.startsWith('pbkdf2:')) {
    return verifyPbkdf2(password, hash);
  }
  // New bcrypt hashes
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string): Promise<string> {
  return createSessionToken(userId);
}

export async function verifySession(
  token: string
): Promise<{ userId: string } | null> {
  return verifySessionToken(token);
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION,
    path: "/",
  });
}

export async function getSessionCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value ?? null;
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getCurrentUser(): Promise<{ userId: string } | null> {
  const token = await getSessionCookie();
  if (!token) return null;
  return verifySession(token);
}
