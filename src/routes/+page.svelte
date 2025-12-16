<script lang="ts">
	import { Button } from '$lib/components/ui';
	import { Calendar, TrendingUp, Target, Plus, BarChart3, ListChecks, Goal } from 'lucide-svelte';
</script>

<svelte:head>
	<title>Ortholinear - Track What Matters</title>
	<meta name="description" content="Track your habits, metrics, and goals. Build better routines with simple, powerful tracking." />
</svelte:head>

<div class="max-w-4xl mx-auto px-6 py-8">
	<!-- Hero Section -->
	<div class="text-center mb-12">
		<h1 class="text-4xl md:text-5xl font-bold tracking-tight mb-4">Track what matters</h1>
		<p class="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
			Build better habits and reach your goals with simple, powerful tracking.
			See your progress at a glance.
		</p>
		<div class="flex gap-3 justify-center">
			<Button.Root href="/signup" class="cursor-pointer">Get Started</Button.Root>
			<Button.Root href="/login" variant="outline" class="cursor-pointer">Sign In</Button.Root>
		</div>
	</div>

	<!-- Device Mockup Section -->
	<div class="mb-20">
		<div class="relative mx-auto max-w-3xl">
			<!-- Browser Frame -->
			<div class="rounded-xl border border-border bg-muted/30 shadow-2xl overflow-hidden">
				<!-- Browser Top Bar -->
				<div class="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/50">
					<div class="flex gap-1.5">
						<div class="w-3 h-3 rounded-full bg-red-400"></div>
						<div class="w-3 h-3 rounded-full bg-yellow-400"></div>
						<div class="w-3 h-3 rounded-full bg-green-400"></div>
					</div>
					<div class="flex-1 mx-4">
						<div class="bg-background rounded-md px-3 py-1 text-xs text-muted-foreground text-center max-w-xs mx-auto">
							tracker.app/dashboard
						</div>
					</div>
					<div class="w-16"></div>
				</div>

				<!-- Dashboard Preview Content -->
				<div class="bg-background p-6">
					<!-- Dashboard Header -->
					<div class="flex items-center justify-between mb-6">
						<div>
							<h2 class="text-xl font-semibold">Dashboard</h2>
							<p class="text-sm text-muted-foreground">Wed, Dec 11 - Track your progress</p>
						</div>
						<div class="flex gap-2">
							<div class="px-3 py-1.5 text-xs border border-border rounded-md bg-background">Settings</div>
							<div class="px-3 py-1.5 text-xs bg-foreground text-background rounded-md flex items-center gap-1">
								<Plus class="w-3 h-3" /> Log Entry
							</div>
						</div>
					</div>

					<!-- Stats Grid -->
					<div class="grid grid-cols-4 gap-3 mb-6">
						<div class="bg-background border border-border rounded-lg p-3">
							<Calendar class="w-4 h-4 text-blue-600 mb-1" />
							<p class="text-lg font-bold">5</p>
							<p class="text-xs text-muted-foreground">today</p>
						</div>
						<div class="bg-background border border-border rounded-lg p-3">
							<TrendingUp class="w-4 h-4 text-green-600 mb-1" />
							<p class="text-lg font-bold">23</p>
							<p class="text-xs text-muted-foreground">this week</p>
						</div>
						<div class="bg-background border border-border rounded-lg p-3">
							<Target class="w-4 h-4 text-purple-600 mb-1" />
							<p class="text-lg font-bold">4</p>
							<p class="text-xs text-muted-foreground">tracked</p>
						</div>
						<div class="bg-background border border-border rounded-lg p-3">
							<Target class="w-4 h-4 text-amber-600 mb-1" />
							<p class="text-lg font-bold">3</p>
							<p class="text-xs text-muted-foreground">goals</p>
						</div>
					</div>

					<!-- Sample Entries Preview -->
					<div class="border border-border rounded-lg p-4">
						<div class="flex items-center justify-between py-2 border-b border-border">
							<span class="text-sm">Water intake</span>
							<span class="text-sm font-medium">8 glasses</span>
						</div>
						<div class="flex items-center justify-between py-2 border-b border-border">
							<span class="text-sm">Exercise</span>
							<span class="text-sm font-medium">45 min</span>
						</div>
						<div class="flex items-center justify-between py-2">
							<span class="text-sm">Reading</span>
							<span class="text-sm font-medium">30 pages</span>
						</div>
					</div>
				</div>
			</div>

			<!-- Decorative gradient behind -->
			<div class="absolute -inset-4 -z-10 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-amber-500/10 rounded-2xl blur-2xl"></div>
		</div>
	</div>

	<!-- How It Works Section -->
	<div class="mb-16">
		<h2 class="text-2xl font-semibold text-center mb-10">How it works</h2>
		<div class="grid md:grid-cols-3 gap-8">
			<div class="text-center">
				<div class="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-4">
					<ListChecks class="w-6 h-6 text-blue-600" />
				</div>
				<h3 class="font-semibold mb-2">1. Create metrics</h3>
				<p class="text-sm text-muted-foreground">
					Set up the things you want to track. Water intake, exercise, reading, sleep - anything.
				</p>
			</div>
			<div class="text-center">
				<div class="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
					<BarChart3 class="w-6 h-6 text-green-600" />
				</div>
				<h3 class="font-semibold mb-2">2. Log daily</h3>
				<p class="text-sm text-muted-foreground">
					Quick and easy logging. Just enter your numbers and you're done.
				</p>
			</div>
			<div class="text-center">
				<div class="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mx-auto mb-4">
					<Goal class="w-6 h-6 text-purple-600" />
				</div>
				<h3 class="font-semibold mb-2">3. See progress</h3>
				<p class="text-sm text-muted-foreground">
					Watch your streaks grow and goals get hit. Stay motivated with visual progress.
				</p>
			</div>
		</div>
	</div>

	<!-- CTA Section - temporarily disabled
	<div class="text-center py-12 border-t border-border">
		<h2 class="text-2xl font-semibold mb-4">Ready to start tracking?</h2>
		<p class="text-muted-foreground mb-6">Free to use. No credit card required.</p>
		<Button.Root href="/signup" class="cursor-pointer">Create your account</Button.Root>
	</div>
	-->
</div>
