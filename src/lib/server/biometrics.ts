import { eq } from 'drizzle-orm';
import { trackerCategories, trackerMetrics } from './db/schema';
import type { Database } from './db';

export interface BiometricMetricDef {
	slug: string;
	name: string;
	unit: string;
	providers: ('healthkit' | 'oura')[];
}

export const BIOMETRIC_CATEGORY_SLUG = 'biometrics';

export const BIOMETRIC_METRICS: BiometricMetricDef[] = [
	{ slug: 'bio-steps', name: 'Steps', unit: 'steps', providers: ['healthkit', 'oura'] },
	{ slug: 'bio-resting-hr', name: 'Resting Heart Rate', unit: 'bpm', providers: ['healthkit', 'oura'] },
	{ slug: 'bio-hrv', name: 'Heart Rate Variability', unit: 'ms', providers: ['healthkit', 'oura'] },
	{ slug: 'bio-sleep-duration', name: 'Sleep Duration', unit: 'hours', providers: ['healthkit', 'oura'] },
	{ slug: 'bio-sleep-score', name: 'Sleep Score', unit: '', providers: ['oura'] },
	{ slug: 'bio-active-calories', name: 'Active Calories', unit: 'kcal', providers: ['healthkit', 'oura'] },
	{ slug: 'bio-spo2', name: 'Blood Oxygen', unit: '%', providers: ['healthkit', 'oura'] },
	{ slug: 'bio-readiness', name: 'Readiness Score', unit: '', providers: ['oura'] },
	{ slug: 'bio-stress', name: 'Stress Level', unit: '', providers: ['oura'] }
];

/**
 * Ensures the "Biometrics" category and all 9 biometric metrics exist.
 * Idempotent — safe to call on every sync.
 */
export async function ensureBiometricMetrics(db: Database): Promise<void> {
	// Find or create the Biometrics category
	const existing = await db
		.select()
		.from(trackerCategories)
		.where(eq(trackerCategories.slug, BIOMETRIC_CATEGORY_SLUG));

	let categoryId: string;

	if (existing.length > 0) {
		categoryId = existing[0].id;
	} else {
		categoryId = crypto.randomUUID();
		await db.insert(trackerCategories).values({
			id: categoryId,
			name: 'Biometrics',
			slug: BIOMETRIC_CATEGORY_SLUG,
			description: 'Auto-synced health data from connected devices',
			icon: 'heart',
			color: 'rose',
			sortOrder: '999'
		});
	}

	// Ensure each metric exists
	const existingMetrics = await db
		.select({ slug: trackerMetrics.slug })
		.from(trackerMetrics)
		.where(eq(trackerMetrics.categoryId, categoryId));

	const existingSlugs = new Set(existingMetrics.map((m) => m.slug));

	for (let i = 0; i < BIOMETRIC_METRICS.length; i++) {
		const def = BIOMETRIC_METRICS[i];
		if (existingSlugs.has(def.slug)) continue;

		await db.insert(trackerMetrics).values({
			id: crypto.randomUUID(),
			categoryId,
			name: def.name,
			slug: def.slug,
			description: `Auto-synced from ${def.providers.join(', ')}`,
			unit: def.unit || null,
			valueType: 'number',
			hidden: true,
			sortOrder: String(i),
			createdAt: new Date(),
			updatedAt: new Date()
		});
	}
}
