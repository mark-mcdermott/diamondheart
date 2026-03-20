<script lang="ts">
	import { Dumbbell, Apple, Activity, BarChart3, Target, Smartphone } from 'lucide-svelte';
</script>

<svelte:head>
	<title>About - Ortholinear</title>
	<meta name="description" content="Ortholinear is an all-in-one fitness and health tracking platform." />
</svelte:head>

<div class="max-w-4xl mx-auto px-6 py-16">
	<h1 class="text-4xl font-semibold tracking-tight">About Ortholinear</h1>
	<p class="text-muted-foreground text-lg mt-4 max-w-2xl">
		One platform for everything health and fitness. Track your workouts, log your meals,
		monitor your habits, and see your progress over time.
	</p>

	<div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
		<div class="border border-border rounded-lg p-5">
			<Dumbbell class="w-5 h-5 text-blue-600 mb-3" />
			<h3 class="font-semibold mb-1">Strength Training</h3>
			<p class="text-sm text-muted-foreground">Log sets, reps, and weight. Auto-detect personal records and track progress across exercises.</p>
		</div>
		<div class="border border-border rounded-lg p-5">
			<Apple class="w-5 h-5 text-green-600 mb-3" />
			<h3 class="font-semibold mb-1">Nutrition</h3>
			<p class="text-sm text-muted-foreground">Search thousands of foods, log meals with macros, and save favorites for quick re-logging.</p>
		</div>
		<div class="border border-border rounded-lg p-5">
			<Activity class="w-5 h-5 text-red-500 mb-3" />
			<h3 class="font-semibold mb-1">Health Metrics</h3>
			<p class="text-sm text-muted-foreground">Track water, sleep, steps, and any custom metric. Set daily goals and watch your streaks grow.</p>
		</div>
		<div class="border border-border rounded-lg p-5">
			<BarChart3 class="w-5 h-5 text-purple-600 mb-3" />
			<h3 class="font-semibold mb-1">Progress Dashboard</h3>
			<p class="text-sm text-muted-foreground">See today's numbers at a glance with progress rings, quick-log buttons, and daily summaries.</p>
		</div>
		<div class="border border-border rounded-lg p-5">
			<Target class="w-5 h-5 text-amber-600 mb-3" />
			<h3 class="font-semibold mb-1">Goals</h3>
			<p class="text-sm text-muted-foreground">Set targets for any metric and track your progress. Daily, weekly, or custom goal periods.</p>
		</div>
		<div class="border border-border rounded-lg p-5">
			<Smartphone class="w-5 h-5 text-cyan-600 mb-3" />
			<h3 class="font-semibold mb-1">Mobile Ready</h3>
			<p class="text-sm text-muted-foreground">Works on any device. Native iOS app with home screen widgets for quick logging on the go.</p>
		</div>
	</div>

	<div class="mt-16 border-t border-border pt-12">
		<h2 class="text-2xl font-semibold mb-4">Built for real use</h2>
		<p class="text-muted-foreground max-w-2xl">
			Ortholinear started as a personal project to consolidate fitness tracking into one place
			instead of jumping between five different apps. It's built with SvelteKit, runs on Cloudflare,
			and is designed to be fast, simple, and stay out of your way.
		</p>
	</div>
</div>
