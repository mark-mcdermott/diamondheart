<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui';
	import { Plus, TrendingUp, Target, Calendar, Settings } from 'lucide-svelte';

	let { data } = $props();

	function formatDate(date: Date | string) {
		const d = new Date(date);
		return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
	}

	const metricsTracked = $derived(new Set(data.todayEntries.map((e: { metricId: string }) => e.metricId)).size);
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
			<Button.Root variant="outline" onclick={() => goto('/tracker/dashboard/admin')} class="cursor-pointer">
				<Settings class="w-4 h-4 mr-2" />
				Settings
			</Button.Root>
			<Button.Root onclick={() => goto('/tracker/dashboard/log')} class="cursor-pointer">
				<Plus class="w-4 h-4 mr-2" />
				Log Entry
			</Button.Root>
		</div>
	</div>

	<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
		<div class="bg-background border border-border rounded-lg p-4">
			<Calendar class="w-5 h-5 text-blue-600 mb-2" />
			<p class="text-2xl font-bold">{data.todayEntries.length}</p>
			<p class="text-sm text-muted-foreground">today</p>
		</div>
		<div class="bg-background border border-border rounded-lg p-4">
			<TrendingUp class="w-5 h-5 text-green-600 mb-2" />
			<p class="text-2xl font-bold">{data.recentEntries.length}</p>
			<p class="text-sm text-muted-foreground">this week</p>
		</div>
		<div class="bg-background border border-border rounded-lg p-4">
			<Target class="w-5 h-5 text-purple-600 mb-2" />
			<p class="text-2xl font-bold">{metricsTracked}</p>
			<p class="text-sm text-muted-foreground">tracked</p>
		</div>
		<div class="bg-background border border-border rounded-lg p-4">
			<Target class="w-5 h-5 text-amber-600 mb-2" />
			<p class="text-2xl font-bold">{data.goals.length}</p>
			<p class="text-sm text-muted-foreground">goals</p>
		</div>
	</div>

	{#if data.categories.length === 0}
		<div class="border border-dashed border-border rounded-lg p-8 text-center">
			<p class="text-muted-foreground mb-4">Set up categories and metrics to start tracking.</p>
			<Button.Root variant="outline" onclick={() => goto('/tracker/dashboard/admin')} class="cursor-pointer">
				Set Up Tracker
			</Button.Root>
		</div>
	{/if}
</div>
