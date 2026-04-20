import { describe, it, expect, beforeEach, vi } from "vitest";

const storage = new Map<string, string>();

const mockLocalStorage = {
  getItem: (k: string) => (storage.has(k) ? storage.get(k)! : null),
  setItem: (k: string, v: string) => {
    storage.set(k, String(v));
  },
  removeItem: (k: string) => {
    storage.delete(k);
  },
  clear: () => storage.clear(),
};

vi.stubGlobal("window", { localStorage: mockLocalStorage });

import {
  BIOMETRIC_LOCK_KEY,
  isBiometricLockEnabled,
  setBiometricLockEnabled,
} from "../biometric-lock";

describe("biometric-lock", () => {
  beforeEach(() => {
    storage.clear();
  });

  it("returns false when no flag has ever been set", () => {
    expect(isBiometricLockEnabled()).toBe(false);
  });

  it("persists the enabled state", () => {
    setBiometricLockEnabled(true);
    expect(isBiometricLockEnabled()).toBe(true);
  });

  it("persists the disabled state after enabling", () => {
    setBiometricLockEnabled(true);
    setBiometricLockEnabled(false);
    expect(isBiometricLockEnabled()).toBe(false);
  });

  it("stores under a stable key so other utilities can reference it", () => {
    setBiometricLockEnabled(true);
    expect(storage.get(BIOMETRIC_LOCK_KEY)).toBe("1");
  });
});
