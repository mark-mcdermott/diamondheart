/**
 * Client-side HealthKit wrapper using @capgo/capacitor-health.
 * Only runs on native iOS — all methods are no-ops in the browser.
 */

import { Capacitor } from '@capacitor/core';

// Dynamically import so builds don't fail when the plugin isn't installed
async function getPlugin() {
	const { CapacitorHealth } = await import('@capgo/capacitor-health');
	return CapacitorHealth;
}

export function isHealthKitAvailable(): boolean {
	return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
}

export async function requestHealthKitPermissions(): Promise<boolean> {
	if (!isHealthKitAvailable()) return false;

	try {
		const plugin = await getPlugin();
		const result = await plugin.requestAuthorization({
			read: [
				'steps',
				'heart_rate',
				'heart_rate_variability',
				'sleep_analysis',
				'oxygen_saturation',
				'active_energy_burned'
			],
			write: []
		});
		return result.authorized ?? false;
	} catch {
		return false;
	}
}

export interface HealthKitPayload {
	date: string; // 'YYYY-MM-DD'
	steps?: number;
	restingHeartRate?: number;
	hrv?: number;
	sleepDuration?: number; // hours
	activeCalories?: number;
	spo2?: number; // percentage
}

export async function queryHealthKitData(startDate: string, endDate: string): Promise<HealthKitPayload> {
	if (!isHealthKitAvailable()) {
		return { date: startDate };
	}

	const plugin = await getPlugin();
	const payload: HealthKitPayload = { date: startDate };

	const start = new Date(`${startDate}T00:00:00`);
	const end = new Date(`${endDate}T23:59:59`);

	try {
		const steps = await plugin.queryAggregated({
			sampleType: 'steps',
			startDate: start.toISOString(),
			endDate: end.toISOString(),
			bucket: 'day'
		});
		if (steps.data?.[0]?.value) payload.steps = Math.round(Number(steps.data[0].value));
	} catch { /* not available */ }

	try {
		const hr = await plugin.query({
			sampleType: 'heart_rate',
			startDate: start.toISOString(),
			endDate: end.toISOString(),
			limit: 100
		});
		if (hr.data?.length) {
			// Use the minimum HR as a proxy for resting HR
			const values = hr.data.map((d) => Number(d.value)).filter((v: number) => v > 0);
			if (values.length) payload.restingHeartRate = Math.round(Math.min(...values));
		}
	} catch { /* not available */ }

	try {
		const hrv = await plugin.query({
			sampleType: 'heart_rate_variability',
			startDate: start.toISOString(),
			endDate: end.toISOString(),
			limit: 50
		});
		if (hrv.data?.length) {
			const values = hrv.data.map((d) => Number(d.value)).filter((v: number) => v > 0);
			if (values.length) {
				// HRV in ms — average of samples
				payload.hrv = Math.round(values.reduce((a: number, b: number) => a + b, 0) / values.length);
			}
		}
	} catch { /* not available */ }

	try {
		const sleep = await plugin.query({
			sampleType: 'sleep_analysis',
			startDate: start.toISOString(),
			endDate: end.toISOString(),
			limit: 50
		});
		if (sleep.data?.length) {
			// Sum asleep durations in hours
			let totalMs = 0;
			for (const s of sleep.data as { startDate: string; endDate: string; value?: string }[]) {
				if (s.value === 'ASLEEP' || s.value === 'INBED') {
					totalMs += new Date(s.endDate).getTime() - new Date(s.startDate).getTime();
				}
			}
			if (totalMs > 0) payload.sleepDuration = Math.round((totalMs / 3600000) * 10) / 10;
		}
	} catch { /* not available */ }

	try {
		const cal = await plugin.queryAggregated({
			sampleType: 'active_energy_burned',
			startDate: start.toISOString(),
			endDate: end.toISOString(),
			bucket: 'day'
		});
		if (cal.data?.[0]?.value) payload.activeCalories = Math.round(Number(cal.data[0].value));
	} catch { /* not available */ }

	try {
		const spo2 = await plugin.query({
			sampleType: 'oxygen_saturation',
			startDate: start.toISOString(),
			endDate: end.toISOString(),
			limit: 50
		});
		if (spo2.data?.length) {
			const values = spo2.data.map((d) => Number(d.value) * 100).filter((v: number) => v > 0);
			if (values.length) payload.spo2 = Math.round(values.reduce((a: number, b: number) => a + b, 0) / values.length);
		}
	} catch { /* not available */ }

	return payload;
}
