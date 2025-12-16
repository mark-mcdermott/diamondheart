<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui';
	import { ArrowLeft, Pencil } from 'lucide-svelte';

	let { data } = $props();

	function formatDate(date: Date | string) {
		const d = new Date(date);
		return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
	}

	function formatTime(date: Date | string) {
		const d = new Date(date);
		return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
	}

	function formatValue(value: string) {
		if (data.metric.valueType === 'none') {
			return 'Done';
		}
		if (data.metric.valueType === 'bool') {
			return value === 'true' ? 'Yes' : 'No';
		}
		return value;
	}
</script>

<svelte:head>
	<title>{data.metric.name} - Entries</title>
</svelte:head>

<div class="max-w-4xl mx-auto px-6 py-8">
	<div class="flex items-center justify-between mb-8">
		<div class="flex items-center gap-4">
			<a href="/metrics" class="text-muted-foreground hover:text-foreground">
				<ArrowLeft class="w-5 h-5" />
			</a>
			<div>
				<h1 class="text-3xl font-semibold tracking-tight">{data.metric.name}</h1>
				<p class="text-muted-foreground mt-1">
					{data.metric.valueType}{data.metric.unit ? ` (${data.metric.unit})` : ''}
				</p>
			</div>
		</div>
		<Button.Root variant="outline" onclick={() => goto(`/metrics/${data.metric.id}/edit`)} class="cursor-pointer">
			<Pencil class="w-4 h-4 mr-2" />
			Edit
		</Button.Root>
	</div>

	{#if data.entries.length === 0}
		<div class="border border-dashed border-border rounded-lg p-8 text-center">
			<p class="text-muted-foreground mb-4">No entries recorded yet.</p>
			<Button.Root onclick={() => goto('/entry')} class="cursor-pointer">Log Entry</Button.Root>
		</div>
	{:else}
		<div class="border border-border rounded-lg overflow-hidden">
			<table class="w-full">
				<thead class="bg-muted/50">
					<tr>
						<th class="text-left px-4 py-3 text-sm font-medium">Date</th>
						<th class="text-left px-4 py-3 text-sm font-medium">Time Logged</th>
						<th class="text-left px-4 py-3 text-sm font-medium">Value</th>
						<th class="text-left px-4 py-3 text-sm font-medium">Notes</th>
					</tr>
				</thead>
				<tbody>
					{#each data.entries as entry}
						<tr class="border-t border-border">
							<td class="px-4 py-3">{formatDate(entry.date)}</td>
							<td class="px-4 py-3 text-muted-foreground">{formatTime(entry.date)}</td>
							<td class="px-4 py-3">
								{formatValue(entry.value)}{data.metric.unit ? ` ${data.metric.unit}` : ''}
							</td>
							<td class="px-4 py-3 text-muted-foreground">{entry.notes || '-'}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		<p class="text-sm text-muted-foreground mt-4">{data.entries.length} {data.entries.length === 1 ? 'entry' : 'entries'}</p>
	{/if}
</div>
