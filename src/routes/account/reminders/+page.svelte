<script lang="ts">
	import { onMount } from 'svelte';
	import { Card, Button, Input, Label, Switch } from '$lib/components/ui';
	import { ArrowLeft, Plus, Trash2, Bell, BellOff } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import { invalidateAll } from '$app/navigation';

	let { data } = $props();

	type Reminder = (typeof data.reminders)[number];
	type Metric = (typeof data.metrics)[number];

	let notificationsEnabled = $state(false);
	let showAddForm = $state(false);

	// New reminder form state
	let newLabel = $state('');
	let newTime = $state('09:00');
	let newMetricId = $state('');
	let newDays = $state([1, 2, 3, 4, 5]); // Mon-Fri default
	let saving = $state(false);

	const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

	onMount(async () => {
		if (typeof Notification !== 'undefined') {
			notificationsEnabled = Notification.permission === 'granted';
		}
	});

	async function enableNotifications() {
		const { requestNotificationPermission } = await import('$lib/notifications');
		const granted = await requestNotificationPermission();
		notificationsEnabled = granted;
		if (granted) {
			toast.success('Notifications enabled');
			await reschedule();
		} else {
			toast.error('Notification permission denied');
		}
	}

	function toggleDay(day: number) {
		if (newDays.includes(day)) {
			newDays = newDays.filter((d) => d !== day);
		} else {
			newDays = [...newDays, day].sort();
		}
	}

	async function addReminder() {
		if (!newLabel.trim()) {
			toast.error('Label is required');
			return;
		}
		saving = true;
		try {
			const res = await fetch('/api/reminders', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					label: newLabel.trim(),
					time: newTime,
					days: newDays,
					metricId: newMetricId || null
				})
			});
			if (res.ok) {
				toast.success('Reminder created');
				showAddForm = false;
				newLabel = '';
				newTime = '09:00';
				newMetricId = '';
				newDays = [1, 2, 3, 4, 5];
				await invalidateAll();
				await reschedule();
			} else {
				const err = await res.json();
				toast.error(err.message || 'Failed to create reminder');
			}
		} catch {
			toast.error('Failed to create reminder');
		} finally {
			saving = false;
		}
	}

	async function toggleReminder(reminder: Reminder) {
		try {
			const res = await fetch(`/api/reminders/${reminder.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ enabled: !reminder.enabled })
			});
			if (res.ok) {
				await invalidateAll();
				await reschedule();
			} else {
				toast.error('Failed to update reminder');
			}
		} catch {
			toast.error('Failed to update reminder');
		}
	}

	async function deleteReminder(id: string) {
		try {
			const res = await fetch(`/api/reminders/${id}`, { method: 'DELETE' });
			if (res.ok) {
				toast.success('Reminder deleted');
				await invalidateAll();
				await reschedule();
			} else {
				toast.error('Failed to delete reminder');
			}
		} catch {
			toast.error('Failed to delete reminder');
		}
	}

	async function reschedule() {
		if (!notificationsEnabled) return;
		const { scheduleReminders } = await import('$lib/notifications');
		const active = data.reminders.filter((r: Reminder) => r.enabled);
		await scheduleReminders(active.map((r: Reminder) => ({
			id: r.id,
			label: r.label,
			time: r.time,
			days: r.days as number[],
			metricId: r.metricId
		})));
	}

	function formatTime(time: string): string {
		const [h, m] = time.split(':').map(Number);
		const ampm = h >= 12 ? 'PM' : 'AM';
		const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
		return `${hour12}:${m.toString().padStart(2, '0')} ${ampm}`;
	}

	function formatDays(days: unknown): string {
		const d = days as number[];
		if (d.length === 7) return 'Every day';
		if (d.length === 5 && d.every((v) => v >= 1 && v <= 5)) return 'Weekdays';
		if (d.length === 2 && d.includes(0) && d.includes(6)) return 'Weekends';
		return d.map((v) => dayLabels[v]).join(', ');
	}

	function getMetricName(metricId: string | null): string | null {
		if (!metricId) return null;
		const metric = data.metrics.find((m: Metric) => m.id === metricId);
		return metric?.name ?? null;
	}
</script>

<svelte:head>
	<title>Reminders</title>
</svelte:head>

<div class="max-w-2xl mx-auto px-6 py-10">
	<a
		href="/account"
		class="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
	>
		<ArrowLeft class="w-4 h-4" />
		Back to Account
	</a>

	<div class="flex items-center justify-between mb-2">
		<h1 class="text-2xl font-semibold tracking-tight">Reminders</h1>
	</div>
	<p class="text-muted-foreground mb-8">Get notified to log your metrics at specific times.</p>

	<!-- Notification Permission -->
	{#if !notificationsEnabled}
		<Card.Root class="mb-6">
			<Card.Content class="flex items-center justify-between py-5">
				<div class="flex items-center gap-3">
					<BellOff class="w-5 h-5 text-muted-foreground" />
					<div>
						<p class="text-sm font-medium">Notifications are disabled</p>
						<p class="text-xs text-muted-foreground">Enable to receive reminder alerts</p>
					</div>
				</div>
				<Button.Root size="sm" onclick={enableNotifications} class="cursor-pointer">
					Enable
				</Button.Root>
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Reminder List -->
	{#if data.reminders.length > 0}
		<div class="space-y-3 mb-6">
			{#each data.reminders as reminder}
				<Card.Root>
					<Card.Content class="flex items-center justify-between py-4">
						<div class="flex items-center gap-4">
							<Switch.Root
								checked={reminder.enabled}
								onCheckedChange={() => toggleReminder(reminder)}
							/>
							<div>
								<p class="text-sm font-medium {reminder.enabled ? '' : 'text-muted-foreground'}">{reminder.label}</p>
								<p class="text-xs text-muted-foreground">
									{formatTime(reminder.time)} · {formatDays(reminder.days)}
									{#if getMetricName(reminder.metricId)}
										· {getMetricName(reminder.metricId)}
									{/if}
								</p>
							</div>
						</div>
						<Button.Root
							size="sm"
							variant="ghost"
							onclick={() => deleteReminder(reminder.id)}
							class="cursor-pointer text-muted-foreground hover:text-destructive"
						>
							<Trash2 class="w-4 h-4" />
						</Button.Root>
					</Card.Content>
				</Card.Root>
			{/each}
		</div>
	{:else if !showAddForm}
		<div class="border border-dashed border-border rounded-xl p-12 text-center mb-6">
			<Bell class="w-8 h-8 text-muted-foreground mx-auto mb-3" />
			<p class="text-muted-foreground mb-4">No reminders yet. Create one to get started.</p>
		</div>
	{/if}

	<!-- Add Reminder -->
	{#if showAddForm}
		<Card.Root class="mb-6">
			<Card.Header>
				<Card.Title>New Reminder</Card.Title>
			</Card.Header>
			<Card.Content class="space-y-4">
				<div class="space-y-2">
					<Label.Root for="reminder-label">Label</Label.Root>
					<Input.Root
						id="reminder-label"
						bind:value={newLabel}
						placeholder="e.g. Log water intake"
					/>
				</div>

				<div class="space-y-2">
					<Label.Root for="reminder-time">Time</Label.Root>
					<Input.Root
						id="reminder-time"
						type="time"
						bind:value={newTime}
					/>
				</div>

				<div class="space-y-2">
					<Label.Root>Days</Label.Root>
					<div class="flex gap-2">
						{#each dayLabels as label, i}
							<button
								type="button"
								class="w-10 h-10 rounded-full text-xs font-medium border transition-colors cursor-pointer {newDays.includes(i) ? 'bg-foreground text-background border-foreground' : 'bg-background text-muted-foreground border-border hover:border-muted-foreground'}"
								onclick={() => toggleDay(i)}
							>
								{label}
							</button>
						{/each}
					</div>
				</div>

				{#if data.metrics.length > 0}
					<div class="space-y-2">
						<Label.Root for="reminder-metric">Linked Metric (optional)</Label.Root>
						<select
							id="reminder-metric"
							bind:value={newMetricId}
							class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
						>
							<option value="">None — general reminder</option>
							{#each data.metrics as metric}
								<option value={metric.id}>{metric.name}</option>
							{/each}
						</select>
					</div>
				{/if}
			</Card.Content>
			<Card.Footer class="flex gap-2">
				<Button.Root onclick={addReminder} disabled={saving} class="cursor-pointer">
					{saving ? 'Saving...' : 'Create Reminder'}
				</Button.Root>
				<Button.Root variant="outline" onclick={() => { showAddForm = false; }} class="cursor-pointer">
					Cancel
				</Button.Root>
			</Card.Footer>
		</Card.Root>
	{:else}
		<Button.Root onclick={() => { showAddForm = true; }} class="cursor-pointer">
			<Plus class="w-4 h-4 mr-2" />
			Add Reminder
		</Button.Root>
	{/if}
</div>
