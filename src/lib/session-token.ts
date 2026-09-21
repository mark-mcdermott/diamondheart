import { Capacitor } from "@capacitor/core";
import { NATIVE } from "@/app/platform";

/**
 * The bearer token the native bundle authenticates with (Decision 9). Kept in
 * memory for the synchronous read every request makes, and persisted in the
 * platform's preferences store on a device, localStorage elsewhere. The web
 * build never stores one: its session is the httpOnly cookie, and a token in
 * web storage would only widen what a script injection could take.
 */

const KEY = "dh.session-token";
let token: string | null = null;

async function store(): Promise<{ get: () => Promise<string | null>; set: (value: string) => Promise<void>; clear: () => Promise<void> }> {
  if (Capacitor.isNativePlatform()) {
    const { Preferences } = await import("@capacitor/preferences");
    return {
      get: async () => (await Preferences.get({ key: KEY })).value,
      set: (value) => Preferences.set({ key: KEY, value }),
      clear: () => Preferences.remove({ key: KEY }),
    };
  }
  return {
    get: async () => {
      try {
        return localStorage.getItem(KEY);
      } catch {
        return null;
      }
    },
    set: async (value) => {
      try {
        localStorage.setItem(KEY, value);
      } catch {
        // Blocked storage: the token lives for this page only.
      }
    },
    clear: async () => {
      try {
        localStorage.removeItem(KEY);
      } catch {
        // Nothing stored.
      }
    },
  };
}

export function getToken(): string | null {
  return token;
}

/** Reads the persisted token into memory; the bundle calls this once before rendering. */
export async function loadToken(): Promise<string | null> {
  if (!NATIVE) return null;
  token = await (await store()).get();
  return token;
}

export async function setToken(value: string): Promise<void> {
  if (!NATIVE) return;
  token = value;
  await (await store()).set(value);
}

export async function clearToken(): Promise<void> {
  token = null;
  if (!NATIVE) return;
  await (await store()).clear();
}
