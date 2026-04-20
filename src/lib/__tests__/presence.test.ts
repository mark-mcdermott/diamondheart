import { describe, it, expect } from "vitest";
import {
  PRESENCE_ACTIVE_CUTOFF_MS,
  isActivePing,
  redactMeditator,
  summarizeMeditators,
  type PresenceMeditator,
} from "../presence";

function named(userId: string, name: string): PresenceMeditator {
  return { userId, name, avatarUrl: null, isAnonymous: false };
}

function anon(userId: string): PresenceMeditator {
  return { userId, name: null, avatarUrl: null, isAnonymous: true };
}

describe("isActivePing", () => {
  const now = new Date("2026-04-20T12:00:00Z");

  it("is active when the ping happened inside the cutoff window", () => {
    const recent = new Date(now.getTime() - (PRESENCE_ACTIVE_CUTOFF_MS - 1000));
    expect(isActivePing(recent, now)).toBe(true);
  });

  it("is stale once the ping is older than the cutoff", () => {
    const old = new Date(now.getTime() - (PRESENCE_ACTIVE_CUTOFF_MS + 1000));
    expect(isActivePing(old, now)).toBe(false);
  });

  it("treats a ping exactly at the boundary as stale (strict <)", () => {
    const boundary = new Date(now.getTime() - PRESENCE_ACTIVE_CUTOFF_MS);
    expect(isActivePing(boundary, now)).toBe(false);
  });

  it("treats future timestamps (clock skew) as active, not stale", () => {
    const future = new Date(now.getTime() + 5_000);
    expect(isActivePing(future, now)).toBe(true);
  });
});

describe("redactMeditator", () => {
  const base: PresenceMeditator = {
    userId: "u1",
    name: "Mark",
    avatarUrl: "https://cdn.example/avatar.png",
    isAnonymous: false,
  };

  it("passes through named users unchanged", () => {
    expect(redactMeditator(base, true)).toEqual(base);
  });

  it("strips name and avatar when the user has opted anonymous", () => {
    expect(redactMeditator(base, false)).toEqual({
      userId: "u1",
      name: null,
      avatarUrl: null,
      isAnonymous: true,
    });
  });

  it("always flips isAnonymous to match the preference, even on already-nulled input", () => {
    const nulled: PresenceMeditator = {
      userId: "u2",
      name: null,
      avatarUrl: null,
      isAnonymous: false,
    };
    expect(redactMeditator(nulled, false).isAnonymous).toBe(true);
  });

  it("does not leak a previously-redacted anonymous user's name back out", () => {
    const leaky: PresenceMeditator = {
      userId: "u3",
      name: "Real Name",
      avatarUrl: "https://cdn.example/real.png",
      isAnonymous: true,
    };
    const redacted = redactMeditator(leaky, false);
    expect(redacted.name).toBeNull();
    expect(redacted.avatarUrl).toBeNull();
  });
});

describe("summarizeMeditators", () => {
  it("falls back to a gentle placeholder when the preview is empty", () => {
    expect(summarizeMeditators([], 0)).toBe("Sit with them for a moment.");
  });

  it("uses singular phrasing when exactly one named user is visible", () => {
    expect(summarizeMeditators([named("u1", "Mark")], 0)).toBe("Mark is on the cushion.");
  });

  it("shows 'Someone' for anonymous users in the sentence", () => {
    expect(summarizeMeditators([anon("u1")], 0)).toBe("Someone is on the cushion.");
  });

  it("joins two users with 'and'", () => {
    expect(summarizeMeditators([named("u1", "Mark"), named("u2", "Sam")], 0)).toBe(
      "Mark and Sam",
    );
  });

  it("uses an Oxford comma for three visible users with no overflow", () => {
    const list = [
      named("u1", "Mark"),
      named("u2", "Sam"),
      named("u3", "Alex"),
    ];
    expect(summarizeMeditators(list, 0)).toBe("Mark, Sam, and Alex");
  });

  it("collapses beyond-preview users into an 'and N others' suffix", () => {
    const list = [
      named("u1", "Mark"),
      named("u2", "Sam"),
      named("u3", "Alex"),
      named("u4", "River"),
      named("u5", "Ellis"),
    ];
    expect(summarizeMeditators(list, 3)).toBe("Mark, Sam, Alex and 5 others");
  });

  it("uses singular 'other' when the remainder is exactly one", () => {
    const list = [named("u1", "Mark"), named("u2", "Sam"), named("u3", "Alex")];
    expect(summarizeMeditators(list, 1)).toBe("Mark, Sam, Alex and 1 other");
  });
});
