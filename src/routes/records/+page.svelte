<script lang="ts">
	import { Button, Card } from '$lib/components/ui';
	import { Trophy, ArrowLeft, Dumbbell, Search } from 'lucide-svelte';

	let { data } = $props();

	let muscleGroupFilter = $state('all');
	let exerciseSearch = $state('');

	type Record = {
		id: string;
		exerciseId: string;
		repCount: number;
		weight: number;
		unit: string;
		date: Date | string;
		exerciseName: string;
		muscleGroup: string;
		equipment: string | null;
	};

	// Group records by exercise
	const recordsByExercise = $derived(() => {
		const filtered = data.records.filter((r: Record) => {
			const matchesGroup = muscleGroupFilter === 'all' || r.muscleGroup === muscleGroupFilter;
			const matchesSearch = exerciseSearch === '' ||
				r.exerciseName.toLowerCase().includes(exerciseSearch.toLowerCase());
			return matchesGroup && matchesSearch;
		});

		const groups: Map<string, { name: string; muscleGroup: string; equipment: string | null; records: Record[] }> = new Map();

		for (const record of filtered) {
			if (!groups.has(record.exerciseId)) {
				groups.set(record.exerciseId, {
					name: record.exerciseName,
					muscleGroup: record.muscleGroup,
					equipment: record.equipment,
					records: []
				});
			}
			groups.get(record.exerciseId)!.records.push(record);
		}

		return groups;
	});

	// Standard rep counts to highlight
	const standardReps = [1, 3, 5, 8, 10, 12];

	function formatDate(date: Date | string) {
		const d = new Date(date);
		return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}

	function getRepLabel(repCount: number): string {
		return `${repCount}RM`;
	}
</script>

<svelte:head>
	<title>Personal Records - Ortholinear</title>
</svelte:head>

<div class="max-w-4xl mx-auto px-6 py-8">
	<div class="flex items-center gap-4 mb-8">
		<a href="/workout" class="text-muted-foreground hover:text-foreground">
			<ArrowLeft class="w-5 h-5" />
		</a>
		<div class="flex-1">
			<h1 class="text-3xl font-semibold tracking-tight">Personal Records</h1>
			<p class="text-muted-foreground mt-1">Your all-time bests</p>
		</div>
	</div>

	<!-- Filters -->
	<div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
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
			{#each data.muscleGroups as group}
				<option value={group}>{group}</option>
			{/each}
		</select>
	</div>

	<!-- Records List -->
	{#if data.records.length === 0}
		<div class="border border-dashed border-border rounded-lg p-8 text-center">
			<Trophy class="w-8 h-8 text-muted-foreground mx-auto mb-3" />
			<p class="text-muted-foreground mb-4">No personal records yet.</p>
			<Button.Root href="/workout" class="cursor-pointer">
				<Dumbbell class="w-4 h-4 mr-2" />
				Start a Workout
			</Button.Root>
		</div>
	{:else}
		{@const groups = recordsByExercise()}
		{#if groups.size === 0}
			<div class="border border-dashed border-border rounded-lg p-8 text-center">
				<Search class="w-8 h-8 text-muted-foreground mx-auto mb-3" />
				<p class="text-muted-foreground">No records match your filters.</p>
			</div>
		{:else}
			<div class="space-y-4">
				{#each [...groups.entries()] as [exerciseId, exercise]}
					<Card.Root>
						<Card.Header class="pb-3">
							<div class="flex items-center justify-between">
								<div>
									<Card.Title class="text-base">{exercise.name}</Card.Title>
									<Card.Description>
										{exercise.muscleGroup}
										{#if exercise.equipment}
											&middot; {exercise.equipment}
										{/if}
									</Card.Description>
								</div>
								<Trophy class="w-5 h-5 text-amber-500" />
							</div>
						</Card.Header>
						<Card.Content class="pt-0">
							<!-- Highlight standard rep PRs -->
							<div class="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">
								{#each standardReps as repCount}
									{@const pr = exercise.records.find((r: Record) => r.repCount === repCount)}
									<div class="text-center p-2 rounded-lg {pr ? 'bg-primary/10 border border-primary/20' : 'bg-muted/50 border border-transparent'}">
										<p class="text-xs text-muted-foreground font-medium">{getRepLabel(repCount)}</p>
										{#if pr}
											<p class="text-sm font-semibold mt-0.5">{pr.weight}</p>
											<p class="text-xs text-muted-foreground">{pr.unit}</p>
										{:else}
											<p class="text-sm text-muted-foreground mt-0.5">--</p>
										{/if}
									</div>
								{/each}
							</div>

							<!-- All PRs -->
							{@const nonStandardPRs = exercise.records.filter((r: Record) => !standardReps.includes(r.repCount))}
							{#if nonStandardPRs.length > 0}
								<div class="border-t border-border pt-3">
									<p class="text-xs font-medium text-muted-foreground mb-2">Other Rep PRs</p>
									<div class="flex flex-wrap gap-2">
										{#each nonStandardPRs as pr}
											<span class="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded-full">
												{pr.repCount}RM: {pr.weight} {pr.unit}
											</span>
										{/each}
									</div>
								</div>
							{/if}

							<!-- Most recent PR date -->
							{@const latestPR = exercise.records.reduce((latest: Record, r: Record) =>
								new Date(r.date) > new Date(latest.date) ? r : latest
							, exercise.records[0])}
							<p class="text-xs text-muted-foreground mt-3">
								Last PR: {formatDate(latestPR.date)}
							</p>
						</Card.Content>
					</Card.Root>
				{/each}
			</div>
		{/if}
	{/if}
</div>
