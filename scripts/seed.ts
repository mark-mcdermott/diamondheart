import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { users, trackerCategories, trackerMetrics, userNavItems } from "../src/lib/server/db/schema";
import { hash } from "bcryptjs";
import { randomUUID, randomBytes } from "crypto";
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

const seedUsers = [
  // Admin users
  { email: "admin@diamondheart.app",              name: "Admin",             role: "admin" },
  { email: "mark@markmcdermott.io",               name: "Mark McDermott",    role: "admin" },

  // Regular test user
  { email: "user@diamondheart.app",               name: "Test User",         role: "user" },

  // Office users
  { email: "michael.scott@dundermifflin.com",      name: "Michael Scott",     role: "user" },
  { email: "dwight.schrute@dundermifflin.com",     name: "Dwight Schrute",    role: "user" },
  { email: "jim.halpert@dundermifflin.com",        name: "Jim Halpert",       role: "user" },
  { email: "pam.beesly@dundermifflin.com",         name: "Pam Beesly",       role: "user" },
  { email: "ryan.howard@dundermifflin.com",        name: "Ryan Howard",       role: "user" },
  { email: "andy.bernard@dundermifflin.com",       name: "Andy Bernard",      role: "user" },
  { email: "angela.martin@dundermifflin.com",      name: "Angela Martin",     role: "user" },
  { email: "kevin.malone@dundermifflin.com",       name: "Kevin Malone",      role: "user" },
  { email: "oscar.martinez@dundermifflin.com",     name: "Oscar Martinez",    role: "user" },
  { email: "stanley.hudson@dundermifflin.com",     name: "Stanley Hudson",    role: "user" },
  { email: "phyllis.vance@dundermifflin.com",      name: "Phyllis Vance",     role: "user" },
  { email: "meredith.palmer@dundermifflin.com",    name: "Meredith Palmer",   role: "user" },
  { email: "creed.bratton@dundermifflin.com",      name: "Creed Bratton",     role: "user" },
  { email: "kelly.kapoor@dundermifflin.com",       name: "Kelly Kapoor",      role: "user" },
  { email: "toby.flenderson@dundermifflin.com",    name: "Toby Flenderson",   role: "user" },
  { email: "darryl.philbin@dundermifflin.com",     name: "Darryl Philbin",    role: "user" },
  { email: "erin.hannon@dundermifflin.com",        name: "Erin Hannon",       role: "user" },
  { email: "gabe.lewis@dundermifflin.com",         name: "Gabe Lewis",        role: "user" },
  { email: "holly.flax@dundermifflin.com",         name: "Holly Flax",        role: "user" },
  { email: "jan.levinson@dundermifflin.com",       name: "Jan Levinson",      role: "user" },
];

const seedCategories = [
  { id: "cat-general",   name: "General",   slug: "default",   description: null,                                    icon: null,               color: null,      sortOrder: "0" },
  { id: "cat-activity",  name: "Activity",  slug: "activity",  description: "Daily movement, steps, and exercise metrics", icon: "activity",    color: "#22c55e", sortOrder: "0" },
  { id: "cat-heart",     name: "Heart",     slug: "heart",     description: "Heart rate and cardiovascular metrics",       icon: "heart",       color: "#ef4444", sortOrder: "1" },
  { id: "cat-sleep",     name: "Sleep",     slug: "sleep",     description: "Sleep duration, stages, and quality",         icon: "moon",        color: "#8b5cf6", sortOrder: "2" },
  { id: "cat-body",      name: "Body",      slug: "body",      description: "Body measurements and vitals",               icon: "thermometer", color: "#f97316", sortOrder: "3" },
  { id: "cat-readiness", name: "Readiness", slug: "readiness", description: "Recovery and readiness scores",              icon: "battery-charging", color: "#06b6d4", sortOrder: "4" },
];

// Metrics in current production order (sort_order matches current DB state)
const seedMetrics = [
  // ON metrics (positions 0-4, plus Sleep Duration at 51)
  { name: "meditation",         slug: "meditation",        description: null,                                    unit: "min",       valueType: "int",    dailyGoal: 1,    icon: "Flower2",           categorySlug: "default",   sortOrder: "0",  hidden: false, counter: true },
  { name: "Exercise Minutes",   slug: "exercise-minutes",  description: "Minutes of exercise",                   unit: "min",       valueType: "int",    dailyGoal: null, icon: "Timer",             categorySlug: "activity",  sortOrder: "1",  hidden: false },
  { name: "Steps",              slug: "steps",             description: "Total steps taken",                     unit: "steps",     valueType: "int",    dailyGoal: null, icon: "Footprints",        categorySlug: "activity",  sortOrder: "2",  hidden: false },
  { name: "Weight",             slug: "weight",            description: "Body weight (manual or smart scale)",   unit: "kg",        valueType: "number", dailyGoal: null, icon: "Scale",             categorySlug: "body",      sortOrder: "3",  hidden: false },
  { name: "Sleep Balance",      slug: "sleep-balance",     description: "Sleep debt indicator",                  unit: null,        valueType: "int",    dailyGoal: null, icon: "Equal",             categorySlug: "readiness", sortOrder: "4",  hidden: false },

  // OFF metrics (positions 5-50)
  { name: "Activity Balance",         slug: "activity-balance",        description: "Activity vs rest balance",                      unit: null,        valueType: "int",    dailyGoal: null, icon: "GitMerge",         categorySlug: "readiness", sortOrder: "5",  hidden: true },
  { name: "Stand Hours",              slug: "stand-hours",             description: "Hours with standing activity",                  unit: "hours",     valueType: "int",    dailyGoal: null, icon: "ArrowUpFromLine",  categorySlug: "activity",  sortOrder: "6",  hidden: true },
  { name: "HRV Balance",              slug: "hrv-balance",             description: "Oura HRV balance metric",                      unit: null,        valueType: "number", dailyGoal: null, icon: "Orbit",            categorySlug: "heart",     sortOrder: "7",  hidden: true },
  { name: "Recovery Index",           slug: "recovery-index",          description: "How well recovered you are",                   unit: null,        valueType: "int",    dailyGoal: null, icon: "RefreshCcw",       categorySlug: "readiness", sortOrder: "8",  hidden: true },
  { name: "REM Sleep",                slug: "rem-sleep",               description: "Time in REM sleep stage",                      unit: "min",       valueType: "int",    dailyGoal: null, icon: "Brain",            categorySlug: "sleep",     sortOrder: "9",  hidden: true },
  { name: "Body Fat",                 slug: "body-fat",                description: "Body fat percentage",                           unit: "%",         valueType: "number", dailyGoal: null, icon: "PieChart",         categorySlug: "body",      sortOrder: "10", hidden: true },
  { name: "Mindful Minutes",          slug: "mindful-minutes",         description: "Time spent in mindfulness",                    unit: "min",       valueType: "int",    dailyGoal: null, icon: "Leaf",             categorySlug: "readiness", sortOrder: "11", hidden: true },
  { name: "Active Energy",            slug: "active-energy",           description: "Calories burned from activity",                 unit: "kcal",      valueType: "int",    dailyGoal: null, icon: "Flame",            categorySlug: "activity",  sortOrder: "12", hidden: true },
  { name: "Flights Climbed",          slug: "flights-climbed",         description: "Floors climbed",                                unit: "flights",   valueType: "int",    dailyGoal: null, icon: "TrendingUp",       categorySlug: "activity",  sortOrder: "13", hidden: true },
  { name: "VO2 Max",                  slug: "vo2-max",                 description: "Cardio fitness level",                          unit: "mL/kg/min", valueType: "number", dailyGoal: null, icon: "Wind",             categorySlug: "heart",     sortOrder: "14", hidden: true },
  { name: "Time in Bed",              slug: "time-in-bed",             description: "Total time in bed",                             unit: "hours",     valueType: "number", dailyGoal: null, icon: "Bed",              categorySlug: "sleep",     sortOrder: "15", hidden: true },
  { name: "Deep Sleep",               slug: "deep-sleep",              description: "Time in deep sleep stage",                      unit: "min",       valueType: "int",    dailyGoal: null, icon: "MoonStar",         categorySlug: "sleep",     sortOrder: "16", hidden: true },
  { name: "Walking Speed",            slug: "walking-speed",           description: "Average walking speed",                         unit: "km/h",      valueType: "number", dailyGoal: null, icon: "Gauge",            categorySlug: "activity",  sortOrder: "17", hidden: true },
  { name: "Light Sleep",              slug: "light-sleep",             description: "Time in light sleep stage",                     unit: "min",       valueType: "int",    dailyGoal: null, icon: "CloudMoon",        categorySlug: "sleep",     sortOrder: "18", hidden: true },
  { name: "Sleep Efficiency",         slug: "sleep-efficiency",        description: "Percentage of time in bed spent sleeping",      unit: "%",         valueType: "int",    dailyGoal: null, icon: "Percent",          categorySlug: "sleep",     sortOrder: "19", hidden: true },
  { name: "Cardio Recovery",          slug: "cardio-recovery",         description: "Heart rate recovery after exercise",            unit: "bpm",       valueType: "int",    dailyGoal: null, icon: "RefreshCw",        categorySlug: "heart",     sortOrder: "20", hidden: true },
  { name: "Walking Step Length",      slug: "walking-step-length",     description: "Average step length",                           unit: "cm",        valueType: "number", dailyGoal: null, icon: "Ruler",            categorySlug: "activity",  sortOrder: "21", hidden: true },
  { name: "Restfulness",              slug: "restfulness",             description: "Sleep restfulness score",                       unit: null,        valueType: "int",    dailyGoal: null, icon: "Sparkles",         categorySlug: "sleep",     sortOrder: "22", hidden: true },
  { name: "Walking Asymmetry",        slug: "walking-asymmetry",       description: "Percentage difference between legs",            unit: "%",         valueType: "number", dailyGoal: null, icon: "GitBranch",        categorySlug: "activity",  sortOrder: "23", hidden: true },
  { name: "Max Heart Rate",           slug: "max-heart-rate",          description: "Maximum heart rate recorded",                   unit: "bpm",       valueType: "int",    dailyGoal: null, icon: "ArrowUpCircle",    categorySlug: "heart",     sortOrder: "24", hidden: true },
  { name: "water",                    slug: "water",                   description: null,                                            unit: "glasses",   valueType: "int",    dailyGoal: 8,    icon: "Droplets",         categorySlug: "default",   sortOrder: "25", hidden: true, counter: true },
  { name: "Sleep Timing",             slug: "sleep-timing",            description: "Bedtime consistency score",                     unit: null,        valueType: "int",    dailyGoal: null, icon: "Clock",            categorySlug: "sleep",     sortOrder: "26", hidden: true },
  { name: "Double Support Time",      slug: "double-support-time",     description: "Percentage of time with both feet on ground",   unit: "%",         valueType: "number", dailyGoal: null, icon: "AlignCenter",      categorySlug: "activity",  sortOrder: "27", hidden: true },
  { name: "Sleep Heart Rate",         slug: "sleep-heart-rate",        description: "Average heart rate during sleep",               unit: "bpm",       valueType: "int",    dailyGoal: null, icon: "HeartOff",         categorySlug: "sleep",     sortOrder: "28", hidden: true },
  { name: "Activity Score",           slug: "activity-score",          description: "Oura activity score",                           unit: null,        valueType: "int",    dailyGoal: null, icon: "Target",           categorySlug: "activity",  sortOrder: "29", hidden: true },
  { name: "Temperature Deviation",    slug: "temp-deviation",          description: "Deviation from baseline temperature",           unit: "°C",        valueType: "number", dailyGoal: null, icon: "ThermometerSun",   categorySlug: "body",      sortOrder: "30", hidden: true },
  { name: "Low Activity Time",        slug: "low-activity-time",       description: "Time spent in low activity",                    unit: "min",       valueType: "int",    dailyGoal: null, icon: "CirclePause",      categorySlug: "activity",  sortOrder: "31", hidden: true },
  { name: "Medium Activity Time",     slug: "medium-activity-time",    description: "Time spent in medium activity",                 unit: "min",       valueType: "int",    dailyGoal: null, icon: "Play",             categorySlug: "activity",  sortOrder: "32", hidden: true },
  { name: "High Activity Time",       slug: "high-activity-time",      description: "Time spent in high activity",                   unit: "min",       valueType: "int",    dailyGoal: null, icon: "FastForward",      categorySlug: "activity",  sortOrder: "33", hidden: true },
  { name: "Inactive Time",            slug: "inactive-time",           description: "Time spent inactive",                           unit: "min",       valueType: "int",    dailyGoal: null, icon: "Pause",            categorySlug: "activity",  sortOrder: "34", hidden: true },
  { name: "Previous Day Activity",    slug: "previous-day-activity",   description: "Activity contribution to readiness",            unit: null,        valueType: "int",    dailyGoal: null, icon: "BarChart3",        categorySlug: "readiness", sortOrder: "35", hidden: true },
  { name: "Blood Oxygen",             slug: "blood-oxygen",            description: "Blood oxygen saturation (SpO2)",                unit: "%",         valueType: "int",    dailyGoal: null, icon: "Droplet",          categorySlug: "body",      sortOrder: "36", hidden: true },
  { name: "Sleep Score",              slug: "sleep-score",             description: "Overall sleep quality score",                   unit: null,        valueType: "int",    dailyGoal: null, icon: "Star",             categorySlug: "sleep",     sortOrder: "37", hidden: true },
  { name: "Readiness Score",          slug: "readiness-score",         description: "Overall readiness for the day",                 unit: null,        valueType: "int",    dailyGoal: null, icon: "BatteryFull",      categorySlug: "readiness", sortOrder: "38", hidden: true },
  { name: "Walking + Running Distance", slug: "walking-running-distance", description: "Total distance walked and run",             unit: "km",        valueType: "number", dailyGoal: null, icon: "Route",            categorySlug: "activity",  sortOrder: "39", hidden: true },
  { name: "Average Heart Rate",       slug: "avg-heart-rate",          description: "Daily average heart rate",                      unit: "bpm",       valueType: "int",    dailyGoal: null, icon: "HeartPulse",       categorySlug: "heart",     sortOrder: "40", hidden: true },
  { name: "Previous Night Score",     slug: "previous-night-score",    description: "Sleep contribution to readiness",               unit: null,        valueType: "int",    dailyGoal: null, icon: "Sunset",           categorySlug: "readiness", sortOrder: "41", hidden: true },
  { name: "Body Temperature",         slug: "body-temperature",        description: "Wrist temperature reading",                     unit: "°C",        valueType: "number", dailyGoal: null, icon: "Thermometer",      categorySlug: "body",      sortOrder: "42", hidden: true },
  { name: "Resting Energy",           slug: "resting-energy",          description: "Basal metabolic rate calories",                 unit: "kcal",      valueType: "int",    dailyGoal: null, icon: "Coffee",           categorySlug: "activity",  sortOrder: "43", hidden: true },
  { name: "Min Heart Rate",           slug: "min-heart-rate",          description: "Minimum heart rate recorded",                   unit: "bpm",       valueType: "int",    dailyGoal: null, icon: "ArrowDownCircle",  categorySlug: "heart",     sortOrder: "44", hidden: true },
  { name: "Total Energy",             slug: "total-energy",            description: "Total calories burned",                         unit: "kcal",      valueType: "int",    dailyGoal: null, icon: "Zap",              categorySlug: "activity",  sortOrder: "45", hidden: true },
  { name: "Heart Rate Variability",   slug: "hrv",                     description: "SDNN heart rate variability",                   unit: "ms",        valueType: "int",    dailyGoal: null, icon: "AudioWaveform",    categorySlug: "heart",     sortOrder: "46", hidden: true },
  { name: "Walking Heart Rate",       slug: "walking-heart-rate",      description: "Average heart rate while walking",              unit: "bpm",       valueType: "int",    dailyGoal: null, icon: "PersonStanding",   categorySlug: "heart",     sortOrder: "47", hidden: true },
  { name: "Sleep Latency",            slug: "sleep-latency",           description: "Time to fall asleep",                           unit: "min",       valueType: "int",    dailyGoal: null, icon: "Hourglass",        categorySlug: "sleep",     sortOrder: "48", hidden: true },
  { name: "Noise Exposure",           slug: "noise-exposure",          description: "Environmental sound levels",                    unit: "dB",        valueType: "int",    dailyGoal: null, icon: "Volume2",          categorySlug: "body",      sortOrder: "49", hidden: true },
  { name: "Respiratory Rate",         slug: "respiratory-rate",        description: "Breaths per minute",                            unit: "brpm",      valueType: "number", dailyGoal: null, icon: "Waves",            categorySlug: "body",      sortOrder: "50", hidden: true },

  // ON metric at end
  { name: "Sleep Duration",           slug: "sleep-duration",          description: "Total time asleep",                             unit: "hours",     valueType: "number", dailyGoal: null, icon: "Moon",             categorySlug: "sleep",     sortOrder: "51", hidden: false },
  { name: "Awake Time",               slug: "awake-time",              description: "Time spent awake during sleep",                 unit: "min",       valueType: "int",    dailyGoal: null, icon: "Eye",              categorySlug: "sleep",     sortOrder: "52", hidden: true },
];

// Generate a strong random password: lowercase, uppercase, number, 2+ special chars
function generatePassword(length = 14): string {
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  const special = "!@#$%&*";

  const required = [
    lower[randomBytes(1)[0] % lower.length],
    upper[randomBytes(1)[0] % upper.length],
    digits[randomBytes(1)[0] % digits.length],
    special[randomBytes(1)[0] % special.length],
    special[randomBytes(1)[0] % special.length],
  ];

  const all = lower + upper + digits + special;
  const remaining = Array.from({ length: length - required.length }, () =>
    all[randomBytes(1)[0] % all.length]
  );

  const chars = [...required, ...remaining];
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomBytes(1)[0] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join("");
}

async function seed() {
  console.log("Seeding database...\n");

  // --- Users ---
  await db.delete(userNavItems); // delete nav items first (FK dependency)
  await db.delete(users);
  console.log("Cleared users & nav items.");

  const credentials: { email: string; password: string; role: string }[] = [];
  const userIds: string[] = [];

  for (const u of seedUsers) {
    const password = generatePassword();
    const passwordHash = await hash(password, 12);
    const userId = randomUUID();
    userIds.push(userId);
    await db.insert(users).values({
      id: userId,
      email: u.email,
      passwordHash,
      name: u.name,
      role: u.role,
    });
    credentials.push({ email: u.email, password, role: u.role });
    console.log(`  Created ${u.role.padEnd(5)} ${u.email}`);
  }

  // --- Categories ---
  await db.delete(trackerMetrics); // delete metrics first (FK dependency)
  await db.delete(trackerCategories);
  console.log("\nCleared categories & metrics.");

  const categoryIdMap: Record<string, string> = {};
  for (const cat of seedCategories) {
    const id = randomUUID();
    categoryIdMap[cat.slug] = id;
    await db.insert(trackerCategories).values({
      id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      icon: cat.icon,
      color: cat.color,
      sortOrder: cat.sortOrder,
    });
    console.log(`  Category: ${cat.name}`);
  }

  // --- Metrics ---
  let onCount = 0;
  let offCount = 0;
  for (const m of seedMetrics) {
    await db.insert(trackerMetrics).values({
      id: randomUUID(),
      categoryId: categoryIdMap[m.categorySlug],
      name: m.name,
      slug: m.slug,
      description: m.description,
      unit: m.unit,
      valueType: m.valueType,
      dailyGoal: m.dailyGoal,
      icon: m.icon,
      sortOrder: m.sortOrder,
      hidden: m.hidden,
      counter: m.counter ?? false,
    });
    if (m.hidden) offCount++;
    else onCount++;
  }
  console.log(`  ${onCount} metrics ON, ${offCount} metrics OFF`);

  // --- Nav Items (per user) ---
  const defaultNavItems = [
    { label: "Dashboard",     href: "/dashboard",      itemType: "builtin",          sortOrder: 0, visible: true,  locked: true },
    { label: "Metrics",       href: "/metrics",        itemType: "builtin",          sortOrder: 1, visible: true,  locked: false },
    { label: "Meditate",      href: "/meditate",       itemType: "tracking_section", sortOrder: 2, visible: true,  locked: false },
    { label: "Food",          href: "/food",           itemType: "tracking_section", sortOrder: 3, visible: true,  locked: false },
    { label: "Tracking",      href: "/tracking",       itemType: "tracking_section", sortOrder: 4, visible: true,  locked: false },
    { label: "Medical",       href: "/medical",        itemType: "tracking_section", sortOrder: 5, visible: true,  locked: false },
    { label: "Appointments",  href: "/appointments",   itemType: "tracking_section", sortOrder: 6, visible: true,  locked: false },
    { label: "Entertainment", href: "/entertainment",  itemType: "tracking_section", sortOrder: 7, visible: true,  locked: false },
    { label: "Workout",       href: "/workout",        itemType: "tracking_section", sortOrder: 8, visible: false, locked: false },
  ];

  let navCount = 0;
  for (const userId of userIds) {
    for (const item of defaultNavItems) {
      await db.insert(userNavItems).values({
        id: randomUUID(),
        userId,
        label: item.label,
        href: item.href,
        itemType: item.itemType,
        sortOrder: item.sortOrder,
        visible: item.visible,
        locked: item.locked,
      });
      navCount++;
    }
  }
  console.log(`  ${navCount} nav items (${defaultNavItems.length} per user)`);

  // --- Write credentials to .secrets ---
  const secretsPath = resolve(import.meta.dirname, "../.secrets");
  let existing = "";
  try { existing = readFileSync(secretsPath, "utf-8"); } catch {}

  existing = existing.replace(/# --- SEED CREDENTIALS ---[\s\S]*# --- END SEED CREDENTIALS ---\n?/, "");

  const credBlock = [
    "# --- SEED CREDENTIALS ---",
    `# Generated by scripts/seed.ts on ${new Date().toISOString().split("T")[0]}`,
    ...credentials.map((c) => `# ${c.role.padEnd(5)} ${c.email.padEnd(45)} ${c.password}`),
    "# --- END SEED CREDENTIALS ---",
    "",
  ].join("\n");

  writeFileSync(secretsPath, existing.trimEnd() + (existing.trim() ? "\n\n" : "") + credBlock);
  console.log(`\nSeeded ${credentials.length} users, ${seedCategories.length} categories, ${seedMetrics.length} metrics.`);
  console.log("Credentials written to .secrets");
}

seed().catch(console.error);
