import { pgTable, text, timestamp, boolean, jsonb, integer } from 'drizzle-orm/pg-core';

// Users table for authentication
export const users = pgTable('users', {
	id: text('id').primaryKey(),
	email: text('email').notNull().unique(),
	passwordHash: text('password_hash').notNull(),
	name: text('name'),
	avatarUrl: text('avatar_url'),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

// Sessions table for Lucia
export const sessions = pgTable('sessions', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull()
});

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;


// Tracker categories
export const trackerCategories = pgTable('tracker_categories', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	slug: text('slug').notNull().unique(),
	description: text('description'),
	icon: text('icon'),
	color: text('color'),
	sortOrder: text('sort_order').notNull().default('0'),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

// Tracker metrics
export const trackerMetrics = pgTable('tracker_metrics', {
	id: text('id').primaryKey(),
	categoryId: text('category_id')
		.notNull()
		.references(() => trackerCategories.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	slug: text('slug').notNull(),
	description: text('description'),
	unit: text('unit'),
	valueType: text('value_type').notNull().default('number'),
	fields: jsonb('fields'),
	dailyGoal: integer('daily_goal'),
	icon: text('icon'),
	color: text('color'),
	sortOrder: text('sort_order').notNull().default('0'),
	hidden: boolean('hidden').notNull().default(false),
	archived: boolean('archived').notNull().default(false),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

// Tracker entries
export const trackerEntries = pgTable('tracker_entries', {
	id: text('id').primaryKey(),
	metricId: text('metric_id')
		.notNull()
		.references(() => trackerMetrics.id, { onDelete: 'cascade' }),
	value: text('value').notNull(),
	notes: text('notes'),
	date: timestamp('date', { withTimezone: true }).notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

// Tracker goals
export const trackerGoals = pgTable('tracker_goals', {
	id: text('id').primaryKey(),
	metricId: text('metric_id')
		.notNull()
		.references(() => trackerMetrics.id, { onDelete: 'cascade' }),
	targetValue: text('target_value').notNull(),
	targetType: text('target_type').notNull().default('daily'),
	comparison: text('comparison').notNull().default('gte'),
	active: boolean('active').notNull().default(true),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

// Tracker types
export type TrackerCategory = typeof trackerCategories.$inferSelect;
export type TrackerMetric = typeof trackerMetrics.$inferSelect;
export type TrackerEntry = typeof trackerEntries.$inferSelect;
export type TrackerGoal = typeof trackerGoals.$inferSelect;


// Store/Merch orders
export const orders = pgTable('orders', {
	id: text('id').primaryKey(),
	email: text('email').notNull(),
	userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
	stripeSessionId: text('stripe_session_id'),
	stripePaymentIntentId: text('stripe_payment_intent_id'),
	printfulOrderId: text('printful_order_id'),
	status: text('status').notNull().default('pending'),
	shippingAddress: jsonb('shipping_address'),
	items: jsonb('items').notNull(),
	subtotal: integer('subtotal').notNull(),
	shipping: integer('shipping').notNull().default(0),
	total: integer('total').notNull(),
	trackingNumber: text('tracking_number'),
	trackingUrl: text('tracking_url'),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;


// Contact form submissions
export const contactSubmissions = pgTable('contact_submissions', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	email: text('email').notNull(),
	message: text('message').notNull(),
	status: text('status').notNull().default('new'),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export type ContactSubmission = typeof contactSubmissions.$inferSelect;


// ============================================
// Weightlifting / Strength Training
// ============================================

// Exercise library
export const exercises = pgTable('exercises', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	muscleGroup: text('muscle_group').notNull(),
	equipment: text('equipment'),
	isCustom: boolean('is_custom').notNull().default(false),
	userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

// Workouts
export const workouts = pgTable('workouts', {
	id: text('id').primaryKey(),
	userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
	name: text('name'),
	date: timestamp('date', { withTimezone: true }).notNull(),
	duration: integer('duration'),
	notes: text('notes'),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

// Workout sets
export const workoutSets = pgTable('workout_sets', {
	id: text('id').primaryKey(),
	workoutId: text('workout_id').notNull().references(() => workouts.id, { onDelete: 'cascade' }),
	exerciseId: text('exercise_id').notNull().references(() => exercises.id, { onDelete: 'cascade' }),
	setNumber: integer('set_number').notNull(),
	reps: integer('reps').notNull(),
	weight: integer('weight').notNull(),
	unit: text('unit').notNull().default('lbs'),
	type: text('type').notNull().default('regular'),
	notes: text('notes'),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

// Personal records (auto-calculated)
export const personalRecords = pgTable('personal_records', {
	id: text('id').primaryKey(),
	userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
	exerciseId: text('exercise_id').notNull().references(() => exercises.id, { onDelete: 'cascade' }),
	repCount: integer('rep_count').notNull(),
	weight: integer('weight').notNull(),
	unit: text('unit').notNull().default('lbs'),
	date: timestamp('date', { withTimezone: true }).notNull(),
	setId: text('set_id').references(() => workoutSets.id, { onDelete: 'set null' }),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export type Exercise = typeof exercises.$inferSelect;
export type Workout = typeof workouts.$inferSelect;
export type WorkoutSet = typeof workoutSets.$inferSelect;
export type PersonalRecord = typeof personalRecords.$inferSelect;


// ============================================
// Nutrition / Food Tracking
// ============================================

// Food log (per meal)
export const foodLog = pgTable('food_log', {
	id: text('id').primaryKey(),
	userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
	date: timestamp('date', { withTimezone: true }).notNull(),
	mealType: text('meal_type').notNull()
});

// Food log items
export const foodLogItems = pgTable('food_log_items', {
	id: text('id').primaryKey(),
	foodLogId: text('food_log_id').notNull().references(() => foodLog.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	fdcId: text('fdc_id'),
	servingSize: integer('serving_size').notNull().default(100),
	servingUnit: text('serving_unit').notNull().default('g'),
	calories: integer('calories').notNull().default(0),
	protein: integer('protein').notNull().default(0),
	carbs: integer('carbs').notNull().default(0),
	fat: integer('fat').notNull().default(0),
	quantity: integer('quantity').notNull().default(1),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

// Custom foods (user-created)
export const customFoods = pgTable('custom_foods', {
	id: text('id').primaryKey(),
	userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	calories: integer('calories').notNull().default(0),
	protein: integer('protein').notNull().default(0),
	carbs: integer('carbs').notNull().default(0),
	fat: integer('fat').notNull().default(0),
	servingSize: integer('serving_size').notNull().default(100),
	servingUnit: text('serving_unit').notNull().default('g'),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

// Favorite foods (starred individual foods for quick access)
export const favoriteFoods = pgTable('favorite_foods', {
	id: text('id').primaryKey(),
	userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	fdcId: text('fdc_id'),
	customFoodId: text('custom_food_id').references(() => customFoods.id, { onDelete: 'cascade' }),
	servingSize: integer('serving_size').notNull().default(100),
	servingUnit: text('serving_unit').notNull().default('g'),
	calories: integer('calories').notNull().default(0),
	protein: integer('protein').notNull().default(0),
	carbs: integer('carbs').notNull().default(0),
	fat: integer('fat').notNull().default(0),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

// Favorite meals (starred meal combos — a group of foods logged together)
export const favoriteMeals = pgTable('favorite_meals', {
	id: text('id').primaryKey(),
	userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

// Items within a favorite meal
export const favoriteMealItems = pgTable('favorite_meal_items', {
	id: text('id').primaryKey(),
	favoriteMealId: text('favorite_meal_id').notNull().references(() => favoriteMeals.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	fdcId: text('fdc_id'),
	servingSize: integer('serving_size').notNull().default(100),
	servingUnit: text('serving_unit').notNull().default('g'),
	calories: integer('calories').notNull().default(0),
	protein: integer('protein').notNull().default(0),
	carbs: integer('carbs').notNull().default(0),
	fat: integer('fat').notNull().default(0),
	quantity: integer('quantity').notNull().default(1)
});

export type FoodLog = typeof foodLog.$inferSelect;
export type FoodLogItem = typeof foodLogItems.$inferSelect;
export type CustomFood = typeof customFoods.$inferSelect;
export type FavoriteFood = typeof favoriteFoods.$inferSelect;
export type FavoriteMeal = typeof favoriteMeals.$inferSelect;
export type FavoriteMealItem = typeof favoriteMealItems.$inferSelect;


// ============================================
// Biometric Integrations
// ============================================

// Integration connections (Oura OAuth tokens, HealthKit status)
export const integrationConnections = pgTable('integration_connections', {
	id: text('id').primaryKey(),
	userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
	service: text('service').notNull(), // 'oura' | 'healthkit'
	accessToken: text('access_token'),
	refreshToken: text('refresh_token'),
	tokenExpiresAt: timestamp('token_expires_at', { withTimezone: true }),
	scopes: text('scopes'),
	status: text('status').notNull().default('active'), // 'active' | 'disconnected' | 'error'
	lastSyncAt: timestamp('last_sync_at', { withTimezone: true }),
	lastSyncError: text('last_sync_error'),
	metadata: jsonb('metadata'),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

// Integration sync log (idempotency — prevents duplicate entries on re-sync)
export const integrationSyncLog = pgTable('integration_sync_log', {
	id: text('id').primaryKey(),
	connectionId: text('connection_id').notNull().references(() => integrationConnections.id, { onDelete: 'cascade' }),
	syncType: text('sync_type').notNull(), // 'daily' | 'backfill'
	syncDate: text('sync_date').notNull(), // 'YYYY-MM-DD'
	entriesCreated: integer('entries_created').notNull().default(0),
	status: text('status').notNull().default('success'), // 'success' | 'error'
	errorMessage: text('error_message'),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export type IntegrationConnection = typeof integrationConnections.$inferSelect;
export type IntegrationSyncLog = typeof integrationSyncLog.$inferSelect;


// ============================================
// Reminders / Notifications
// ============================================

// Reminder schedules — per-user, per-metric notification config
export const reminderSchedules = pgTable('reminder_schedules', {
	id: text('id').primaryKey(),
	userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
	metricId: text('metric_id').references(() => trackerMetrics.id, { onDelete: 'cascade' }),
	label: text('label').notNull(), // display name, e.g. "Log water" or custom
	time: text('time').notNull(), // 'HH:MM' in 24h format
	days: jsonb('days').notNull(), // [0,1,2,3,4,5,6] — 0=Sun, 6=Sat
	timezone: text('timezone').notNull().default('America/Chicago'),
	enabled: boolean('enabled').notNull().default(true),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export type ReminderSchedule = typeof reminderSchedules.$inferSelect;
