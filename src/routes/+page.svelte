<svelte:head>
	<title>Ortholinear</title>
	<meta name="description" content="Ortholinear - an activity and habit tracking dashboard with progress visualization" />
</svelte:head>

<div class="max-w-4xl mx-auto px-6 pb-16">
	<!-- Hero Section -->
	<div class="py-12 sm:py-16 text-center">
		<p class="text-xl text-muted-foreground mt-4 max-w-2xl mx-auto">
			<span class="font-semibold">Ortholinear</span> is an activity and habit tracking dashboard with progress visualization, running on a server-side rendered SvelteKit app with real-time data.
		</p>
	</div>

	<!-- Module & Add-ons (3 columns) -->
	<div class="py-8">
		<div class="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto px-4">
			<div class="text-left">
				<p class="text-lg"><span class="font-semibold">Module:</span> 📊 Tracker</p>
				<p class="text-sm text-muted-foreground mt-1">Activity and habit tracking dashboard with progress visualization</p>
			</div>
			<div class="text-left md:col-span-2">
				<h3 class="text-lg font-semibold mb-3">Add-ons</h3>
				<div class="grid sm:grid-cols-2 gap-2">
					<div class="flex gap-3 items-center">
						<div class="text-xl">🔐</div>
						<span class="font-medium">User Authentication</span>
					</div>
					<div class="flex gap-3 items-center">
						<div class="text-xl">🌓</div>
						<span class="font-medium">Light/Dark/System Theme Toggle</span>
					</div>
					<div class="flex gap-3 items-center">
						<div class="text-xl">💼</div>
						<span class="font-medium">Users from The Office</span>
					</div>
					<div class="flex gap-3 items-center">
						<div class="text-xl">🎨</div>
						<span class="font-medium">ThemeForseen live color & font preview</span>
					</div>
					<div class="flex gap-3 items-center">
						<div class="text-xl">👕</div>
						<span class="font-medium">Merchandise Store</span>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Features Section -->
	<div class="py-8">
		<h2 class="text-2xl font-semibold tracking-tight text-center mb-8">Stay on Track</h2>
		<div class="grid sm:grid-cols-3 gap-6">
			<div class="text-center">
				<div class="text-3xl mb-3">✅</div>
				<h3 class="font-medium mb-1">Habit Tracking</h3>
				<p class="text-sm text-muted-foreground">Build better habits with daily check-ins and streak tracking.</p>
			</div>
			<div class="text-center">
				<div class="text-3xl mb-3">📈</div>
				<h3 class="font-medium mb-1">Progress Charts</h3>
				<p class="text-sm text-muted-foreground">Beautiful visualizations show your progress over time. See how far you've come.</p>
			</div>
			<div class="text-center">
				<div class="text-3xl mb-3">🎯</div>
				<h3 class="font-medium mb-1">Goal Setting</h3>
				<p class="text-sm text-muted-foreground">Set targets and track your journey toward achieving them.</p>
			</div>
		</div>
	</div>

	<!-- CTA Section -->
	<div class="py-8 mt-4">
		<div class="card text-center py-8">
			<h2 class="text-2xl font-semibold tracking-tight mb-2 mt-0">Start Tracking</h2>
			<p class="text-muted-foreground mb-6">Build better habits and achieve your goals with data-driven insights.</p>
			<a href="/tracker" class="btn btn-dark">View Dashboard</a>
		</div>
	</div>
</div>
