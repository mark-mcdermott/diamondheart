import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { exercises, personalRecords, userPreferences } from "@/db/schema";
import * as entertainment from "@/server/api/entertainment";
import * as feed from "@/server/api/feed";
import * as meditation from "@/server/api/meditation";
import * as workout from "@/server/api/workout";
import { call, createUser, deleteUser, type TestUser } from "./support";

type Failure = { error: string; fields?: Record<string, string[]> };

describe("workout, entertainment and feed", () => {
  let user: TestUser;
  let other: TestUser;
  let exerciseId: string;

  beforeAll(async () => {
    user = await createUser();
    other = await createUser();
    exerciseId = crypto.randomUUID();
    await db.insert(exercises).values({ id: exerciseId, name: "Test Squat", muscleGroup: "legs", isCustom: true, userId: user.id });
  });

  afterAll(async () => {
    await db.delete(exercises).where(eq(exercises.id, exerciseId));
    await deleteUser(user);
    await deleteUser(other);
  });

  it("answer 401 without a session", async () => {
    expect((await call(workout.GET, "/api/workout")).status).toBe(401);
    expect((await call(entertainment.GET, "/api/entertainment")).status).toBe(401);
    expect((await call(feed.GET, "/api/feed")).status).toBe(401);
  });

  it("a workout takes sets, records a personal record, and is finished", async () => {
    const started = await call(workout.workoutList.POST, "/api/workout/workouts", { method: "POST", as: user, body: { name: "Legs" } });
    expect(started.status).toBe(201);
    const w = (started.json as { workout: workout.Workout }).workout;

    const first = await call(workout.sets.POST, "/api/workout/workouts/x/sets", { method: "POST", as: user, params: { id: w.id }, body: { exerciseId, reps: 5, weight: 100 } });
    expect(first.status).toBe(201);
    expect(first.json).toMatchObject({ isPR: true, set: { setNumber: 1, reps: 5, weight: 100, unit: "lbs", exerciseName: "Test Squat" } });

    const lighter = await call(workout.sets.POST, "/api/workout/workouts/x/sets", { method: "POST", as: user, params: { id: w.id }, body: { exerciseId, reps: 5, weight: 90 } });
    expect(lighter.json).toMatchObject({ isPR: false, set: { setNumber: 2 } });

    const heavier = await call(workout.sets.POST, "/api/workout/workouts/x/sets", { method: "POST", as: user, params: { id: w.id }, body: { exerciseId, reps: 5, weight: 110 } });
    expect(heavier.json).toMatchObject({ isPR: true, set: { setNumber: 3 } });
    const prs = await db.select().from(personalRecords).where(eq(personalRecords.userId, user.id));
    expect(prs).toHaveLength(1);
    expect(prs[0].weight).toBe(110);

    // Another user cannot log into this workout, nor use this custom exercise.
    expect((await call(workout.sets.POST, "/api/workout/workouts/x/sets", { method: "POST", as: other, params: { id: w.id }, body: { exerciseId, reps: 1, weight: 1 } })).status).toBe(404);
    const theirs = await workout.startWorkout(other.id, {});
    expect((await call(workout.sets.POST, "/api/workout/workouts/x/sets", { method: "POST", as: other, params: { id: theirs.id }, body: { exerciseId, reps: 1, weight: 1 } })).status).toBe(404);

    const overview = (await call(workout.GET, `/api/workout?active=${w.id}`, { as: user })).json as workout.WorkoutOverview;
    expect(overview.active?.sets).toHaveLength(3);
    expect(overview.exercises.some((e) => e.id === exerciseId)).toBe(true);
    expect(overview.recentWorkouts.map((r) => r.id)).toEqual([w.id]);

    const setId = (first.json as { set: { id: string } }).set.id;
    expect((await call(workout.set.DELETE, "/api/workout/sets/x", { method: "DELETE", as: other, params: { id: setId } })).status).toBe(404);
    expect((await call(workout.set.DELETE, "/api/workout/sets/x", { method: "DELETE", as: user, params: { id: setId } })).status).toBe(204);

    const finished = await call(workout.workout.PATCH, "/api/workout/workouts/x", { method: "PATCH", as: user, params: { id: w.id }, body: { duration: 45, notes: "good" } });
    expect((finished.json as { workout: workout.Workout }).workout).toMatchObject({ duration: 45, notes: "good" });
  });

  it("entertainment items validate, patch partially, and total by type and status", async () => {
    const bad = await call(entertainment.POST, "/api/entertainment", { method: "POST", as: user, body: { type: "movie", title: "Heat", rating: 6 } });
    expect(bad.status).toBe(422);
    expect(Object.keys((bad.json as Failure).fields ?? {})).toEqual(["rating"]);

    const movie = (await call(entertainment.POST, "/api/entertainment", { method: "POST", as: user, body: { type: "movie", title: "Heat", rating: 5, imdbId: "tt0113277" } })).json as { item: entertainment.EntertainmentItem };
    expect(movie.item).toMatchObject({ status: "completed", rating: 5, creator: null });
    await call(entertainment.POST, "/api/entertainment", { method: "POST", as: user, body: { type: "show", title: "Severance", status: "watching" } });

    const patched = await call(entertainment.item.PATCH, "/api/entertainment/x", { method: "PATCH", as: user, params: { id: movie.item.id }, body: { rating: null, notes: "rewatch" } });
    expect((patched.json as { item: entertainment.EntertainmentItem }).item).toMatchObject({ rating: null, notes: "rewatch", title: "Heat" });
    expect((await call(entertainment.item.PATCH, "/api/entertainment/x", { method: "PATCH", as: other, params: { id: movie.item.id }, body: { title: "Mine" } })).status).toBe(404);

    const totals = (await call(entertainment.totalsRoute.GET, "/api/entertainment/totals", { as: user })).json as entertainment.EntertainmentTotals;
    expect(totals.byType.map((t) => t.type).sort()).toEqual(["movie", "show"]);
    expect(totals.byStatus.map((s) => s.status).sort()).toEqual(["completed", "watching"]);
  });

  it("episodes are marked watched idempotently and cleared", async () => {
    const needsSeason = await call(entertainment.episodes.PUT, "/api/entertainment/episodes", { method: "PUT", as: user, body: { seriesImdbId: "tt1", episodeImdbId: "tt1e1", watched: true } });
    expect(needsSeason.status).toBe(422);

    const body = { seriesImdbId: "tt1", episodeImdbId: "tt1e1", watched: true, season: 1, episode: 1, title: "Pilot" };
    const once = (await call(entertainment.episodes.PUT, "/api/entertainment/episodes", { method: "PUT", as: user, body })).json as { episode: entertainment.ShowEpisode };
    const twice = (await call(entertainment.episodes.PUT, "/api/entertainment/episodes", { method: "PUT", as: user, body })).json as { episode: entertainment.ShowEpisode };
    expect(twice.episode.id).toBe(once.episode.id);

    const list = (await call(entertainment.episodes.GET, "/api/entertainment/episodes?series=tt1", { as: user })).json as { episodes: unknown[] };
    expect(list.episodes).toHaveLength(1);
    expect(((await call(entertainment.episodes.GET, "/api/entertainment/episodes?series=tt1", { as: other })).json as { episodes: unknown[] }).episodes).toEqual([]);

    const cleared = (await call(entertainment.episodes.PUT, "/api/entertainment/episodes", { method: "PUT", as: user, body: { seriesImdbId: "tt1", episodeImdbId: "tt1e1", watched: false } })).json as { episode: null };
    expect(cleared.episode).toBeNull();
  });

  it("the feed shows others' sessions unless they opted out, and reactions are explicit", async () => {
    const theirs = await meditation.createSession(other.id, { duration: 600 });
    await meditation.createSession(user.id, { duration: 300 });

    const mine = (await call(feed.GET, "/api/feed", { as: user })).json as { items: feed.FeedItem[] };
    expect(mine.items.map((i) => i.sessionId)).toEqual([theirs.id]);
    expect(mine.items[0]).toMatchObject({ reactionCount: 0, reactedByMe: false });

    const on = (await call(feed.reaction.PUT, "/api/feed/reactions/x", { method: "PUT", as: user, params: { sessionId: theirs.id }, body: { reacted: true } })).json;
    expect(on).toEqual({ reacted: true, reactionCount: 1 });
    const again = (await call(feed.reaction.PUT, "/api/feed/reactions/x", { method: "PUT", as: user, params: { sessionId: theirs.id }, body: { reacted: true } })).json;
    expect(again).toEqual({ reacted: true, reactionCount: 1 });
    const off = (await call(feed.reaction.PUT, "/api/feed/reactions/x", { method: "PUT", as: user, params: { sessionId: theirs.id }, body: { reacted: false } })).json;
    expect(off).toEqual({ reacted: false, reactionCount: 0 });
    expect((await call(feed.reaction.PUT, "/api/feed/reactions/x", { method: "PUT", as: user, params: { sessionId: "nope" }, body: { reacted: true } })).status).toBe(404);

    await db.insert(userPreferences).values({ id: crypto.randomUUID(), userId: other.id, showMeditationInFeed: false });
    const hidden = (await call(feed.GET, "/api/feed", { as: user })).json as { items: unknown[] };
    expect(hidden.items).toEqual([]);
  });
});
