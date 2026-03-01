<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui';
	import { Plus, Trash2, X, ArrowLeft, Pencil, GripVertical, Eye, EyeOff } from 'lucide-svelte';

	let { data } = $props();

	type ValueType = 'none' | 'text' | 'textarea' | 'float' | 'int' | 'bool' | 'radio' | 'dropdown';

	interface Field {
		id: string;
		name: string;
		type: ValueType;
		options: string;
		required: boolean;
	}

	interface MetricRow {
		id: string;
		name: string;
		type: ValueType;
		unit: string;
		dailyGoal: number;
		fields: Field[];
	}

	let rows = $state<MetricRow[]>([]);
	let saving = $state(false);

	// Drag-and-drop state for existing metrics
	let orderedMetrics = $state<typeof data.metrics>([]);
	let dragIndex = $state<number | null>(null);
	let dropTargetIndex = $state<number | null>(null);

	$effect(() => {
		orderedMetrics = [...data.metrics];
	});

	function handleDragStart(e: DragEvent, index: number) {
		dragIndex = index;
		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'move';
		}
	}

	function handleDragOver(e: DragEvent, index: number) {
		e.preventDefault();
		if (e.dataTransfer) {
			e.dataTransfer.dropEffect = 'move';
		}
		dropTargetIndex = index;
	}

	function handleDragLeave() {
		dropTargetIndex = null;
	}

	function handleDrop(e: DragEvent, index: number) {
		e.preventDefault();
		if (dragIndex === null || dragIndex === index) {
			dragIndex = null;
			dropTargetIndex = null;
			return;
		}

		const updated = [...orderedMetrics];
		const [moved] = updated.splice(dragIndex, 1);
		updated.splice(index, 0, moved);
		orderedMetrics = updated;
		dragIndex = null;
		dropTargetIndex = null;

		// Persist new order
		const ids = orderedMetrics.map((m) => m.id);
		const formData = new FormData();
		formData.set('ids', JSON.stringify(ids));
		fetch('?/reorder', {
			method: 'POST',
			body: formData
		});
	}

	function handleDragEnd() {
		dragIndex = null;
		dropTargetIndex = null;
	}

	function toggleHidden(metricId: string) {
		const metric = orderedMetrics.find((m) => m.id === metricId);
		if (metric) {
			metric.hidden = !metric.hidden;
		}
		const formData = new FormData();
		formData.set('metricId', metricId);
		fetch('?/toggleHidden', {
			method: 'POST',
			body: formData
		});
	}

	function addRow() {
		rows.push({
			id: crypto.randomUUID(),
			name: '',
			type: 'none',
			unit: '',
			dailyGoal: 1,
			fields: []
		});
	}

	function removeRow(id: string) {
		rows = rows.filter(r => r.id !== id);
	}

	function addField(rowId: string) {
		const row = rows.find(r => r.id === rowId);
		if (row) {
			row.fields.push({
				id: crypto.randomUUID(),
				name: '',
				type: 'text',
				options: '',
				required: false
			});
		}
	}

	function removeField(rowId: string, fieldId: string) {
		const row = rows.find(r => r.id === rowId);
		if (row) {
			row.fields = row.fields.filter(f => f.id !== fieldId);
		}
	}

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
</script>

<svelte:head>
	<title>Set Up Tracker</title>
</svelte:head>

<div class="max-w-4xl mx-auto px-6 py-8">
	<div class="flex items-center gap-4 mb-8">
		<a href="/dashboard" class="text-muted-foreground hover:text-foreground">
			<ArrowLeft class="w-5 h-5" />
		</a>
		<div>
			<h1 class="text-3xl font-semibold tracking-tight">Set Up Tracker</h1>
			<p class="text-muted-foreground mt-1">Define metrics to track</p>
		</div>
	</div>

	<!-- Existing Metrics -->
	{#if orderedMetrics.length > 0}
		<div class="mb-8">
			<h2 class="text-lg font-medium mb-4">Existing Metrics</h2>
			<div class="border border-border rounded-lg overflow-hidden">
				<table class="w-full">
					<thead class="bg-muted/50">
						<tr>
							<th class="w-10"></th>
							<th class="w-10"></th>
							<th class="text-left px-4 py-3 text-sm font-medium">Name</th>
							<th class="text-left px-4 py-3 text-sm font-medium">Type</th>
							<th class="text-left px-4 py-3 text-sm font-medium">Unit</th>
							<th class="w-16"></th>
						</tr>
					</thead>
					<tbody>
						{#each orderedMetrics as metric, i (metric.id)}
							<tr
								class="border-t border-border transition-opacity"
								class:opacity-50={dragIndex === i}
								class:border-t-primary={dropTargetIndex === i && dragIndex !== null && dragIndex !== i}
								draggable="true"
								ondragstart={(e) => handleDragStart(e, i)}
								ondragover={(e) => handleDragOver(e, i)}
								ondragleave={handleDragLeave}
								ondrop={(e) => handleDrop(e, i)}
								ondragend={handleDragEnd}
							>
								<td class="pl-3 py-3">
									<span class="cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing">
										<GripVertical class="w-4 h-4" />
									</span>
								</td>
								<td class="px-1 py-3">
									<button
										type="button"
										onclick={() => toggleHidden(metric.id)}
										class="text-muted-foreground hover:text-foreground cursor-pointer"
										title={metric.hidden ? 'Hidden from dashboard' : 'Visible on dashboard'}
									>
										{#if metric.hidden}
											<EyeOff class="w-4 h-4" />
										{:else}
											<Eye class="w-4 h-4" />
										{/if}
									</button>
								</td>
								<td class="px-4 py-3">
									<a href="/metrics/{metric.id}" class="hover:underline" class:text-muted-foreground={metric.hidden}>{metric.name}</a>
								</td>
								<td class="px-4 py-3 text-muted-foreground">{metric.valueType}</td>
								<td class="px-4 py-3 text-muted-foreground">{metric.unit || '-'}</td>
								<td class="px-4 py-3">
									<div class="flex items-center gap-2">
										<a href="/metrics/{metric.id}/edit" class="text-muted-foreground hover:text-foreground cursor-pointer">
											<Pencil class="w-4 h-4" />
										</a>
										<form method="POST" action="?/deleteMetric" use:enhance>
											<input type="hidden" name="metricId" value={metric.id} />
											<button type="submit" class="text-muted-foreground hover:text-destructive cursor-pointer">
												<Trash2 class="w-4 h-4" />
											</button>
										</form>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}

	<!-- Add New Metrics -->
	<div class="mb-6">
		<div class="flex items-center justify-between mb-4">
			<h2 class="text-lg font-medium">Add New Metrics</h2>
			<Button.Root variant="outline" onclick={addRow} class="cursor-pointer">
				<Plus class="w-4 h-4 mr-2" />
				Add Metric
			</Button.Root>
		</div>

		{#if rows.length === 0}
			<div class="border border-dashed border-border rounded-lg p-8 text-center">
				<p class="text-muted-foreground">Click "Add Metric" to create a new metric.</p>
			</div>
		{:else}
			<div class="border border-border rounded-lg overflow-hidden">
				<table class="w-full">
					<thead class="bg-muted/50">
						<tr>
							<th class="text-left px-4 py-3 text-sm font-medium">Name</th>
							<th class="text-left px-4 py-3 text-sm font-medium w-36">Type</th>
							<th class="text-left px-4 py-3 text-sm font-medium w-32">Unit</th>
							<th class="text-left px-4 py-3 text-sm font-medium w-24">Daily Goal</th>
							<th class="text-left px-4 py-3 text-sm font-medium w-48">Extra Fields</th>
							<th class="w-24"></th>
						</tr>
					</thead>
					<tbody>
						{#each rows as row (row.id)}
							<tr class="border-t border-border">
								<td class="px-4 py-3">
									<input
										type="text"
										bind:value={row.name}
										placeholder="Metric name"
										class="w-full px-3 py-1.5 border border-border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
									/>
								</td>
								<td class="px-4 py-3">
									<select
										bind:value={row.type}
										class="w-full px-3 py-1.5 border border-border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
									>
										{#each typeOptions as opt}
											<option value={opt.value}>{opt.label}</option>
										{/each}
									</select>
								</td>
								<td class="px-4 py-3">
									<input
										type="text"
										bind:value={row.unit}
										placeholder="e.g. kg, min"
										class="w-full px-3 py-1.5 border border-border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
									/>
								</td>
								<td class="px-4 py-3">
									<input
										type="number"
										bind:value={row.dailyGoal}
										min="1"
										required
										class="w-full px-3 py-1.5 border border-border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
									/>
								</td>
								<td class="px-4 py-3">
									<div class="flex flex-wrap gap-1 items-center">
										{#each row.fields as field (field.id)}
											<div class="flex items-center gap-1 bg-muted px-2 py-1 rounded text-xs">
												<input
													type="text"
													bind:value={field.name}
													placeholder="Field"
													class="w-16 bg-transparent border-none text-xs focus:outline-none"
												/>
												<select
													bind:value={field.type}
													class="bg-transparent border-none text-xs cursor-pointer focus:outline-none"
												>
													{#each typeOptions as opt}
														<option value={opt.value}>{opt.value}</option>
													{/each}
												</select>
												{#if needsOptions(field.type)}
													<input
														type="text"
														bind:value={field.options}
														placeholder="opt1, opt2, ..."
														class="w-24 bg-background border border-border rounded px-1 text-xs focus:outline-none"
														title="Comma-separated options"
													/>
												{/if}
												<label class="flex items-center gap-1 text-xs text-muted-foreground cursor-pointer">
													<input
														type="checkbox"
														bind:checked={field.required}
														class="cursor-pointer"
													/>
													Req
												</label>
												<button
													type="button"
													onclick={() => removeField(row.id, field.id)}
													class="text-muted-foreground hover:text-foreground cursor-pointer"
												>
													<X class="w-3 h-3" />
												</button>
											</div>
										{/each}
										<button
											type="button"
											onclick={() => addField(row.id)}
											class="p-1 text-muted-foreground hover:text-foreground cursor-pointer"
											title="Add field"
										>
											<Plus class="w-4 h-4" />
										</button>
									</div>
								</td>
								<td class="px-4 py-3">
									<div class="flex items-center gap-2">
										<form
											method="POST"
											action="?/addMetric"
											use:enhance={() => {
												saving = true;
												return async ({ update }) => {
													await update();
													saving = false;
													removeRow(row.id);
												};
											}}
										>
											<input type="hidden" name="name" value={row.name} />
											<input type="hidden" name="valueType" value={row.type} />
											<input type="hidden" name="unit" value={row.unit} />
											<input type="hidden" name="dailyGoal" value={row.dailyGoal} />
											<input type="hidden" name="fields" value={JSON.stringify(row.fields.map(f => ({ name: f.name, type: f.type, options: f.options, required: f.required })))} />
											<Button.Root type="submit" size="sm" disabled={!row.name || saving} class="cursor-pointer">
												Save
											</Button.Root>
										</form>
										<button
											type="button"
											onclick={() => removeRow(row.id)}
											class="text-muted-foreground hover:text-destructive cursor-pointer"
										>
											<Trash2 class="w-4 h-4" />
										</button>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
</div>
