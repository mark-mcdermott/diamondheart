<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui';
	import { Plus, Settings, Activity, Check, Brain, Droplets, Dumbbell, Heart, Flame, BookOpen, Moon, Sun, Apple, Footprints } from 'lucide-svelte';
	import type { Component } from 'svelte';

	let { data } = $props();

	// Icon mapping by metric slug
	const iconMap: Record<string, Component<{ class?: string }>> = {
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

	// Fallback icons to cycle through for unmapped metrics
	const fallbackIcons: Component<{ class?: string }>[] = [Heart, Flame, BookOpen, Moon, Sun, Apple, Footprints, Brain, Droplets, Dumbbell];

	function getMetricIcon(metric: Metric, index: number): Component<{ class?: string }> {
		return iconMap[metric.slug] ?? fallbackIcons[index % fallbackIcons.length];
	}

	// Track today's entry count per metric
	function getTodayEntryCount(metricId: string): number {
		return data.todayEntries.filter((e: { metricId: string }) => e.metricId === metricId).length;
	}

	interface Metric {
		id: string;
		slug: string;
		name: string;
		icon: string | null;
		color: string | null;
		dailyGoal: number | null;
	}

	function formatDate(date: Date | string) {
		const d = new Date(date);
		return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
	}

	// Calendar helpers
	const today = new Date();
	const currentMonth = today.getMonth();
	const currentYear = today.getFullYear();

	function getCalendarDays() {
		const firstDay = new Date(currentYear, currentMonth, 1);
		const lastDay = new Date(currentYear, currentMonth + 1, 0);
		const daysInMonth = lastDay.getDate();
		const startDayOfWeek = firstDay.getDay();

		const days: (number | null)[] = [];

		// Add empty slots for days before the 1st
		for (let i = 0; i < startDayOfWeek; i++) {
			days.push(null);
		}

		// Add the days of the month
		for (let i = 1; i <= daysInMonth; i++) {
			days.push(i);
		}

		return days;
	}

	const calendarDays = getCalendarDays();

	// Default colors to cycle through for metrics without a color
	const defaultColors = [
		'bg-blue-600',
		'bg-green-600',
		'bg-purple-600',
		'bg-amber-600',
		'bg-rose-600',
		'bg-cyan-600',
		'bg-indigo-600',
		'bg-emerald-600'
	];

	// Get days where daily goal is met for a metric
	function getDaysWithGoalMet(metricId: string, dailyGoal: number | null): Set<number> {
		const counts = new Map<number, number>();
		for (const entry of data.monthEntries) {
			if (entry.metricId === metricId) {
				const entryDate = new Date(entry.date);
				if (entryDate.getMonth() === currentMonth && entryDate.getFullYear() === currentYear) {
					const day = entryDate.getDate();
					counts.set(day, (counts.get(day) || 0) + 1);
				}
			}
		}
		const goal = dailyGoal ?? 1;
		const days = new Set<number>();
		for (const [day, count] of counts) {
			if (count >= goal) {
				days.add(day);
			}
		}
		return days;
	}

	// Get color class for a metric
	function getMetricColor(metric: Metric, index: number): string {
		if (metric.color) {
			return `bg-${metric.color}-600`;
		}
		return defaultColors[index % defaultColors.length];
	}

</script>

<svelte:head>
	<title>Dashboard - Tracker</title>
</svelte:head>

<div class="max-w-4xl mx-auto px-6 py-8">
	<div class="flex items-center justify-between mb-8">
		<div>
			<h1 class="text-3xl font-semibold tracking-tight">Dashboard</h1>
			<p class="text-muted-foreground mt-1">{formatDate(new Date())} - Track your progress</p>
		</div>
		<div class="flex gap-2">
			<Button.Root variant="outline" onclick={() => goto('/metrics')} class="cursor-pointer">
				<Settings class="w-4 h-4 mr-2" />
				Metrics
			</Button.Root>
			<Button.Root onclick={() => goto('/entry')} class="cursor-pointer">
				<Plus class="w-4 h-4 mr-2" />
				Log Entry
			</Button.Root>
		</div>
	</div>

	{#if data.metrics.length > 0}
		<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8">
			{#each data.metrics as metric, index}
				{@const daysWithGoal = getDaysWithGoalMet(metric.id, metric.dailyGoal)}
				{@const colorClass = getMetricColor(metric, index)}
				{@const MetricIcon = getMetricIcon(metric, index)}
				<div class="bg-background border border-border rounded-lg p-4">
					<div class="flex items-center justify-between mb-2">
						<MetricIcon class="w-8 h-8 text-muted-foreground" />
						<span class="text-sm text-muted-foreground">{metric.name.toLowerCase()}</span>
					</div>
					<div class="grid grid-cols-7 gap-px text-center text-[10px]">
						{#each ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as dayLabel}
							<span class="text-muted-foreground">{dayLabel}</span>
						{/each}
						{#each calendarDays as day}
							<span class={day && daysWithGoal.has(day) ? `${colorClass} text-white rounded-full` : day ? 'text-muted-foreground' : ''}>
								{day ?? ''}
							</span>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Quick Log Card -->
	{#if data.metrics.length > 0}
		<div class="bg-background border border-border rounded-lg p-6 mb-8">
			<h2 class="text-lg font-semibold mb-4">Quick Log</h2>
			<div class="space-y-3">
				{#each data.metrics as metric, index}
					{@const todayCount = getTodayEntryCount(metric.id)}
					{@const goalMet = todayCount >= (metric.dailyGoal ?? 1)}
					{@const QuickLogIcon = getMetricIcon(metric, index)}
					<div class="flex items-center justify-between py-2 {index < data.metrics.length - 1 ? 'border-b border-border' : ''}">
						<div class="flex items-center gap-3">
							<QuickLogIcon class="w-6 h-6 text-muted-foreground" />
							<span class="font-medium">{metric.name}</span>
							<span class="text-sm text-muted-foreground">
								{todayCount}/{metric.dailyGoal ?? 1} today
							</span>
							{#if goalMet}
								<Check class="w-4 h-4 text-green-600" />
							{/if}
						</div>
						<form method="POST" action="?/quickLog" use:enhance>
							<input type="hidden" name="metricId" value={metric.id} />
							<input type="hidden" name="value" value="done" />
							<Button.Root type="submit" size="sm" variant={goalMet ? 'outline' : 'default'} class="cursor-pointer">
								<Plus class="w-4 h-4 mr-1" />
								Log
							</Button.Root>
						</form>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	{#if data.metrics.length === 0}
		<div class="border border-dashed border-border rounded-lg p-8 text-center">
			<p class="text-muted-foreground mb-4">No metrics yet. Create metrics to start tracking.</p>
			<Button.Root variant="outline" onclick={() => goto('/metrics')} class="cursor-pointer">
				Set Up Metrics
			</Button.Root>
		</div>
	{/if}
</div>
