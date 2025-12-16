<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui';
	import { ArrowLeft, Save } from 'lucide-svelte';

	let { data } = $props();

	let selectedMetricId = $state('');
	let value = $state('');
	let notes = $state('');
	let date = $state(new Date().toISOString().split('T')[0]);
	let time = $state(new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }));
	let saving = $state(false);

	const selectedMetric = $derived(data.metrics.find(m => m.id === selectedMetricId));

	function getInputType(valueType: string): string {
		switch (valueType) {
			case 'int':
			case 'float':
				return 'number';
			case 'bool':
				return 'checkbox';
			default:
				return 'text';
		}
	}

	function getInputStep(valueType: string): string | undefined {
		if (valueType === 'float') return '0.01';
		if (valueType === 'int') return '1';
		return undefined;
	}
</script>

<svelte:head>
	<title>Log Entry</title>
</svelte:head>

<div class="max-w-4xl mx-auto px-6 py-8">
	<div class="flex items-center gap-4 mb-8">
		<a href="/dashboard" class="text-muted-foreground hover:text-foreground">
			<ArrowLeft class="w-5 h-5" />
		</a>
		<div>
			<h1 class="text-3xl font-semibold tracking-tight">Log Entry</h1>
			<p class="text-muted-foreground mt-1">Record a new metric entry</p>
		</div>
	</div>

	{#if data.metrics.length === 0}
		<div class="border border-dashed border-border rounded-lg p-8 text-center">
			<p class="text-muted-foreground mb-4">No metrics set up yet. Create some metrics first.</p>
			<Button.Root variant="outline" onclick={() => goto('/metrics')} class="cursor-pointer">
				Set Up Tracker
			</Button.Root>
		</div>
	{:else}
		<form
			method="POST"
			use:enhance={() => {
				saving = true;
				return async ({ update }) => {
					await update();
					saving = false;
				};
			}}
			class="space-y-6"
		>
			<!-- Metric Selection -->
			<div>
				<label for="metricId" class="block text-sm font-medium mb-2">Metric</label>
				<select
					id="metricId"
					name="metricId"
					bind:value={selectedMetricId}
					required
					class="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
				>
					<option value="">Select a metric...</option>
					{#each data.metrics as metric}
						<option value={metric.id}>
							{metric.name}
							{#if metric.unit}({metric.unit}){/if}
						</option>
					{/each}
				</select>
			</div>

			<!-- Value Input -->
			{#if selectedMetric && selectedMetric.valueType !== 'none'}
				<div>
					<label for="value" class="block text-sm font-medium mb-2">
						Value
						{#if selectedMetric.unit}
							<span class="text-muted-foreground font-normal">({selectedMetric.unit})</span>
						{/if}
					</label>
					{#if selectedMetric.valueType === 'bool'}
						<div class="flex items-center gap-3">
							<input
								type="checkbox"
								id="value"
								name="value"
								bind:checked={() => value === 'true', (v) => value = v ? 'true' : 'false'}
								class="w-5 h-5 rounded border-border cursor-pointer"
							/>
							<span class="text-sm text-muted-foreground">
								{value === 'true' ? 'Yes' : 'No'}
							</span>
						</div>
					{:else}
						<input
							type={getInputType(selectedMetric.valueType)}
							step={getInputStep(selectedMetric.valueType)}
							id="value"
							name="value"
							bind:value
							required
							placeholder={selectedMetric.valueType === 'int' ? '0' : selectedMetric.valueType === 'float' ? '0.00' : 'Enter value'}
							class="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
						/>
					{/if}
				</div>
			{/if}

			<!-- Date & Time -->
			<div class="grid grid-cols-2 gap-4">
				<div>
					<label for="date" class="block text-sm font-medium mb-2">Date</label>
					<input
						type="date"
						id="date"
						name="date"
						bind:value={date}
						class="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
					/>
				</div>
				<div>
					<label for="time" class="block text-sm font-medium mb-2">Time</label>
					<input
						type="time"
						id="time"
						name="time"
						bind:value={time}
						class="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
					/>
				</div>
			</div>

			<!-- Notes -->
			<div>
				<label for="notes" class="block text-sm font-medium mb-2">
					Notes <span class="text-muted-foreground font-normal">(optional)</span>
				</label>
				<textarea
					id="notes"
					name="notes"
					bind:value={notes}
					rows="3"
					placeholder="Any additional notes..."
					class="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
				></textarea>
			</div>

			<!-- Submit -->
			<div class="flex gap-3 pt-4">
				<Button.Root type="submit" disabled={!selectedMetricId || (selectedMetric?.valueType !== 'none' && !value) || saving} class="cursor-pointer">
					<Save class="w-4 h-4 mr-2" />
					{saving ? 'Saving...' : 'Save Entry'}
				</Button.Root>
				<Button.Root variant="outline" onclick={() => goto('/dashboard')} class="cursor-pointer">
					Cancel
				</Button.Root>
			</div>
		</form>
	{/if}
</div>
