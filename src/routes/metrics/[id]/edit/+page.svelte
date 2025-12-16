<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui';
	import { ArrowLeft, Save, Plus, X } from 'lucide-svelte';

	let { data } = $props();

	type ValueType = 'none' | 'text' | 'textarea' | 'float' | 'int' | 'bool' | 'radio' | 'dropdown';

	interface Field {
		id: string;
		name: string;
		type: ValueType;
		options: string;
		required: boolean;
	}

	let name = $state(data.metric.name);
	let valueType = $state(data.metric.valueType as ValueType);
	let unit = $state(data.metric.unit || '');
	let dailyGoal = $state<number>(data.metric.dailyGoal ?? 1);
	let fields = $state<Field[]>(
		(data.metric.fields as Field[] || []).map(f => ({ ...f, id: f.id || crypto.randomUUID(), required: f.required ?? false }))
	);
	let saving = $state(false);

	const typeOptions: { value: ValueType; label: string }[] = [
		{ value: 'none', label: 'None (just log it)' },
		{ value: 'int', label: 'Integer' },
		{ value: 'float', label: 'Decimal' },
		{ value: 'text', label: 'Text (input)' },
		{ value: 'textarea', label: 'Text (textarea)' },
		{ value: 'bool', label: 'Yes/No' },
		{ value: 'radio', label: 'Radio' },
		{ value: 'dropdown', label: 'Dropdown' }
	];

	function needsOptions(type: ValueType): boolean {
		return type === 'radio' || type === 'dropdown';
	}

	function addField() {
		fields.push({
			id: crypto.randomUUID(),
			name: '',
			type: 'text',
			options: '',
			required: false
		});
	}

	function removeField(id: string) {
		fields = fields.filter(f => f.id !== id);
	}

	const fieldsJson = $derived(JSON.stringify(fields.map(f => ({
		name: f.name,
		type: f.type,
		options: f.options,
		required: f.required
	}))));
</script>

<svelte:head>
	<title>Edit Metric - {data.metric.name}</title>
</svelte:head>

<div class="max-w-4xl mx-auto px-6 py-8">
	<div class="flex items-center gap-4 mb-8">
		<a href="/metrics/{data.metric.id}" class="text-muted-foreground hover:text-foreground">
			<ArrowLeft class="w-5 h-5" />
		</a>
		<div>
			<h1 class="text-3xl font-semibold tracking-tight">Edit Metric</h1>
			<p class="text-muted-foreground mt-1">Update metric details</p>
		</div>
	</div>

	<form
		method="POST"
		use:enhance={() => {
			saving = true;
			return async ({ update }) => {
				await update();
				saving = false;
			};
		}}
		class="space-y-6 max-w-lg"
	>
		<!-- Name -->
		<div>
			<label for="name" class="block text-sm font-medium mb-2">Name</label>
			<input
				type="text"
				id="name"
				name="name"
				bind:value={name}
				required
				class="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
			/>
		</div>

		<!-- Type -->
		<div>
			<label for="valueType" class="block text-sm font-medium mb-2">Type</label>
			<select
				id="valueType"
				name="valueType"
				bind:value={valueType}
				required
				class="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
			>
				{#each typeOptions as opt}
					<option value={opt.value}>{opt.label}</option>
				{/each}
			</select>
		</div>

		<!-- Unit -->
		<div>
			<label for="unit" class="block text-sm font-medium mb-2">
				Unit <span class="text-muted-foreground font-normal">(optional)</span>
			</label>
			<input
				type="text"
				id="unit"
				name="unit"
				bind:value={unit}
				placeholder="e.g. kg, min, glasses"
				class="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
			/>
		</div>

		<!-- Daily Goal -->
		<div>
			<label for="dailyGoal" class="block text-sm font-medium mb-2">
				Daily Goal
			</label>
			<input
				type="number"
				id="dailyGoal"
				name="dailyGoal"
				bind:value={dailyGoal}
				min="1"
				required
				class="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
			/>
			<p class="text-sm text-muted-foreground mt-1">Number of entries per day to complete goal</p>
		</div>

		<!-- Extra Fields -->
		<div>
			<div class="flex items-center justify-between mb-2">
				<label class="block text-sm font-medium">
					Extra Fields <span class="text-muted-foreground font-normal">(optional)</span>
				</label>
				<button
					type="button"
					onclick={addField}
					class="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
				>
					<Plus class="w-4 h-4" />
					Add Field
				</button>
			</div>

			{#if fields.length === 0}
				<p class="text-sm text-muted-foreground">No extra fields defined.</p>
			{:else}
				<div class="space-y-2">
					{#each fields as field (field.id)}
						<div class="flex items-center gap-2 p-3 border border-border rounded-lg bg-muted/30">
							<input
								type="text"
								bind:value={field.name}
								placeholder="Field name"
								class="flex-1 px-2 py-1 border border-border rounded bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
							/>
							<select
								bind:value={field.type}
								class="px-2 py-1 border border-border rounded bg-background text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
							>
								{#each typeOptions as opt}
									<option value={opt.value}>{opt.label}</option>
								{/each}
							</select>
							{#if needsOptions(field.type)}
								<input
									type="text"
									bind:value={field.options}
									placeholder="opt1, opt2, ..."
									class="w-32 px-2 py-1 border border-border rounded bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
									title="Comma-separated options"
								/>
							{/if}
							<label class="flex items-center gap-1 text-sm text-muted-foreground cursor-pointer">
								<input
									type="checkbox"
									bind:checked={field.required}
									class="cursor-pointer"
								/>
								Required
							</label>
							<button
								type="button"
								onclick={() => removeField(field.id)}
								class="text-muted-foreground hover:text-destructive cursor-pointer p-1"
							>
								<X class="w-4 h-4" />
							</button>
						</div>
					{/each}
				</div>
			{/if}
			<input type="hidden" name="fields" value={fieldsJson} />
		</div>

		<!-- Submit -->
		<div class="flex gap-3 pt-4">
			<Button.Root type="submit" disabled={!name || saving} class="cursor-pointer">
				<Save class="w-4 h-4 mr-2" />
				{saving ? 'Saving...' : 'Save Changes'}
			</Button.Root>
			<Button.Root variant="outline" onclick={() => goto(`/metrics/${data.metric.id}`)} class="cursor-pointer">
				Cancel
			</Button.Root>
		</div>
	</form>
</div>
