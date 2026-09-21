/**
 * Seeds a small set of demo users with meditation sessions + reactions so
 * the /feed page has something to show. Idempotent — safe to re-run.
 *
 * Usage:
 *   npm run db:seed:feed
 *
 * Cleanup:
 *   npm run db:seed:feed:clean
 */

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { inArray } from "drizzle-orm";
import bcrypt from "bcryptjs";
import {
  users,
  meditationSessions,
  meditationReactions,
} from "../src/lib/server/db/schema";

const SEED_EMAIL_DOMAIN = "seed.diamondheart.local";

const DEMO_USERS = [
  { slug: "maya", name: "Maya Chen" },
  { slug: "jordan", name: "Jordan Rivera" },
  { slug: "sam", name: "Sam Okafor" },
  { slug: "priya", name: "Priya Patel" },
  { slug: "lars", name: "Lars Johansson" },
] as const;

const MIN = 60;
const HOUR = 60 * MIN;

// [slug, duration(s), minutesAgo]
const DEMO_SESSIONS: Array<[typeof DEMO_USERS[number]["slug"], number, number]> = [
  ["maya", 1200, 45],
  ["jordan", 600, 3 * 60],
  ["sam", 1800, 6 * 60],
  ["priya", 900, 22 * 60],
  ["maya", 600, 26 * 60],
  ["lars", 1500, 30 * 60],
  ["jordan", 300, 48 * 60],
  ["sam", 900, 3 * 24 * 60],
  ["priya", 1200, 4 * 24 * 60],
  ["maya", 1800, 5 * 24 * 60],
  ["lars", 600, 7 * 24 * 60],
];

// Reactions BETWEEN demo users — never from the real current user, so their
// heart button starts at 0 + "not reacted by me" on every row they see.
// [sessionIndex, reactorSlug]
const DEMO_REACTIONS: Array<[number, typeof DEMO_USERS[number]["slug"]]> = [
  [0, "jordan"],
  [0, "sam"],
  [0, "priya"],
  [1, "maya"],
  [2, "lars"],
  [2, "maya"],
  [3, "sam"],
  [5, "maya"],
  [5, "priya"],
  [5, "jordan"],
];

function userId(slug: string): string {
  return `seed-user-${slug}`;
}

function sessionId(idx: number): string {
  return `seed-session-${idx.toString().padStart(3, "0")}`;
}

function reactionId(sessionIdx: number, reactorSlug: string): string {
  return `seed-reaction-${sessionIdx.toString().padStart(3, "0")}-${reactorSlug}`;
}

async function seed() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  const db = drizzle(neon(url));

  const passwordHash = await bcrypt.hash("seed-only-no-login", 4);
  const now = Date.now();

  // --- users ---
  const existingUsers = await db
    .select({ id: users.id })
    .from(users)
    .where(inArray(users.id, DEMO_USERS.map((u) => userId(u.slug))));
  const existingIds = new Set(existingUsers.map((u) => u.id));

  const newUsers = DEMO_USERS
    .filter((u) => !existingIds.has(userId(u.slug)))
    .map((u) => ({
      id: userId(u.slug),
      email: `${u.slug}@${SEED_EMAIL_DOMAIN}`,
      passwordHash,
      name: u.name,
      avatarUrl: null,
      defaultTimerSeconds: 600,
      role: "user",
    }));
  if (newUsers.length) {
    await db.insert(users).values(newUsers);
    console.log(`  + ${newUsers.length} demo users`);
  } else {
    console.log("  = demo users already exist");
  }

  // --- sessions ---
  const sessionIds = DEMO_SESSIONS.map((_, i) => sessionId(i));
  const existingSessions = await db
    .select({ id: meditationSessions.id })
    .from(meditationSessions)
    .where(inArray(meditationSessions.id, sessionIds));
  const existingSessionIds = new Set(existingSessions.map((s) => s.id));

  const newSessions = DEMO_SESSIONS
    .map(([slug, duration, minutesAgo], i) => ({
      id: sessionId(i),
      userId: userId(slug),
      duration,
      type: duration >= 900 ? "guided" : "breathing",
      notes: null,
      date: new Date(now - minutesAgo * MIN * 1000),
    }))
    .filter((s) => !existingSessionIds.has(s.id));

  if (newSessions.length) {
    await db.insert(meditationSessions).values(newSessions);
    console.log(`  + ${newSessions.length} demo meditation sessions`);
  } else {
    console.log("  = demo sessions already exist");
  }

  // --- reactions ---
  const reactionIds = DEMO_REACTIONS.map(([i, slug]) => reactionId(i, slug));
  const existingReactions = await db
    .select({ id: meditationReactions.id })
    .from(meditationReactions)
    .where(inArray(meditationReactions.id, reactionIds));
  const existingReactionIds = new Set(existingReactions.map((r) => r.id));

  const newReactions = DEMO_REACTIONS
    .map(([i, slug]) => ({
      id: reactionId(i, slug),
      sessionId: sessionId(i),
      userId: userId(slug),
    }))
    .filter((r) => !existingReactionIds.has(r.id));

  if (newReactions.length) {
    await db.insert(meditationReactions).values(newReactions);
    console.log(`  + ${newReactions.length} demo reactions`);
  } else {
    console.log("  = demo reactions already exist");
  }

  void HOUR; // reserved for future session offsets
  console.log("Done.");
}

async function clean() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  const db = drizzle(neon(url));

  const demoIds = DEMO_USERS.map((u) => userId(u.slug));
  // Cascade deletes take care of sessions + reactions.
  const deleted = await db.delete(users).where(inArray(users.id, demoIds)).returning({ id: users.id });
  console.log(`Removed ${deleted.length} demo users (cascade dropped sessions + reactions).`);
}

const mode = process.argv[2] === "clean" ? clean : seed;
mode().catch((err) => {
  console.error(err);
  process.exit(1);
});
