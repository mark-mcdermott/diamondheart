<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button, Card, Input, Label, ProgressRing } from '$lib/components/ui';
	import { Search, Plus, Trash2, Coffee, Sun, Utensils, Moon, Cookie, X, ChevronDown, ChevronUp, Star, Heart, BookmarkPlus } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';

	let { data, form } = $props();

	// Calorie / macro goals (could be user-configurable later)
	const goals = { calories: 2000, protein: 150, carbs: 250, fat: 65 };

	// Search state
	let searchQuery = $state('');
	let searchResults = $state<SearchResult[]>([]);
	let searching = $state(false);
	let showSearch = $state(false);
	let activeMeal = $state<string>('breakfast');
	let searchInputEl = $state<HTMLInputElement>(null!);

	// Custom food form
	let showCustomForm = $state(false);

	// Save meal modal
	let showSaveMeal = $state(false);
	let saveMealType = $state('');
	let saveMealName = $state('');

	// Collapsed meal sections
	let expandedMeals = $state<Record<string, boolean>>({
		breakfast: true,
		lunch: true,
		dinner: true,
		snack: true
	});

	interface SearchResult {
		fdcId: string;
		description: string;
		calories: number;
		protein: number;
		carbs: number;
		fat: number;
		servingSize: number;
		servingUnit: string;
	}

	const mealConfig = [
		{ key: 'breakfast', label: 'Breakfast', icon: Coffee, color: '#f59e0b' },
		{ key: 'lunch', label: 'Lunch', icon: Sun, color: '#22c55e' },
		{ key: 'dinner', label: 'Dinner', icon: Utensils, color: '#3b82f6' },
		{ key: 'snack', label: 'Snacks', icon: Cookie, color: '#a855f7' }
	];

	let searchTimeout: ReturnType<typeof setTimeout>;

	function handleSearchInput(e: Event) {
		const value = (e.target as HTMLInputElement).value;
		searchQuery = value;
		clearTimeout(searchTimeout);
		if (value.trim().length < 2) {
			searchResults = [];
			return;
		}
		searching = true;
		searchTimeout = setTimeout(() => doSearch(value), 300);
	}

	async function doSearch(query: string) {
		try {
			const q = query.toLowerCase();

			// Search custom foods locally (always works, no API key needed)
			const foods = data.customFoods ?? [];
			const customMatches: SearchResult[] = foods
				.filter((f) => f.name.toLowerCase().includes(q))
				.map((f) => ({
					fdcId: `custom-${f.id}`,
					description: f.name,
					calories: f.calories,
					protein: f.protein,
					carbs: f.carbs,
					fat: f.fat,
					servingSize: f.servingSize,
					servingUnit: f.servingUnit
				}));

			// Try USDA API search (may fail if no API key)
			let apiResults: SearchResult[] = [];
			try {
				const res = await fetch(`/api/food/search?q=${encodeURIComponent(query)}`);
				if (res.ok) {
					const json = await res.json();
					apiResults = json.foods ?? [];
				}
			} catch {
				// USDA API unavailable, that's fine
			}

			// Custom foods first, then API results
			searchResults = [...customMatches, ...apiResults];
		} catch (err) {
			console.error('Food search error:', err);
			searchResults = [];
		} finally {
			searching = false;
		}
	}

	function openSearch(meal: string) {
		activeMeal = meal;
		showSearch = true;
		searchQuery = '';
		searchResults = [];
		// Focus the search input after the modal renders
		setTimeout(() => searchInputEl?.focus(), 50);
	}

	function closeSearch() {
		showSearch = false;
		searchQuery = '';
		searchResults = [];
		showCustomForm = false;
	}

	function getMealItems(mealKey: string) {
		return data.meals[mealKey] || [];
	}

	function getMealTotals(mealKey: string) {
		const items = getMealItems(mealKey);
		return items.reduce(
			(acc: { calories: number; protein: number; carbs: number; fat: number }, item: { calories: number; protein: number; carbs: number; fat: number; quantity: number }) => ({
				calories: acc.calories + item.calories * item.quantity,
				protein: acc.protein + item.protein * item.quantity,
				carbs: acc.carbs + item.carbs * item.quantity,
				fat: acc.fat + item.fat * item.quantity
			}),
			{ calories: 0, protein: 0, carbs: 0, fat: 0 }
		);
	}

	function toggleMeal(key: string) {
		expandedMeals[key] = !expandedMeals[key];
	}

	function isFavorited(name: string): string | null {
		const fav = data.favoriteFoods.find((f: { name: string }) => f.name === name);
		return fav ? fav.id : null;
	}

	function openSaveMeal(mealKey: string) {
		saveMealType = mealKey;
		saveMealName = '';
		showSaveMeal = true;
	}

	$effect(() => {
		if (form?.success) {
			toast.success('Food logged');
			closeSearch();
		}
		if (form?.customFoodCreated) {
			toast.success('Custom food saved');
			showCustomForm = false;
		}
		if (form?.favorited) {
			toast.success('Added to favorites');
		}
		if (form?.mealSaved) {
			toast.success('Meal saved to favorites');
			showSaveMeal = false;
		}
		if (form?.error) {
			toast.error(form.error);
		}
	});
</script>

<svelte:head>
	<title>Food Log - Ortholinear</title>
</svelte:head>

<div class="max-w-4xl mx-auto px-6 py-8">
	<!-- Header -->
	<div class="flex items-center justify-between mb-8">
		<div>
			<h1 class="text-3xl font-semibold tracking-tight">Food Log</h1>
			<p class="text-muted-foreground mt-1">
				{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
			</p>
		</div>
	</div>

	<!-- Daily Summary -->
	<div class="bg-background border border-border rounded-lg p-6 mb-8">
		<div class="grid grid-cols-2 sm:grid-cols-4 gap-6">
			<div class="flex flex-col items-center">
				<ProgressRing.Root
					value={Math.min(100, (data.totals.calories / goals.calories) * 100)}
					size={80}
					strokeWidth={6}
					color="#3b82f6"
				>
					<span class="text-sm font-semibold">{data.totals.calories}</span>
				</ProgressRing.Root>
				<span class="text-xs text-muted-foreground mt-2">Calories</span>
				<span class="text-xs text-muted-foreground">{goals.calories} goal</span>
			</div>
			<div class="flex flex-col items-center">
				<ProgressRing.Root
					value={Math.min(100, (data.totals.protein / goals.protein) * 100)}
					size={80}
					strokeWidth={6}
					color="#22c55e"
				>
					<span class="text-sm font-semibold">{data.totals.protein}g</span>
				</ProgressRing.Root>
				<span class="text-xs text-muted-foreground mt-2">Protein</span>
				<span class="text-xs text-muted-foreground">{goals.protein}g goal</span>
			</div>
			<div class="flex flex-col items-center">
				<ProgressRing.Root
					value={Math.min(100, (data.totals.carbs / goals.carbs) * 100)}
					size={80}
					strokeWidth={6}
					color="#f59e0b"
				>
					<span class="text-sm font-semibold">{data.totals.carbs}g</span>
				</ProgressRing.Root>
				<span class="text-xs text-muted-foreground mt-2">Carbs</span>
				<span class="text-xs text-muted-foreground">{goals.carbs}g goal</span>
			</div>
			<div class="flex flex-col items-center">
				<ProgressRing.Root
					value={Math.min(100, (data.totals.fat / goals.fat) * 100)}
					size={80}
					strokeWidth={6}
					color="#ef4444"
				>
					<span class="text-sm font-semibold">{data.totals.fat}g</span>
				</ProgressRing.Root>
				<span class="text-xs text-muted-foreground mt-2">Fat</span>
				<span class="text-xs text-muted-foreground">{goals.fat}g goal</span>
			</div>
		</div>
	</div>

	<!-- Favorite Meals (quick re-log a whole meal) -->
	{#if data.favoriteMeals.length > 0}
		<div class="bg-background border border-border rounded-lg p-4 mb-4">
			<h3 class="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-1.5">
				<Star class="w-3.5 h-3.5" />
				Favorite Meals
			</h3>
			<div class="space-y-2">
				{#each data.favoriteMeals as favMeal}
					{@const mealCals = favMeal.items.reduce((s: number, i: { calories: number; quantity: number }) => s + i.calories * i.quantity, 0)}
					<div class="flex items-center justify-between py-2 px-3 rounded-md bg-muted/50">
						<div class="flex-1 min-w-0">
							<p class="text-sm font-medium">{favMeal.name}</p>
							<p class="text-xs text-muted-foreground">
								{favMeal.items.length} items &middot; {mealCals} cal
							</p>
						</div>
						<div class="flex items-center gap-1">
							{#each mealConfig as mc}
								<form method="POST" action="?/logFavoriteMeal" use:enhance={() => {
									return async ({ update }) => {
										await update();
										toast.success(`Logged to ${mc.label}`);
									};
								}}>
									<input type="hidden" name="mealId" value={favMeal.id} />
									<input type="hidden" name="mealType" value={mc.key} />
									<Button.Root type="submit" variant="ghost" size="icon-sm" class="cursor-pointer" title="Log to {mc.label}">
										{@const MIcon = mc.icon}
										<MIcon class="w-3.5 h-3.5" />
									</Button.Root>
								</form>
							{/each}
							<form method="POST" action="?/deleteFavoriteMeal" use:enhance={() => {
								return async ({ update }) => {
									await update();
									toast.success('Favorite meal removed');
								};
							}}>
								<input type="hidden" name="mealId" value={favMeal.id} />
								<Button.Root type="submit" variant="ghost" size="icon-sm" class="cursor-pointer text-muted-foreground hover:text-destructive">
									<Trash2 class="w-3.5 h-3.5" />
								</Button.Root>
							</form>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Favorite Foods (quick-add individual starred foods) -->
	{#if data.favoriteFoods.length > 0}
		<div class="bg-background border border-border rounded-lg p-4 mb-4">
			<h3 class="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-1.5">
				<Heart class="w-3.5 h-3.5" />
				Favorite Foods
			</h3>
			<div class="flex flex-wrap gap-2">
				{#each data.favoriteFoods as fav}
					<button
						type="button"
						class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-xs hover:bg-muted/50 cursor-pointer transition-colors"
						onclick={() => {
							openSearch('breakfast');
							searchResults = [{
								fdcId: fav.fdcId || `fav-${fav.id}`,
								description: fav.name,
								calories: fav.calories,
								protein: fav.protein,
								carbs: fav.carbs,
								fat: fav.fat,
								servingSize: fav.servingSize,
								servingUnit: fav.servingUnit
							}];
						}}
					>
						<Star class="w-3 h-3 text-amber-500 fill-amber-500" />
						{fav.name}
						<span class="text-muted-foreground">{fav.calories}cal</span>
					</button>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Meal Sections -->
	{#each mealConfig as meal}
		{@const items = getMealItems(meal.key)}
		{@const mealTotals = getMealTotals(meal.key)}
		{@const MealIcon = meal.icon}
		{@const expanded = expandedMeals[meal.key]}
		<div class="bg-background border border-border rounded-lg mb-4">
			<button
				type="button"
				class="w-full flex items-center justify-between p-4 cursor-pointer"
				onclick={() => toggleMeal(meal.key)}
			>
				<div class="flex items-center gap-3">
					<div class="w-8 h-8 rounded-full flex items-center justify-center" style="background-color: {meal.color}20">
						<MealIcon class="w-4 h-4" style="color: {meal.color}" />
					</div>
					<div class="text-left">
						<span class="font-medium">{meal.label}</span>
						{#if items.length > 0}
							<span class="text-xs text-muted-foreground ml-2">{mealTotals.calories} cal</span>
						{/if}
					</div>
				</div>
				<div class="flex items-center gap-2">
					{#if expanded}
						<ChevronUp class="w-4 h-4 text-muted-foreground" />
					{:else}
						<ChevronDown class="w-4 h-4 text-muted-foreground" />
					{/if}
				</div>
			</button>

			{#if expanded}
				<div class="px-4 pb-4">
					{#if items.length > 0}
						<div class="space-y-2 mb-3">
							{#each items as item}
								<div class="flex items-center justify-between py-2 px-3 rounded-md bg-muted/50">
									<div class="flex-1 min-w-0">
										<p class="text-sm font-medium truncate">{item.name}</p>
										<p class="text-xs text-muted-foreground">
											{item.quantity > 1 ? `${item.quantity} x ` : ''}{item.servingSize}{item.servingUnit}
											&middot; {item.calories * item.quantity} cal
											&middot; {item.protein * item.quantity}p
											&middot; {item.carbs * item.quantity}c
											&middot; {item.fat * item.quantity}f
										</p>
									</div>
									<div class="flex items-center gap-0.5">
										{#if !isFavorited(item.name)}
											<form method="POST" action="?/favoriteFood" use:enhance={() => {
												return async ({ update }) => { await update(); };
											}}>
												<input type="hidden" name="name" value={item.name} />
												<input type="hidden" name="fdcId" value={item.fdcId || ''} />
												<input type="hidden" name="servingSize" value={item.servingSize} />
												<input type="hidden" name="servingUnit" value={item.servingUnit} />
												<input type="hidden" name="calories" value={item.calories} />
												<input type="hidden" name="protein" value={item.protein} />
												<input type="hidden" name="carbs" value={item.carbs} />
												<input type="hidden" name="fat" value={item.fat} />
												<Button.Root type="submit" variant="ghost" size="icon-sm" class="cursor-pointer text-muted-foreground hover:text-amber-500" title="Add to favorites">
													<Star class="w-3.5 h-3.5" />
												</Button.Root>
											</form>
										{:else}
											<form method="POST" action="?/unfavoriteFood" use:enhance={() => {
												return async ({ update }) => { await update(); toast.success('Removed from favorites'); };
											}}>
												<input type="hidden" name="favoriteId" value={isFavorited(item.name)} />
												<Button.Root type="submit" variant="ghost" size="icon-sm" class="cursor-pointer text-amber-500" title="Remove from favorites">
													<Star class="w-3.5 h-3.5 fill-current" />
												</Button.Root>
											</form>
										{/if}
										<form method="POST" action="?/removeFood" use:enhance={() => {
											return async ({ update }) => { await update(); };
										}}>
											<input type="hidden" name="itemId" value={item.id} />
											<Button.Root type="submit" variant="ghost" size="icon-sm" class="cursor-pointer text-muted-foreground hover:text-destructive">
												<Trash2 class="w-3.5 h-3.5" />
											</Button.Root>
										</form>
									</div>
								</div>
							{/each}
						</div>
						<!-- Save meal as favorite -->
						<div class="flex gap-2 mb-3">
							<Button.Root
								variant="ghost"
								size="sm"
								class="cursor-pointer text-muted-foreground text-xs"
								onclick={() => openSaveMeal(meal.key)}
							>
								<BookmarkPlus class="w-3.5 h-3.5 mr-1" />
								Save as favorite meal
							</Button.Root>
						</div>
					{/if}
					<Button.Root
						variant="outline"
						size="sm"
						class="w-full cursor-pointer"
						onclick={() => openSearch(meal.key)}
					>
						<Plus class="w-4 h-4 mr-1" />
						Add Food
					</Button.Root>
				</div>
			{/if}
		</div>
	{/each}

	<!-- Recent Foods -->
	{#if data.recentFoods.length > 0 && !showSearch}
		<div class="bg-background border border-border rounded-lg p-4 mt-6">
			<h3 class="text-sm font-medium text-muted-foreground mb-3">Recent Foods</h3>
			<div class="space-y-1">
				{#each data.recentFoods as recent}
					<button
						type="button"
						class="w-full flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50 cursor-pointer text-left"
						onclick={() => {
							activeMeal = 'snack';
							showSearch = true;
							searchQuery = '';
							searchResults = [{
								fdcId: recent.fdcId || '',
								description: recent.name,
								calories: recent.calories,
								protein: recent.protein,
								carbs: recent.carbs,
								fat: recent.fat,
								servingSize: recent.servingSize,
								servingUnit: recent.servingUnit
							}];
						}}
					>
						<span class="text-sm">{recent.name}</span>
						<span class="text-xs text-muted-foreground">{recent.calories} cal</span>
					</button>
				{/each}
			</div>
		</div>
	{/if}
</div>

<!-- Save Meal Modal -->
{#if showSaveMeal}
	<div class="fixed inset-0 z-50 bg-black/50" role="dialog" aria-modal="true">
		<div class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-background border border-border rounded-2xl p-6">
			<h2 class="font-semibold mb-4">Save meal as favorite</h2>
			<form method="POST" action="?/saveFavoriteMeal" use:enhance={() => {
				return async ({ update }) => { await update(); };
			}}>
				<input type="hidden" name="mealType" value={saveMealType} />
				<div class="space-y-3">
					<div>
						<Label.Root class="text-sm">Meal name</Label.Root>
						<Input.Root name="mealName" placeholder="e.g. My usual breakfast" bind:value={saveMealName} required />
					</div>
					<p class="text-xs text-muted-foreground">
						This will save all items currently in {mealConfig.find(m => m.key === saveMealType)?.label ?? 'this meal'} as a reusable favorite.
					</p>
					<div class="flex gap-2">
						<Button.Root type="submit" class="flex-1 cursor-pointer">Save</Button.Root>
						<Button.Root type="button" variant="outline" class="cursor-pointer" onclick={() => { showSaveMeal = false; }}>Cancel</Button.Root>
					</div>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Search / Add Food Panel -->
{#if showSearch}
	<div class="fixed inset-0 z-50 bg-black/50" role="dialog" aria-modal="true">
		<div class="fixed inset-x-0 bottom-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-w-lg sm:w-full bg-background border border-border rounded-t-2xl sm:rounded-2xl max-h-[85vh] flex flex-col">
			<!-- Modal Header -->
			<div class="flex items-center justify-between p-4 border-b border-border">
				<h2 class="font-semibold">
					Add to {mealConfig.find((m) => m.key === activeMeal)?.label ?? 'Meal'}
				</h2>
				<Button.Root variant="ghost" size="icon-sm" onclick={closeSearch} class="cursor-pointer">
					<X class="w-4 h-4" />
				</Button.Root>
			</div>

			<!-- Search Bar -->
			<div class="p-4 border-b border-border">
				<div class="relative">
					<Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
					<input
						bind:this={searchInputEl}
						type="text"
						placeholder="Search foods..."
						value={searchQuery}
						oninput={handleSearchInput}
						class="w-full h-9 pl-9 pr-3 rounded-md border border-input bg-background text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
					/>
				</div>
				<div class="flex items-center gap-2 mt-2">
					<button
						type="button"
						class="text-xs text-muted-foreground hover:text-foreground cursor-pointer underline"
						onclick={() => { showCustomForm = !showCustomForm; }}
					>
						{showCustomForm ? 'Search instead' : 'Create custom food'}
					</button>
				</div>
			</div>

			<!-- Content -->
			<div class="flex-1 overflow-y-auto p-4">
				{#if showCustomForm}
					<!-- Custom Food Form -->
					<form method="POST" action="?/createCustomFood" use:enhance={() => {
						return async ({ update }) => {
							await update();
						};
					}}>
						<div class="space-y-3">
							<div>
								<Label.Root class="text-xs">Name</Label.Root>
								<Input.Root name="name" placeholder="e.g. Homemade granola" required />
							</div>
							<div class="grid grid-cols-2 gap-3">
								<div>
									<Label.Root class="text-xs">Serving Size</Label.Root>
									<Input.Root name="servingSize" type="number" value="100" />
								</div>
								<div>
									<Label.Root class="text-xs">Unit</Label.Root>
									<Input.Root name="servingUnit" value="g" />
								</div>
							</div>
							<div class="grid grid-cols-2 gap-3">
								<div>
									<Label.Root class="text-xs">Calories</Label.Root>
									<Input.Root name="calories" type="number" value="0" />
								</div>
								<div>
									<Label.Root class="text-xs">Protein (g)</Label.Root>
									<Input.Root name="protein" type="number" value="0" />
								</div>
							</div>
							<div class="grid grid-cols-2 gap-3">
								<div>
									<Label.Root class="text-xs">Carbs (g)</Label.Root>
									<Input.Root name="carbs" type="number" value="0" />
								</div>
								<div>
									<Label.Root class="text-xs">Fat (g)</Label.Root>
									<Input.Root name="fat" type="number" value="0" />
								</div>
							</div>
							<Button.Root type="submit" class="w-full cursor-pointer">
								Save Custom Food
							</Button.Root>
						</div>
					</form>
				{:else if searching}
					<div class="text-center py-8 text-muted-foreground text-sm">Searching...</div>
				{:else if searchResults.length > 0}
					<div class="space-y-1">
						{#each searchResults as food}
							<div class="border border-border rounded-lg p-3">
								<div class="flex items-start justify-between gap-2">
									<div class="flex-1 min-w-0">
										<p class="text-sm font-medium leading-tight">{food.description}</p>
										<p class="text-xs text-muted-foreground mt-1">
											{food.servingSize}{food.servingUnit}
											&middot; {food.calories} cal
											&middot; {food.protein}p / {food.carbs}c / {food.fat}f
										</p>
									</div>
									<!-- Star button on search results -->
									{#if !isFavorited(food.description)}
										<form method="POST" action="?/favoriteFood" use:enhance={() => {
											return async ({ update }) => { await update(); };
										}}>
											<input type="hidden" name="name" value={food.description} />
											<input type="hidden" name="fdcId" value={food.fdcId} />
											<input type="hidden" name="servingSize" value={food.servingSize} />
											<input type="hidden" name="servingUnit" value={food.servingUnit} />
											<input type="hidden" name="calories" value={food.calories} />
											<input type="hidden" name="protein" value={food.protein} />
											<input type="hidden" name="carbs" value={food.carbs} />
											<input type="hidden" name="fat" value={food.fat} />
											<Button.Root type="submit" variant="ghost" size="icon-sm" class="cursor-pointer text-muted-foreground hover:text-amber-500 shrink-0" title="Add to favorites">
												<Star class="w-3.5 h-3.5" />
											</Button.Root>
										</form>
									{:else}
										<form method="POST" action="?/unfavoriteFood" use:enhance={() => {
											return async ({ update }) => { await update(); };
										}}>
											<input type="hidden" name="favoriteId" value={isFavorited(food.description)} />
											<Button.Root type="submit" variant="ghost" size="icon-sm" class="cursor-pointer text-amber-500 shrink-0" title="Remove from favorites">
												<Star class="w-3.5 h-3.5 fill-current" />
											</Button.Root>
										</form>
									{/if}
								</div>
								<form method="POST" action="?/addFood" class="mt-2 flex items-end gap-2" use:enhance={() => {
									return async ({ update }) => {
										await update();
									};
								}}>
									<input type="hidden" name="mealType" value={activeMeal} />
									<input type="hidden" name="name" value={food.description} />
									<input type="hidden" name="fdcId" value={food.fdcId} />
									<input type="hidden" name="servingSize" value={food.servingSize} />
									<input type="hidden" name="servingUnit" value={food.servingUnit} />
									<input type="hidden" name="calories" value={food.calories} />
									<input type="hidden" name="protein" value={food.protein} />
									<input type="hidden" name="carbs" value={food.carbs} />
									<input type="hidden" name="fat" value={food.fat} />
									<div class="flex items-center gap-1">
										<Label.Root class="text-xs text-muted-foreground">Qty</Label.Root>
										<input
											type="number"
											name="quantity"
											value="1"
											min="1"
											max="99"
											class="w-14 h-8 rounded-md border border-input bg-background px-2 text-sm text-center outline-none focus-visible:border-ring"
										/>
									</div>
									<Button.Root type="submit" size="sm" class="cursor-pointer">
										<Plus class="w-3.5 h-3.5 mr-1" />
										Add
									</Button.Root>
								</form>
							</div>
						{/each}
					</div>
				{:else if searchQuery.length >= 2}
					<div class="text-center py-8 text-muted-foreground text-sm">No results found</div>
				{:else}
					<!-- Show favorites first, then recent foods -->
					{#if data.favoriteFoods.length > 0}
						<div class="mb-4">
							<h4 class="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Favorites</h4>
							<div class="space-y-1">
								{#each data.favoriteFoods as fav}
									<form method="POST" action="?/addFood" use:enhance={() => {
										return async ({ update }) => { await update(); };
									}}>
										<input type="hidden" name="mealType" value={activeMeal} />
										<input type="hidden" name="name" value={fav.name} />
										<input type="hidden" name="fdcId" value={fav.fdcId || ''} />
										<input type="hidden" name="servingSize" value={fav.servingSize} />
										<input type="hidden" name="servingUnit" value={fav.servingUnit} />
										<input type="hidden" name="calories" value={fav.calories} />
										<input type="hidden" name="protein" value={fav.protein} />
										<input type="hidden" name="carbs" value={fav.carbs} />
										<input type="hidden" name="fat" value={fav.fat} />
										<input type="hidden" name="quantity" value="1" />
										<button
											type="submit"
											class="w-full flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50 cursor-pointer text-left"
										>
											<div class="flex items-center gap-2">
												<Star class="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
												<div>
													<p class="text-sm">{fav.name}</p>
													<p class="text-xs text-muted-foreground">
														{fav.servingSize}{fav.servingUnit}
														&middot; {fav.calories} cal
														&middot; {fav.protein}p / {fav.carbs}c / {fav.fat}f
													</p>
												</div>
											</div>
											<Plus class="w-4 h-4 text-muted-foreground shrink-0" />
										</button>
									</form>
								{/each}
							</div>
						</div>
					{/if}
					{#if data.recentFoods.length > 0}
						<div>
							<h4 class="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Recent</h4>
							<div class="space-y-1">
								{#each data.recentFoods as recent}
									<form method="POST" action="?/addFood" use:enhance={() => {
										return async ({ update }) => {
											await update();
										};
									}}>
										<input type="hidden" name="mealType" value={activeMeal} />
										<input type="hidden" name="name" value={recent.name} />
										<input type="hidden" name="fdcId" value={recent.fdcId || ''} />
										<input type="hidden" name="servingSize" value={recent.servingSize} />
										<input type="hidden" name="servingUnit" value={recent.servingUnit} />
										<input type="hidden" name="calories" value={recent.calories} />
										<input type="hidden" name="protein" value={recent.protein} />
										<input type="hidden" name="carbs" value={recent.carbs} />
										<input type="hidden" name="fat" value={recent.fat} />
										<input type="hidden" name="quantity" value="1" />
										<button
											type="submit"
											class="w-full flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50 cursor-pointer text-left"
										>
											<div>
												<p class="text-sm">{recent.name}</p>
												<p class="text-xs text-muted-foreground">
													{recent.servingSize}{recent.servingUnit}
													&middot; {recent.calories} cal
												</p>
											</div>
											<Plus class="w-4 h-4 text-muted-foreground" />
										</button>
									</form>
								{/each}
							</div>
						</div>
					{:else if data.favoriteFoods.length === 0}
						<div class="text-center py-8 text-muted-foreground text-sm">
							Search for a food to add
						</div>
					{/if}
				{/if}
			</div>
		</div>
	</div>
{/if}
