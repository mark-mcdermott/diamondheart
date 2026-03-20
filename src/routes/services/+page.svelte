<script lang="ts">
	import { Button } from '$lib/components/ui';
	import { Dumbbell, Apple, Activity, BarChart3, Zap, Star } from 'lucide-svelte';
</script>

<svelte:head>
	<title>Features - Ortholinear</title>
	<meta name="description" content="Everything you need to track your fitness and health in one place." />
</svelte:head>

<div class="max-w-4xl mx-auto px-6 py-16">
	<h1 class="text-4xl font-semibold tracking-tight">Features</h1>
	<p class="text-muted-foreground text-lg mt-4 max-w-2xl">
		Everything you need to track your fitness and health in one place.
	</p>

	<div class="space-y-12 mt-12">
		<div class="flex gap-6 items-start">
			<div class="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
				<Dumbbell class="w-5 h-5 text-blue-600" />
			</div>
			<div>
				<h3 class="font-semibold text-lg mb-1">Workout Logging</h3>
				<p class="text-muted-foreground">
					Log exercises with sets, reps, and weight. Track 46+ exercises across chest, back, legs,
					shoulders, arms, and core. Personal records are detected automatically.
				</p>
			</div>
		</div>

		<div class="flex gap-6 items-start">
			<div class="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
				<Apple class="w-5 h-5 text-green-600" />
			</div>
			<div>
				<h3 class="font-semibold text-lg mb-1">Food & Macro Tracking</h3>
				<p class="text-muted-foreground">
					Search the USDA food database, log meals by type (breakfast, lunch, dinner, snacks),
					and track calories, protein, carbs, and fat. Save favorites and custom foods for quick access.
				</p>
			</div>
		</div>

		<div class="flex gap-6 items-start">
			<div class="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
				<Activity class="w-5 h-5 text-red-500" />
			</div>
			<div>
				<h3 class="font-semibold text-lg mb-1">Custom Metric Tracking</h3>
				<p class="text-muted-foreground">
					Track anything: water, sleep, mood, weight, steps, or whatever matters to you.
					Create custom metrics with your own units and daily goals.
				</p>
			</div>
		</div>

		<div class="flex gap-6 items-start">
			<div class="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
				<BarChart3 class="w-5 h-5 text-purple-600" />
			</div>
			<div>
				<h3 class="font-semibold text-lg mb-1">Clean Dashboard</h3>
				<p class="text-muted-foreground">
					A simple daily view with progress rings, quick-log buttons, and today's key numbers.
					No clutter, just the data you need.
				</p>
			</div>
		</div>

		<div class="flex gap-6 items-start">
			<div class="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
				<Star class="w-5 h-5 text-amber-600" />
			</div>
			<div>
				<h3 class="font-semibold text-lg mb-1">Favorites & Quick Log</h3>
				<p class="text-muted-foreground">
					Star individual foods or save entire meals as favorites.
					Re-log a full meal with one tap instead of searching every time.
				</p>
			</div>
		</div>

		<div class="flex gap-6 items-start">
			<div class="w-10 h-10 rounded-lg bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center shrink-0">
				<Zap class="w-5 h-5 text-cyan-600" />
			</div>
			<div>
				<h3 class="font-semibold text-lg mb-1">Fast & Lightweight</h3>
				<p class="text-muted-foreground">
					Built with SvelteKit and deployed on Cloudflare's edge network.
					Pages load instantly, forms submit without full reloads.
				</p>
			</div>
		</div>
	</div>

	<div class="mt-16 text-center border-t border-border pt-12">
		<h2 class="text-2xl font-semibold mb-4">Ready to get started?</h2>
		<p class="text-muted-foreground mb-6">Free to use. Create an account and start tracking today.</p>
		<Button.Root href="/signup" class="cursor-pointer">Create your account</Button.Root>
	</div>
</div>
