<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { Button, Card } from '$lib/components/ui';
	import { Dumbbell, Plus, Trash2, Trophy, Search, Clock, ArrowLeft, CheckCircle, X } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';

	let { data, form } = $props();

	let workoutName = $state('');
	let selectedExerciseId = $state('');
	let reps = $state('');
	let weight = $state('');
	let unit = $state('lbs');
	let setType = $state('regular');
	let exerciseSearch = $state('');
	let muscleGroupFilter = $state('all');
	let finishNotes = $state('');
	let showFinishDialog = $state(false);
	let submitting = $state(false);

	// Calculate workout duration in minutes from start time
	const workoutDuration = $derived(
		data.activeWorkout
			? Math.round((Date.now() - new Date(data.activeWorkout.date).getTime()) / 60000)
			: 0
	);

	// Get unique muscle groups from exercises
	const muscleGroups = $derived(
		[...new Set(data.exercises.map((e: { muscleGroup: string }) => e.muscleGroup))].sort()
	);

	// Filter exercises by search and muscle group
	const filteredExercises = $derived(
		data.exercises.filter((e: { name: string; muscleGroup: string }) => {
			const matchesSearch = exerciseSearch === '' ||
				e.name.toLowerCase().includes(exerciseSearch.toLowerCase());
			const matchesGroup = muscleGroupFilter === 'all' ||
				e.muscleGroup === muscleGroupFilter;
			return matchesSearch && matchesGroup;
		})
	);

	// Get selected exercise details
	const selectedExercise = $derived(
		data.exercises.find((e: { id: string }) => e.id === selectedExerciseId)
	);

	// Group active sets by exercise
	const setsByExercise = $derived(() => {
		const groups: Record<string, Array<typeof data.activeSets[0]>> = {};
		for (const set of data.activeSets) {
			if (!groups[set.exerciseId]) {
				groups[set.exerciseId] = [];
			}
			groups[set.exerciseId].push(set);
		}
		return groups;
	});

	// Handle PR detection from form response
	$effect(() => {
		if (form?.isPR) {
			toast.success('New Personal Record!', {
				description: 'You just hit a new PR!'
			});
		}
	});

	function formatDate(date: Date | string) {
		const d = new Date(date);
		return d.toLocaleDateString('en-US', {
			weekday: 'short',
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		});
	}

	function formatDuration(minutes: number | null): string {
		if (!minutes) return '--';
		if (minutes < 60) return `${minutes}m`;
		const h = Math.floor(minutes / 60);
		const m = minutes % 60;
		return m > 0 ? `${h}h ${m}m` : `${h}h`;
	}
</script>

<svelte:head>
	<title>Workout - Ortholinear</title>
</svelte:head>

<div class="max-w-4xl mx-auto px-6 py-8">
	{#if data.activeWorkout}
		<!-- Active Workout View -->
		<div class="flex items-center gap-4 mb-8">
			<a href="/workout" class="text-muted-foreground hover:text-foreground">
				<ArrowLeft class="w-5 h-5" />
			</a>
			<div class="flex-1">
				<h1 class="text-3xl font-semibold tracking-tight">
					{data.activeWorkout.name || 'Workout'}
				</h1>
				<p class="text-muted-foreground mt-1 flex items-center gap-2">
					<Clock class="w-4 h-4" />
					{formatDuration(workoutDuration)} elapsed
				</p>
			</div>
			<Button.Root
				variant="outline"
				onclick={() => showFinishDialog = true}
				class="cursor-pointer"
			>
				<CheckCircle class="w-4 h-4 mr-2" />
				Finish
			</Button.Root>
		</div>

		<!-- Add Set Form -->
		<Card.Root class="mb-6">
			<Card.Header>
				<Card.Title>Add Set</Card.Title>
				<Card.Description>Select an exercise and log your set</Card.Description>
			</Card.Header>
			<Card.Content>
				<!-- Exercise Search & Filter -->
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
					<div class="relative">
						<Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
						<input
							type="text"
							placeholder="Search exercises..."
							bind:value={exerciseSearch}
							class="w-full pl-9 pr-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring text-sm"
						/>
					</div>
					<select
						bind:value={muscleGroupFilter}
						class="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring text-sm cursor-pointer"
					>
						<option value="all">All Muscle Groups</option>
						{#each muscleGroups as group}
							<option value={group}>{group}</option>
						{/each}
					</select>
				</div>

				<form
					method="POST"
					action="?/addSet"
					use:enhance={() => {
						submitting = true;
						return async ({ update, result }) => {
							await update();
							submitting = false;
							if (result.type === 'success') {
								reps = '';
								weight = '';
							}
						};
					}}
				>
					<input type="hidden" name="workoutId" value={data.activeWorkout.id} />
					<input type="hidden" name="unit" value={unit} />
					<input type="hidden" name="type" value={setType} />

					<!-- Exercise Selector -->
					<div class="mb-4">
						<label for="exerciseId" class="block text-sm font-medium mb-2">Exercise</label>
						<select
							id="exerciseId"
							name="exerciseId"
							bind:value={selectedExerciseId}
							required
							class="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
						>
							<option value="">Select exercise...</option>
							{#each filteredExercises as exercise}
								<option value={exercise.id}>
									{exercise.name} ({exercise.muscleGroup})
								</option>
							{/each}
						</select>
					</div>

					<!-- Reps, Weight, Unit, Type -->
					<div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
						<div>
							<label for="reps" class="block text-sm font-medium mb-2">Reps</label>
							<input
								type="number"
								id="reps"
								name="reps"
								bind:value={reps}
								required
								min="1"
								placeholder="10"
								class="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
							/>
						</div>
						<div>
							<label for="weight" class="block text-sm font-medium mb-2">Weight</label>
							<input
								type="number"
								id="weight"
								name="weight"
								bind:value={weight}
								required
								min="0"
								placeholder="135"
								class="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
							/>
						</div>
						<div>
							<label for="unit" class="block text-sm font-medium mb-2">Unit</label>
							<select
								id="unit"
								bind:value={unit}
								class="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
							>
								<option value="lbs">lbs</option>
								<option value="kg">kg</option>
							</select>
						</div>
						<div>
							<label for="setType" class="block text-sm font-medium mb-2">Type</label>
							<select
								id="setType"
								bind:value={setType}
								class="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
							>
								<option value="regular">Regular</option>
								<option value="warmup">Warm-up</option>
								<option value="dropset">Drop Set</option>
								<option value="failure">To Failure</option>
							</select>
						</div>
					</div>

					{#if selectedExercise && reps && weight}
						<p class="text-sm text-muted-foreground mb-4">
							{selectedExercise.name}: {reps} reps @ {weight} {unit}
							{#if setType !== 'regular'}
								<span class="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full ml-2">
									{setType}
								</span>
							{/if}
						</p>
					{/if}

					<Button.Root
						type="submit"
						disabled={!selectedExerciseId || !reps || !weight || submitting}
						class="cursor-pointer"
					>
						<Plus class="w-4 h-4 mr-2" />
						{submitting ? 'Adding...' : 'Add Set'}
					</Button.Root>
				</form>
			</Card.Content>
		</Card.Root>

		<!-- Sets Added -->
		{#if data.activeSets.length > 0}
			<div class="space-y-4">
				<h2 class="text-lg font-semibold">Sets Logged</h2>
				{#each Object.entries(setsByExercise()) as [exerciseId, sets]}
					{@const exerciseName = sets[0].exerciseName}
					{@const muscleGroup = sets[0].muscleGroup}
					<Card.Root>
						<Card.Header class="pb-3">
							<div class="flex items-center justify-between">
								<div>
									<Card.Title class="text-base">{exerciseName}</Card.Title>
									<Card.Description>{muscleGroup}</Card.Description>
								</div>
								<span class="text-sm text-muted-foreground">
									{sets.length} {sets.length === 1 ? 'set' : 'sets'}
								</span>
							</div>
						</Card.Header>
						<Card.Content class="pt-0">
							<div class="space-y-2">
								{#each sets as set}
									<div class="flex items-center justify-between py-2 border-b border-border last:border-0">
										<div class="flex items-center gap-3">
											<span class="text-sm font-medium text-muted-foreground w-8">
												#{set.setNumber}
											</span>
											<span class="text-sm font-medium">
												{set.reps} reps @ {set.weight} {set.unit}
											</span>
											{#if set.type !== 'regular'}
												<span class="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
													{set.type}
												</span>
											{/if}
										</div>
										<form
											method="POST"
											action="?/deleteSet"
											use:enhance={() => {
												return async ({ update }) => {
													await update();
												};
											}}
										>
											<input type="hidden" name="setId" value={set.id} />
											<input type="hidden" name="workoutId" value={data.activeWorkout?.id} />
											<button
												type="submit"
												class="text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
												aria-label="Delete set"
											>
												<Trash2 class="w-4 h-4" />
											</button>
										</form>
									</div>
								{/each}
							</div>
						</Card.Content>
					</Card.Root>
				{/each}
			</div>
		{:else}
			<div class="border border-dashed border-border rounded-lg p-8 text-center">
				<Dumbbell class="w-8 h-8 text-muted-foreground mx-auto mb-3" />
				<p class="text-muted-foreground">No sets logged yet. Add your first set above.</p>
			</div>
		{/if}

		<!-- Finish Workout Dialog -->
		{#if showFinishDialog}
			<div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
				<div class="bg-background border border-border rounded-lg p-6 w-full max-w-md">
					<div class="flex items-center justify-between mb-4">
						<h3 class="text-lg font-semibold">Finish Workout</h3>
						<button
							onclick={() => showFinishDialog = false}
							class="text-muted-foreground hover:text-foreground cursor-pointer"
						>
							<X class="w-5 h-5" />
						</button>
					</div>
					<form
						method="POST"
						action="?/finishWorkout"
						use:enhance={() => {
							return async ({ update }) => {
								showFinishDialog = false;
								await update();
							};
						}}
					>
						<input type="hidden" name="workoutId" value={data.activeWorkout.id} />
						<input type="hidden" name="duration" value={workoutDuration} />

						<div class="space-y-4">
							<div>
								<p class="text-sm text-muted-foreground mb-1">Duration</p>
								<p class="text-2xl font-semibold">{formatDuration(workoutDuration)}</p>
							</div>
							<div>
								<p class="text-sm text-muted-foreground mb-1">Sets Completed</p>
								<p class="text-2xl font-semibold">{data.activeSets.length}</p>
							</div>
							<div>
								<label for="finishNotes" class="block text-sm font-medium mb-2">
									Notes <span class="text-muted-foreground font-normal">(optional)</span>
								</label>
								<textarea
									id="finishNotes"
									name="notes"
									bind:value={finishNotes}
									rows="3"
									placeholder="How did the workout feel?"
									class="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
								></textarea>
							</div>
							<div class="flex gap-3">
								<Button.Root type="submit" class="flex-1 cursor-pointer">
									<CheckCircle class="w-4 h-4 mr-2" />
									Finish Workout
								</Button.Root>
								<Button.Root
									type="button"
									variant="outline"
									onclick={() => showFinishDialog = false}
									class="cursor-pointer"
								>
									Cancel
								</Button.Root>
							</div>
						</div>
					</form>
				</div>
			</div>
		{/if}
	{:else}
		<!-- No Active Workout View -->
		<div class="flex items-center justify-between mb-8">
			<div>
				<h1 class="text-3xl font-semibold tracking-tight">Workout</h1>
				<p class="text-muted-foreground mt-1">Log your strength training</p>
			</div>
			<div class="flex gap-2">
				<Button.Root variant="outline" href="/records" class="cursor-pointer">
					<Trophy class="w-4 h-4 mr-2" />
					Records
				</Button.Root>
			</div>
		</div>

		<!-- Start Workout -->
		<Card.Root class="mb-8">
			<Card.Content class="pt-6">
				<form
					method="POST"
					action="?/startWorkout"
					use:enhance
					class="flex flex-col sm:flex-row gap-3"
				>
					<input
						type="text"
						name="name"
						bind:value={workoutName}
						placeholder="Workout name (optional)"
						class="flex-1 px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
					/>
					<Button.Root type="submit" class="cursor-pointer">
						<Dumbbell class="w-4 h-4 mr-2" />
						Start Workout
					</Button.Root>
				</form>
			</Card.Content>
		</Card.Root>

		<!-- Recent Workouts -->
		{#if data.recentWorkouts.length > 0}
			<h2 class="text-lg font-semibold mb-4">Recent Workouts</h2>
			<div class="space-y-3">
				{#each data.recentWorkouts as workout}
					<Card.Root>
						<Card.Content class="py-4">
							<div class="flex items-center justify-between">
								<div>
									<p class="font-medium">
										{workout.name || 'Workout'}
									</p>
									<p class="text-sm text-muted-foreground">
										{formatDate(workout.date)}
									</p>
								</div>
								<div class="flex items-center gap-4 text-sm text-muted-foreground">
									{#if workout.duration}
										<span class="flex items-center gap-1">
											<Clock class="w-4 h-4" />
											{formatDuration(workout.duration)}
										</span>
									{/if}
								</div>
							</div>
						</Card.Content>
					</Card.Root>
				{/each}
			</div>
		{:else}
			<div class="border border-dashed border-border rounded-lg p-8 text-center">
				<Dumbbell class="w-8 h-8 text-muted-foreground mx-auto mb-3" />
				<p class="text-muted-foreground">No workouts yet. Start your first workout above.</p>
			</div>
		{/if}
	{/if}
</div>
