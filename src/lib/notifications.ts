/**
 * Client-side notification helper.
 * Uses the Web Notification API in browsers and @capacitor/local-notifications on iOS.
 */

import { Capacitor } from '@capacitor/core';

export async function requestNotificationPermission(): Promise<boolean> {
	if (Capacitor.isNativePlatform()) {
		try {
			const { LocalNotifications } = await import('@capacitor/local-notifications');
			const result = await LocalNotifications.requestPermissions();
			return result.display === 'granted';
		} catch {
			return false;
		}
	}

	if (typeof Notification === 'undefined') return false;

	if (Notification.permission === 'granted') return true;
	if (Notification.permission === 'denied') return false;

	const result = await Notification.requestPermission();
	return result === 'granted';
}

export function hasNotificationPermission(): boolean {
	if (Capacitor.isNativePlatform()) return true; // checked at schedule time
	if (typeof Notification === 'undefined') return false;
	return Notification.permission === 'granted';
}

export interface ReminderConfig {
	id: string;
	label: string;
	time: string; // 'HH:MM'
	days: number[]; // 0=Sun..6=Sat
	metricId?: string | null;
}

/**
 * Schedule local notifications for all enabled reminders.
 * On web: sets timeouts for today's remaining reminders.
 * On iOS: uses Capacitor LocalNotifications with repeating schedule.
 */
export async function scheduleReminders(reminders: ReminderConfig[]): Promise<void> {
	if (Capacitor.isNativePlatform()) {
		await scheduleNativeReminders(reminders);
	} else {
		scheduleWebReminders(reminders);
	}
}

// Track web timeouts so we can clear them on re-schedule
const activeTimeouts: number[] = [];

function scheduleWebReminders(reminders: ReminderConfig[]) {
	// Clear previous timeouts
	for (const t of activeTimeouts) clearTimeout(t);
	activeTimeouts.length = 0;

	const now = new Date();
	const today = now.getDay(); // 0=Sun

	for (const r of reminders) {
		if (!r.days.includes(today)) continue;

		const [hours, minutes] = r.time.split(':').map(Number);
		const target = new Date(now);
		target.setHours(hours, minutes, 0, 0);

		const delay = target.getTime() - now.getTime();
		if (delay <= 0) continue; // already past for today

		const timeout = window.setTimeout(() => {
			if (Notification.permission === 'granted') {
				new Notification('Ortholinear Reminder', {
					body: r.label,
					icon: '/images/logo.svg',
					tag: `reminder-${r.id}`
				});
			}
		}, delay);

		activeTimeouts.push(timeout);
	}
}

async function scheduleNativeReminders(reminders: ReminderConfig[]) {
	try {
		const { LocalNotifications } = await import('@capacitor/local-notifications');

		// Cancel all existing scheduled notifications
		const pending = await LocalNotifications.getPending();
		if (pending.notifications.length > 0) {
			await LocalNotifications.cancel(pending);
		}

		const notifications = [];
		let notifId = 1;

		for (const r of reminders) {
			for (const day of r.days) {
				notifications.push({
					id: notifId++,
					title: 'Ortholinear Reminder',
					body: r.label,
					schedule: {
						on: {
							weekday: day === 0 ? 1 : day + 1, // Capacitor uses 1=Sun..7=Sat
							hour: parseInt(r.time.split(':')[0]),
							minute: parseInt(r.time.split(':')[1])
						},
						repeats: true
					},
					extra: { reminderId: r.id, metricId: r.metricId }
				});
			}
		}

		if (notifications.length > 0) {
			await LocalNotifications.schedule({ notifications });
		}
	} catch {
		// Plugin not available
	}
}

/**
 * Cancel all scheduled notifications.
 */
export async function cancelAllReminders(): Promise<void> {
	// Clear web timeouts
	for (const t of activeTimeouts) clearTimeout(t);
	activeTimeouts.length = 0;

	if (Capacitor.isNativePlatform()) {
		try {
			const { LocalNotifications } = await import('@capacitor/local-notifications');
			const pending = await LocalNotifications.getPending();
			if (pending.notifications.length > 0) {
				await LocalNotifications.cancel(pending);
			}
		} catch {
			// Plugin not available
		}
	}
}
