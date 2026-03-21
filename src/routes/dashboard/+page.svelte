<script lang="ts">
	import { onMount } from 'svelte';
	import { enhance } from '$app/forms';
	import { Button, ProgressRing } from '$lib/components/ui';
	import {
		Plus,
		Settings,
		Check,
		Brain,
		Droplets,
		Dumbbell,
		Heart,
		Flame,
		BookOpen,
		Moon,
		Sun,
		Apple,
		Footprints,
		Clock
	} from 'lucide-svelte';
	let { data } = $props();

	// Auto-sync HealthKit if connected and stale (> 1 hour)
	// + schedule reminders for today
	onMount(async () => {
		// HealthKit auto-sync
		if (data.healthkitConnection?.status === 'active') {
			const lastSync = data.healthkitConnection.lastSyncAt ? new Date(data.healthkitConnection.lastSyncAt).getTime() : 0;
			if (Date.now() - lastSync >= 3600000) {
				try {
					const { isHealthKitAvailable, queryHealthKitData } = await import('$lib/healthkit');
					if (isHealthKitAvailable()) {
						const today = new Date().toISOString().split('T')[0];
						const payload = await queryHealthKitData(today, today);
						await fetch('/api/integrations/healthkit/sync', {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify(payload)
						});
					}
				} catch {
					// Silent fail
				}
			}
		}

		// Schedule today's reminders
		try {
			const { hasNotificationPermission, scheduleReminders } = await import('$lib/notifications');
			if (hasNotificationPermission()) {
				const res = await fetch('/api/reminders');
				if (res.ok) {
					const reminders = await res.json();
					const active = reminders.filter((r: { enabled: boolean }) => r.enabled);
					await scheduleReminders(active);
				}
			}
		} catch {
			// Silent fail
		}
	});

	// ---------- Types ----------

	type IconComponent = typeof Brain;

	type Metric = (typeof data.metrics)[number];
	type Entry = (typeof data.todayEntries)[number];

	// ---------- Icon mapping ----------

	const iconMap: Record<string, IconComponent> = {
		meditation: Brain,
		water: Droplets,
		exercise: Dumbbell,
		sleep: Moon,
		reading: BookOpen,
		steps: Footprints,
		nutrition: Apple,
		cardio: Flame,
		health: Heart,
		energy: Sun
	};

	const fallbackIcons: IconComponent[] = [
		Heart, Flame, BookOpen, Moon, Sun, Apple, Footprints, Brain, Droplets, Dumbbell
	];

	function getMetricIcon(metric: Metric, index: number): IconComponent {
		return iconMap[metric.slug] ?? fallbackIcons[index % fallbackIcons.length];
	}

	// ---------- Color mapping ----------

	const colorHexMap: Record<string, string> = {
		blue: '#3b82f6',
		green: '#22c55e',
		purple: '#a855f7',
		amber: '#f59e0b',
		rose: '#f43f5e',
		cyan: '#06b6d4',
		indigo: '#6366f1',
		emerald: '#10b981',
		red: '#ef4444',
		orange: '#f97316',
		yellow: '#eab308',
		teal: '#14b8a6',
		pink: '#ec4899'
	};

	const defaultColorCycle = ['#3b82f6', '#22c55e', '#a855f7', '#f59e0b', '#f43f5e', '#06b6d4', '#6366f1', '#10b981'];

	function getMetricColorHex(metric: Metric, index: number): string {
		if (metric.color && colorHexMap[metric.color]) {
			return colorHexMap[metric.color];
		}
		return defaultColorCycle[index % defaultColorCycle.length];
	}

	// ---------- Today helpers ----------

	function getTodayValue(metricId: string): { count: number; sum: number } {
		const entries = data.todayEntries.filter((e: Entry) => e.metricId === metricId);
		let sum = 0;
		for (const entry of entries) {
			const parsed = parseFloat(entry.value);
			if (!isNaN(parsed)) {
				sum += parsed;
			} else {
				sum += 1; // "done" entries count as 1
			}
		}
		return { count: entries.length, sum };
	}

	function formatTodayDisplay(metric: Metric): string {
		const { count, sum } = getTodayValue(metric.id);
		const goal = metric.dailyGoal ?? 1;

		if (metric.valueType === 'none' || metric.valueType === 'bool') {
			return `${count}/${goal}`;
		}

		const displayValue = Number.isInteger(sum) ? sum.toString() : sum.toFixed(1);
		const formattedValue = sum >= 1000 ? sum.toLocaleString() : displayValue;
		return `${formattedValue}/${goal}`;
	}

	function getProgress(metric: Metric): number {
		const { count, sum } = getTodayValue(metric.id);
		const goal = metric.dailyGoal ?? 1;
		if (goal <= 0) return 100;

		if (metric.valueType === 'none' || metric.valueType === 'bool') {
			return Math.min(100, (count / goal) * 100);
		}
		return Math.min(100, (sum / goal) * 100);
	}

	function isGoalMet(metric: Metric): boolean {
		return getProgress(metric) >= 100;
	}

	// ---------- Formatting ----------

	function formatDate(date: Date | string): string {
		const d = new Date(date);
		return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
	}

	function formatTimeAgo(date: Date | string): string {
		const d = new Date(date);
		const now = new Date();
		const diffMs = now.getTime() - d.getTime();
		const diffMin = Math.floor(diffMs / 60000);
		const diffHr = Math.floor(diffMs / 3600000);
		const diffDay = Math.floor(diffMs / 86400000);

		if (diffMin < 1) return 'just now';
		if (diffMin < 60) return `${diffMin}m ago`;
		if (diffHr < 24) return `${diffHr}h ago`;
		if (diffDay === 1) return 'yesterday';
		return `${diffDay}d ago`;
	}

	function getMetricName(metricId: string): string {
		const metric = data.metrics.find((m: Metric) => m.id === metricId);
		return metric?.name ?? 'Unknown';
	}

	function getMetricByEntry(entry: Entry): Metric | undefined {
		return data.metrics.find((m: Metric) => m.id === entry.metricId);
	}

	// ---------- Derived ----------

	const completedCount = $derived(
		data.metrics.filter((m: Metric) => isGoalMet(m)).length
	);

	const recentNonToday = $derived(
		data.recentEntries.filter((e: Entry) => {
			const entryDate = new Date(e.date);
			const today = new Date();
			today.setHours(0, 0, 0, 0);
			return entryDate < today;
		}).slice(0, 8)
	);
</script>

<svelte:head>
	<title>Dashboard - Tracker</title>
</svelte:head>

<div class="max-w-2xl mx-auto px-6 py-10">
	<!-- Header -->
	<div class="mb-10">
		<p class="text-sm text-muted-foreground mb-1">Today</p>
		<h1 class="text-2xl font-semibold tracking-tight">{formatDate(new Date())}</h1>
		<p class="text-sm text-muted-foreground mt-2">
			{completedCount}/{data.metrics.length} goals completed
		</p>
	</div>

	<!-- Action Buttons -->
	<div class="flex gap-3 mb-10">
		<Button.Root href="/entry" class="cursor-pointer">
			<Plus class="w-4 h-4 mr-2" />
			Log Entry
		</Button.Root>
		<Button.Root href="/metrics" variant="outline" class="cursor-pointer">
			<Settings class="w-4 h-4 mr-2" />
			Metrics
		</Button.Root>
	</div>

	{#if data.metrics.length === 0}
		<!-- Empty state -->
		<div class="border border-dashed border-border rounded-xl p-12 text-center">
			<p class="text-muted-foreground mb-4">No metrics yet. Create some to start tracking.</p>
			<Button.Root href="/metrics" variant="outline" class="cursor-pointer">
				Set Up Metrics
			</Button.Root>
		</div>
	{:else}
		<!-- Today's Summary -->
		<section class="mb-12">
			<h2 class="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-5">Today's Progress</h2>
			<div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
				{#each data.metrics as metric, index}
					{@const MetricIcon = getMetricIcon(metric, index)}
					{@const progress = getProgress(metric)}
					{@const color = getMetricColorHex(metric, index)}
					{@const completed = isGoalMet(metric)}
					<a
						href="/metrics/{metric.id}"
						class="group bg-background border border-border rounded-xl p-5 flex flex-col items-center gap-3 hover:border-muted-foreground transition-colors"
					>
						<ProgressRing.Root
							value={progress}
							size={64}
							strokeWidth={5}
							color={completed ? '#22c55e' : color}
							trackColor="var(--color-muted)"
						>
							{#if completed}
								<Check class="w-5 h-5 text-green-500" />
							{:else}
								<MetricIcon class="w-5 h-5 text-muted-foreground" />
							{/if}
						</ProgressRing.Root>
						<div class="text-center">
							<p class="text-xs text-muted-foreground">{metric.name}</p>
							<p class="text-sm font-medium mt-0.5">
								{formatTodayDisplay(metric)}
								{#if metric.unit}
									<span class="text-muted-foreground font-normal">{metric.unit}</span>
								{/if}
							</p>
						</div>
					</a>
				{/each}
			</div>
		</section>

		<!-- Quick Log -->
		<section class="mb-12">
			<h2 class="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-5">Quick Log</h2>
			<div class="space-y-2">
				{#each data.metrics as metric, index}
					{@const MetricIcon = getMetricIcon(metric, index)}
					{@const completed = isGoalMet(metric)}
					<div class="flex items-center justify-between py-3 px-4 rounded-lg bg-background border border-border">
						<div class="flex items-center gap-3">
							<MetricIcon class="w-5 h-5 text-muted-foreground" />
							<span class="text-sm font-medium">{metric.name}</span>
							{#if completed}
								<Check class="w-4 h-4 text-green-500" />
							{/if}
						</div>
						<form method="POST" action="?/quickLog" use:enhance>
							<input type="hidden" name="metricId" value={metric.id} />
							<input type="hidden" name="value" value="done" />
							<Button.Root
								type="submit"
								size="sm"
								variant={completed ? 'outline' : 'default'}
								class="cursor-pointer"
							>
								<Plus class="w-3.5 h-3.5 mr-1" />
								Log
							</Button.Root>
						</form>
					</div>
				{/each}
			</div>
		</section>

		<!-- Recent Activity -->
		{#if recentNonToday.length > 0}
			<section>
				<div class="flex items-center justify-between mb-5">
					<h2 class="text-sm font-medium text-muted-foreground uppercase tracking-wider">Recent Activity</h2>
				</div>
				<div class="space-y-1">
					{#each recentNonToday as entry}
						{@const metric = getMetricByEntry(entry)}
						{@const entryIndex = metric ? data.metrics.indexOf(metric) : 0}
						{@const EntryIcon = metric ? getMetricIcon(metric, entryIndex) : Clock}
						<div class="flex items-center justify-between py-2.5 px-4 rounded-lg">
							<div class="flex items-center gap-3">
								<EntryIcon class="w-4 h-4 text-muted-foreground" />
								<span class="text-sm">{getMetricName(entry.metricId)}</span>
								{#if entry.value && entry.value !== 'done'}
									<span class="text-sm text-muted-foreground">{entry.value}{metric?.unit ? ` ${metric.unit}` : ''}</span>
								{/if}
							</div>
							<span class="text-xs text-muted-foreground">{formatTimeAgo(entry.date)}</span>
						</div>
					{/each}
				</div>
			</section>
		{/if}
	{/if}
</div>
