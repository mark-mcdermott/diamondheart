import { randomUUID } from "crypto";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import {
  appointments,
  customFoods,
  entertainmentItems,
  exercises,
  favoriteFoods,
  favoriteMealItems,
  favoriteMeals,
  foodLog,
  foodLogItems,
  integrationConnections,
  medicalLogs,
  meditationPresets,
  meditationSessions,
  meditationStyles,
  notifications,
  personalRecords,
  reminderSchedules,
  showEpisodes,
  trackerEntries,
  trackerMetrics,
  trackingItems,
  userPreferences,
  workoutSets,
  workouts,
} from "../src/lib/server/db/schema";
import { eq } from "drizzle-orm";

type Db = NeonHttpDatabase<Record<string, unknown>>;

const DAY_MS = 86_400_000;

function daysAgo(n: number, hour = 12, minute = 0): Date {
  const d = new Date(Date.now() - n * DAY_MS);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function pick<T>(arr: readonly T[], idx: number): T {
  return arr[idx % arr.length];
}

// --------------------------------------------------------------------------
// Built-in exercises (global — shared across all users)
// --------------------------------------------------------------------------

const BUILT_IN_EXERCISES = [
  { name: "Bench Press", muscleGroup: "chest", equipment: "barbell" },
  { name: "Incline Dumbbell Press", muscleGroup: "chest", equipment: "dumbbell" },
  { name: "Push-Up", muscleGroup: "chest", equipment: "bodyweight" },
  { name: "Pull-Up", muscleGroup: "back", equipment: "bodyweight" },
  { name: "Barbell Row", muscleGroup: "back", equipment: "barbell" },
  { name: "Deadlift", muscleGroup: "back", equipment: "barbell" },
  { name: "Lat Pulldown", muscleGroup: "back", equipment: "cable" },
  { name: "Back Squat", muscleGroup: "legs", equipment: "barbell" },
  { name: "Front Squat", muscleGroup: "legs", equipment: "barbell" },
  { name: "Romanian Deadlift", muscleGroup: "legs", equipment: "barbell" },
  { name: "Leg Press", muscleGroup: "legs", equipment: "machine" },
  { name: "Walking Lunge", muscleGroup: "legs", equipment: "dumbbell" },
  { name: "Overhead Press", muscleGroup: "shoulders", equipment: "barbell" },
  { name: "Lateral Raise", muscleGroup: "shoulders", equipment: "dumbbell" },
  { name: "Face Pull", muscleGroup: "shoulders", equipment: "cable" },
  { name: "Barbell Curl", muscleGroup: "arms", equipment: "barbell" },
  { name: "Tricep Rope Pushdown", muscleGroup: "arms", equipment: "cable" },
  { name: "Hammer Curl", muscleGroup: "arms", equipment: "dumbbell" },
  { name: "Plank", muscleGroup: "core", equipment: "bodyweight" },
  { name: "Hanging Leg Raise", muscleGroup: "core", equipment: "bodyweight" },
];

export async function seedBuiltInExercises(db: Db): Promise<Map<string, string>> {
  const existing = await db
    .select()
    .from(exercises)
    .where(eq(exercises.isCustom, false));

  const byName = new Map<string, string>();
  for (const e of existing) byName.set(e.name, e.id);

  for (const ex of BUILT_IN_EXERCISES) {
    if (byName.has(ex.name)) continue;
    const id = randomUUID();
    await db.insert(exercises).values({
      id,
      name: ex.name,
      muscleGroup: ex.muscleGroup,
      equipment: ex.equipment,
      isCustom: false,
      userId: null,
    });
    byName.set(ex.name, id);
  }
  return byName;
}

// --------------------------------------------------------------------------
// Per-user demo data
// --------------------------------------------------------------------------

export async function seedDemoDataForUser(
  db: Db,
  userId: string,
  exerciseIdsByName: Map<string, string>,
): Promise<void> {
  await seedUserPreferences(db, userId);
  await seedTrackerEntries(db, userId);
  await seedMeditation(db, userId);
  await seedFood(db, userId);
  await seedWorkouts(db, userId, exerciseIdsByName);
  await seedTrackingItems(db, userId);
  await seedMedicalLogs(db, userId);
  await seedAppointments(db, userId);
  await seedEntertainment(db, userId);
  await seedNotifications(db, userId);
  await seedReminders(db, userId);
  await seedIntegrations(db, userId);
}

async function seedUserPreferences(db: Db, userId: string) {
  await db
    .insert(userPreferences)
    .values({
      id: randomUUID(),
      userId,
      useNetflixUI: true,
      showSiteName: true,
      dashboardSections: ["goals", "counters", "food", "recent"],
    })
    .onConflictDoNothing();
}

async function seedTrackerEntries(db: Db, userId: string) {
  void userId; // trackerEntries are linked via metricId, not userId directly
  const metrics = await db.select().from(trackerMetrics);
  const bySlug = new Map(metrics.map((m) => [m.slug, m]));

  // Realistic ranges for 14 days
  const daily: Record<string, () => number> = {
    meditation: () => 10 + Math.floor(Math.random() * 15),
    "exercise-minutes": () => 20 + Math.floor(Math.random() * 45),
    steps: () => 6000 + Math.floor(Math.random() * 6000),
    weight: () => 77 + Math.random() * 1.5,
    "sleep-duration": () => 6.5 + Math.random() * 1.8,
    "sleep-balance": () => -10 + Math.floor(Math.random() * 30),
    water: () => 5 + Math.floor(Math.random() * 4),
    journal: () => Math.random() > 0.3 ? 1 : 0,
    stretching: () => 5 + Math.floor(Math.random() * 10),
  };

  for (const [slug, gen] of Object.entries(daily)) {
    const metric = bySlug.get(slug);
    if (!metric) continue;
    for (let i = 0; i < 14; i++) {
      const date = daysAgo(i, 9, 30);
      const raw = gen();
      const value =
        metric.valueType === "number" ? raw.toFixed(1) : String(Math.round(raw));
      await db.insert(trackerEntries).values({
        id: randomUUID(),
        metricId: metric.id,
        value,
        date,
      });
    }
  }
}

async function seedMeditation(db: Db, userId: string) {
  const styleDefs = [
    { label: "Guided", iconName: "brain", sortOrder: 0 },
    { label: "Breathing", iconName: "wind", sortOrder: 1 },
    { label: "Body Scan", iconName: "user-round", sortOrder: 2 },
  ];
  for (const s of styleDefs) {
    await db.insert(meditationStyles).values({
      id: randomUUID(),
      userId,
      label: s.label,
      iconName: s.iconName,
      sortOrder: s.sortOrder,
    });
  }

  const presetDefs = [
    { label: "5 min", seconds: 300, sortOrder: 0 },
    { label: "10 min", seconds: 600, sortOrder: 1 },
    { label: "15 min", seconds: 900, sortOrder: 2 },
    { label: "20 min", seconds: 1200, sortOrder: 3 },
    { label: "30 min", seconds: 1800, sortOrder: 4 },
  ];
  for (const p of presetDefs) {
    await db.insert(meditationPresets).values({
      id: randomUUID(),
      userId,
      label: p.label,
      seconds: p.seconds,
      sortOrder: p.sortOrder,
    });
  }

  const sessionTypes = ["guided", "breathing"] as const;
  const sampleNotes = [
    null,
    "Felt grounded afterwards.",
    "Busy mind today.",
    "Deep calm near the end.",
    null,
  ];
  for (let i = 0; i < 12; i++) {
    await db.insert(meditationSessions).values({
      id: randomUUID(),
      userId,
      duration: pick([300, 600, 900, 1200], i),
      type: pick(sessionTypes, i),
      notes: pick(sampleNotes, i),
      date: daysAgo(i * 2 + 1, 7, 15),
    });
  }
}

async function seedFood(db: Db, userId: string) {
  const customIds: string[] = [];
  const customs = [
    { name: "Overnight Oats", calories: 340, protein: 14, carbs: 52, fat: 9 },
    { name: "Chicken Rice Bowl", calories: 620, protein: 48, carbs: 70, fat: 14 },
    { name: "Protein Smoothie", calories: 280, protein: 28, carbs: 30, fat: 5 },
  ];
  for (const c of customs) {
    const id = randomUUID();
    customIds.push(id);
    await db.insert(customFoods).values({ id, userId, ...c });
  }

  const favFoods = [
    { name: "Greek Yogurt", calories: 100, protein: 17, carbs: 6, fat: 0 },
    { name: "Banana", calories: 105, protein: 1, carbs: 27, fat: 0 },
    { name: "Almonds", calories: 170, protein: 6, carbs: 6, fat: 15 },
    { name: "Eggs (2)", calories: 140, protein: 12, carbs: 1, fat: 10 },
    { name: "Brown Rice", calories: 220, protein: 5, carbs: 46, fat: 2 },
  ];
  for (const f of favFoods) {
    await db.insert(favoriteFoods).values({ id: randomUUID(), userId, ...f });
  }

  const mealId = randomUUID();
  await db
    .insert(favoriteMeals)
    .values({ id: mealId, userId, name: "Post-Workout Stack" });
  await db.insert(favoriteMealItems).values([
    {
      id: randomUUID(),
      favoriteMealId: mealId,
      name: "Protein Smoothie",
      calories: 280,
      protein: 28,
      carbs: 30,
      fat: 5,
      quantity: 1,
    },
    {
      id: randomUUID(),
      favoriteMealId: mealId,
      name: "Banana",
      calories: 105,
      protein: 1,
      carbs: 27,
      fat: 0,
      quantity: 1,
    },
  ]);

  const meals: {
    mealType: string;
    daysAgo: number;
    items: { name: string; calories: number; protein: number; carbs: number; fat: number }[];
  }[] = [
    // Today
    {
      mealType: "breakfast",
      daysAgo: 0,
      items: [
        { name: "Overnight Oats", calories: 340, protein: 14, carbs: 52, fat: 9 },
        { name: "Greek Yogurt", calories: 100, protein: 17, carbs: 6, fat: 0 },
        { name: "Banana", calories: 105, protein: 1, carbs: 27, fat: 0 },
      ],
    },
    {
      mealType: "lunch",
      daysAgo: 0,
      items: [
        { name: "Chicken Rice Bowl", calories: 620, protein: 48, carbs: 70, fat: 14 },
        { name: "Side Salad", calories: 85, protein: 3, carbs: 8, fat: 5 },
      ],
    },
    {
      mealType: "snack",
      daysAgo: 0,
      items: [
        { name: "Almonds", calories: 170, protein: 6, carbs: 6, fat: 15 },
        { name: "Apple", calories: 95, protein: 0, carbs: 25, fat: 0 },
      ],
    },
    {
      mealType: "dinner",
      daysAgo: 0,
      items: [
        { name: "Salmon", calories: 380, protein: 40, carbs: 0, fat: 22 },
        { name: "Brown Rice", calories: 220, protein: 5, carbs: 46, fat: 2 },
        { name: "Broccoli", calories: 55, protein: 4, carbs: 11, fat: 1 },
      ],
    },
    // Yesterday
    {
      mealType: "breakfast",
      daysAgo: 1,
      items: [
        { name: "Eggs (2)", calories: 140, protein: 12, carbs: 1, fat: 10 },
        { name: "Toast", calories: 130, protein: 4, carbs: 24, fat: 2 },
        { name: "Orange Juice", calories: 110, protein: 2, carbs: 26, fat: 0 },
      ],
    },
    {
      mealType: "lunch",
      daysAgo: 1,
      items: [
        { name: "Turkey Sandwich", calories: 420, protein: 28, carbs: 38, fat: 16 },
        { name: "Chips", calories: 150, protein: 2, carbs: 15, fat: 10 },
      ],
    },
    {
      mealType: "dinner",
      daysAgo: 1,
      items: [
        { name: "Pasta with Marinara", calories: 480, protein: 14, carbs: 82, fat: 8 },
        { name: "Garlic Bread", calories: 200, protein: 4, carbs: 24, fat: 10 },
      ],
    },
  ];

  for (const m of meals) {
    const logId = randomUUID();
    await db.insert(foodLog).values({
      id: logId,
      userId,
      date: daysAgo(m.daysAgo, 9 + m.daysAgo, 0),
      mealType: m.mealType,
    });
    for (const item of m.items) {
      await db.insert(foodLogItems).values({
        id: randomUUID(),
        foodLogId: logId,
        ...item,
        servingSize: 100,
        servingUnit: "g",
        quantity: 1,
      });
    }
  }
}

async function seedWorkouts(
  db: Db,
  userId: string,
  exerciseIdsByName: Map<string, string>,
) {
  const benchId = exerciseIdsByName.get("Bench Press")!;
  const squatId = exerciseIdsByName.get("Back Squat")!;
  const deadId = exerciseIdsByName.get("Deadlift")!;
  const rowId = exerciseIdsByName.get("Barbell Row")!;
  const pullupId = exerciseIdsByName.get("Pull-Up")!;
  const ohpId = exerciseIdsByName.get("Overhead Press")!;

  const sessions: {
    name: string;
    daysAgo: number;
    sets: { exerciseId: string; reps: number; weight: number; setNumber: number }[];
  }[] = [
    {
      name: "Push Day",
      daysAgo: 1,
      sets: [
        { exerciseId: benchId, reps: 8, weight: 185, setNumber: 1 },
        { exerciseId: benchId, reps: 8, weight: 185, setNumber: 2 },
        { exerciseId: benchId, reps: 6, weight: 195, setNumber: 3 },
        { exerciseId: ohpId, reps: 10, weight: 105, setNumber: 1 },
        { exerciseId: ohpId, reps: 10, weight: 105, setNumber: 2 },
      ],
    },
    {
      name: "Pull Day",
      daysAgo: 3,
      sets: [
        { exerciseId: deadId, reps: 5, weight: 315, setNumber: 1 },
        { exerciseId: deadId, reps: 5, weight: 325, setNumber: 2 },
        { exerciseId: rowId, reps: 8, weight: 155, setNumber: 1 },
        { exerciseId: pullupId, reps: 8, weight: 0, setNumber: 1 },
      ],
    },
    {
      name: "Leg Day",
      daysAgo: 5,
      sets: [
        { exerciseId: squatId, reps: 5, weight: 255, setNumber: 1 },
        { exerciseId: squatId, reps: 5, weight: 265, setNumber: 2 },
        { exerciseId: squatId, reps: 3, weight: 275, setNumber: 3 },
      ],
    },
    {
      name: "Push Day",
      daysAgo: 8,
      sets: [
        { exerciseId: benchId, reps: 8, weight: 180, setNumber: 1 },
        { exerciseId: benchId, reps: 8, weight: 180, setNumber: 2 },
      ],
    },
  ];

  for (const s of sessions) {
    const workoutId = randomUUID();
    await db.insert(workouts).values({
      id: workoutId,
      userId,
      name: s.name,
      date: daysAgo(s.daysAgo, 18, 0),
      duration: 45 + s.sets.length * 3,
    });
    for (const st of s.sets) {
      await db.insert(workoutSets).values({
        id: randomUUID(),
        workoutId,
        exerciseId: st.exerciseId,
        setNumber: st.setNumber,
        reps: st.reps,
        weight: st.weight,
        unit: "lbs",
        type: "regular",
      });
    }
  }

  // Personal records
  const prs = [
    { exerciseId: benchId, repCount: 1, weight: 205, daysAgo: 20 },
    { exerciseId: squatId, repCount: 1, weight: 285, daysAgo: 14 },
    { exerciseId: deadId, repCount: 1, weight: 345, daysAgo: 10 },
    { exerciseId: ohpId, repCount: 1, weight: 125, daysAgo: 25 },
  ];
  for (const pr of prs) {
    await db.insert(personalRecords).values({
      id: randomUUID(),
      userId,
      exerciseId: pr.exerciseId,
      repCount: pr.repCount,
      weight: pr.weight,
      unit: "lbs",
      date: daysAgo(pr.daysAgo, 18, 0),
    });
  }
}

async function seedTrackingItems(db: Db, userId: string) {
  const items = [
    { name: "Coffee shops visited", category: "Places", count: 23, icon: "coffee" },
    { name: "Restaurants tried", category: "Places", count: 31, icon: "utensils" },
    { name: "Parks explored", category: "Places", count: 9, icon: "trees" },
    { name: "Libraries visited", category: "Places", count: 5, icon: "library" },
    { name: "Books read", category: "Learning", count: 12, icon: "book" },
    { name: "Online courses", category: "Learning", count: 4, icon: "graduation-cap" },
    { name: "Podcasts finished", category: "Learning", count: 27, icon: "headphones" },
    { name: "Languages studied", category: "Learning", count: 2, icon: "languages" },
    { name: "Countries visited", category: "Travel", count: 8, icon: "globe" },
    { name: "Flights taken", category: "Travel", count: 14, icon: "plane" },
    { name: "Road trips", category: "Travel", count: 5, icon: "car" },
    { name: "National parks", category: "Travel", count: 6, icon: "mountain" },
    { name: "Concerts attended", category: "Experiences", count: 5, icon: "music" },
    { name: "Museums visited", category: "Experiences", count: 11, icon: "landmark" },
    { name: "Cooking classes", category: "Experiences", count: 3, icon: "chef-hat" },
    { name: "Escape rooms", category: "Experiences", count: 4, icon: "key" },
    { name: "Hikes completed", category: "Outdoors", count: 14, icon: "mountain" },
    { name: "Bike rides", category: "Outdoors", count: 22, icon: "bike" },
    { name: "Camping trips", category: "Outdoors", count: 3, icon: "tent" },
    { name: "Sunrise watches", category: "Outdoors", count: 7, icon: "sunrise" },
    { name: "Blood donations", category: "Health", count: 3, icon: "droplet" },
    { name: "Dental cleanings", category: "Health", count: 4, icon: "sparkles" },
    { name: "Flu shots", category: "Health", count: 2, icon: "syringe" },
    { name: "Eye exams", category: "Health", count: 3, icon: "eye" },
  ];
  for (const t of items) {
    await db.insert(trackingItems).values({
      id: randomUUID(),
      userId,
      ...t,
    });
  }
}

async function seedMedicalLogs(db: Db, userId: string) {
  const logs = [
    { type: "medication", subtype: "vitamin-d", severity: null, notes: "2000 IU", daysAgo: 0 },
    { type: "medication", subtype: "vitamin-d", severity: null, notes: "2000 IU", daysAgo: 1 },
    { type: "symptom", subtype: "headache", severity: 3, notes: "Afternoon, caffeine helped", daysAgo: 2 },
    { type: "bathroom", subtype: "poop", severity: null, notes: null, daysAgo: 0 },
    { type: "bathroom", subtype: "poop", severity: null, notes: null, daysAgo: 1 },
    { type: "sick", subtype: "cold", severity: 2, notes: "Started feeling rundown", daysAgo: 12 },
    { type: "doctor", subtype: "annual-physical", severity: null, notes: "Bloodwork scheduled", daysAgo: 30 },
  ];
  for (const l of logs) {
    await db.insert(medicalLogs).values({
      id: randomUUID(),
      userId,
      type: l.type,
      subtype: l.subtype,
      severity: l.severity,
      notes: l.notes,
      date: daysAgo(l.daysAgo, 8, 0),
    });
  }
}

async function seedAppointments(db: Db, userId: string) {
  const upcoming = [
    {
      title: "Dentist Cleaning",
      appointmentType: "dentist",
      provider: "Dr. Reyes",
      location: "Austin Smiles",
      daysAgo: -14,
      duration: 45,
      status: "upcoming",
    },
    {
      title: "Annual Physical",
      appointmentType: "doctor",
      provider: "Dr. Chen",
      location: "Heart of Austin Medical",
      daysAgo: -28,
      duration: 60,
      status: "upcoming",
    },
  ];
  const past = [
    {
      title: "Eye Exam",
      appointmentType: "optometrist",
      provider: "Dr. Nguyen",
      location: "Clear Vision Austin",
      daysAgo: 45,
      duration: 30,
      status: "completed",
      followUp: "Update glasses prescription",
    },
    {
      title: "Dermatologist Check",
      appointmentType: "dermatologist",
      provider: "Dr. Patel",
      location: "Skin Institute",
      daysAgo: 90,
      duration: 30,
      status: "completed",
    },
  ];

  for (const a of [...upcoming, ...past]) {
    await db.insert(appointments).values({
      id: randomUUID(),
      userId,
      title: a.title,
      appointmentType: a.appointmentType,
      provider: a.provider,
      location: a.location,
      date: daysAgo(a.daysAgo, 10, 0),
      durationMinutes: a.duration,
      status: a.status,
      followUp: "followUp" in a ? a.followUp : null,
    });
  }
}

async function fetchOmdbPoster(imdbId: string): Promise<string | null> {
  const apiKey = process.env.OMDB_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch(`https://www.omdbapi.com/?i=${imdbId}&apikey=${apiKey}`);
    const data = await res.json();
    return data.Poster && data.Poster !== "N/A" ? data.Poster : null;
  } catch {
    return null;
  }
}

async function seedEntertainment(db: Db, userId: string) {
  const items: {
    type: string;
    title: string;
    status: string;
    rating: number | null;
    imdbId: string;
    releaseDate: string;
    runtime?: number;
    genres: string;
    seasonCount?: number;
    voteAverage: string;
  }[] = [
    { type: "movie", title: "Inception", status: "completed", rating: 5, imdbId: "tt1375666", releaseDate: "2010-07-16", runtime: 148, genres: "Action, Adventure, Sci-Fi", voteAverage: "8.8" },
    { type: "movie", title: "The Grand Budapest Hotel", status: "completed", rating: 4, imdbId: "tt2278388", releaseDate: "2014-03-28", runtime: 99, genres: "Adventure, Comedy, Crime", voteAverage: "8.1" },
    { type: "movie", title: "Dune: Part Two", status: "queued", rating: null, imdbId: "tt15239678", releaseDate: "2024-03-01", runtime: 166, genres: "Action, Adventure, Drama", voteAverage: "8.5" },
    { type: "show", title: "Breaking Bad", status: "watching", rating: 5, imdbId: "tt0903747", releaseDate: "2008-01-20", genres: "Crime, Drama, Thriller", seasonCount: 5, voteAverage: "9.5" },
    { type: "show", title: "Severance", status: "watching", rating: 5, imdbId: "tt11280740", releaseDate: "2022-02-18", genres: "Drama, Mystery, Sci-Fi", seasonCount: 2, voteAverage: "8.7" },
    { type: "show", title: "The Bear", status: "completed", rating: 4, imdbId: "tt14452776", releaseDate: "2022-06-23", genres: "Comedy, Drama", seasonCount: 3, voteAverage: "8.6" },
    { type: "show", title: "The Last of Us", status: "queued", rating: null, imdbId: "tt3581920", releaseDate: "2023-01-15", genres: "Action, Adventure, Drama", seasonCount: 2, voteAverage: "8.6" },
  ];

  for (const it of items) {
    const posterUrl = await fetchOmdbPoster(it.imdbId);
    await db.insert(entertainmentItems).values({
      id: randomUUID(),
      userId,
      type: it.type,
      title: it.title,
      status: it.status,
      rating: it.rating,
      imdbId: it.imdbId,
      posterUrl,
      releaseDate: it.releaseDate,
      runtime: it.runtime ?? null,
      genres: it.genres,
      seasonCount: it.seasonCount ?? null,
      voteAverage: it.voteAverage,
    });
  }

  // Mark Breaking Bad S1 as watched
  const bbEpisodes = [
    { imdbId: "tt0959621", title: "Pilot", episode: 1, airDate: "2008-01-20" },
    { imdbId: "tt1054724", title: "Cat's in the Bag...", episode: 2, airDate: "2008-01-27" },
    { imdbId: "tt1054725", title: "...And the Bag's in the River", episode: 3, airDate: "2008-02-10" },
    { imdbId: "tt1054726", title: "Cancer Man", episode: 4, airDate: "2008-02-17" },
    { imdbId: "tt1054727", title: "Gray Matter", episode: 5, airDate: "2008-02-24" },
  ];
  for (const ep of bbEpisodes) {
    await db.insert(showEpisodes).values({
      id: randomUUID(),
      userId,
      seriesImdbId: "tt0903747",
      episodeImdbId: ep.imdbId,
      season: 1,
      episode: ep.episode,
      title: ep.title,
      airDate: ep.airDate,
    });
  }
}

async function seedNotifications(db: Db, userId: string) {
  const items: {
    type: string;
    title: string;
    body: string;
    href: string;
    read: boolean;
    daysAgo: number;
  }[] = [
    {
      type: "new_episode",
      title: "New Severance episode available",
      body: "Season 2, Episode 7 just dropped.",
      href: "/entertainment",
      read: false,
      daysAgo: 0,
    },
    {
      type: "reminder",
      title: "Meditation reminder",
      body: "Your evening session is in 15 minutes.",
      href: "/meditate",
      read: false,
      daysAgo: 0,
    },
    {
      type: "release_date",
      title: "The Last of Us returns",
      body: "Next season drops this week.",
      href: "/entertainment",
      read: true,
      daysAgo: 3,
    },
    {
      type: "reminder",
      title: "Weekly workout check-in",
      body: "You've hit 3 workouts — nice streak.",
      href: "/workout",
      read: true,
      daysAgo: 5,
    },
  ];
  for (const n of items) {
    await db.insert(notifications).values({
      id: randomUUID(),
      userId,
      type: n.type,
      title: n.title,
      body: n.body,
      href: n.href,
      read: n.read,
    });
  }
}

async function seedReminders(db: Db, userId: string) {
  const metrics = await db.select().from(trackerMetrics);
  const meditationMetric = metrics.find((m) => m.slug === "meditation");
  const waterMetric = metrics.find((m) => m.slug === "water");

  if (meditationMetric) {
    await db.insert(reminderSchedules).values({
      id: randomUUID(),
      userId,
      metricId: meditationMetric.id,
      label: "Morning meditation",
      time: "07:00",
      days: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
    });
  }
  if (waterMetric) {
    await db.insert(reminderSchedules).values({
      id: randomUUID(),
      userId,
      metricId: waterMetric.id,
      label: "Drink water",
      time: "14:00",
      days: ["mon", "tue", "wed", "thu", "fri"],
    });
  }
}

async function seedIntegrations(db: Db, userId: string) {
  // A "connected" Oura stub so the integrations page isn't empty
  await db.insert(integrationConnections).values({
    id: randomUUID(),
    userId,
    service: "oura",
    accessToken: "seed-token-placeholder",
    status: "active",
    lastSyncAt: daysAgo(0, 6, 0),
    scopes: "daily",
    metadata: { seed: true },
  });
}
