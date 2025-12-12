<script lang="ts">
	export interface CalloutNumberedItem {
		title: string;
		description: string;
	}

	interface Props {
		title?: string;
		items: CalloutNumberedItem[];
		columns?: 2 | 3 | 4;
	}

	let { title, items, columns = 4 }: Props = $props();

	const gridCols = {
		2: 'md:grid-cols-2',
		3: 'md:grid-cols-3',
		4: 'md:grid-cols-4'
	};
</script>

<section class="bg-muted rounded-2xl p-8">
	{#if title}
		<h2 class="text-2xl font-semibold mt-0 mb-8 text-center">{title}</h2>
	{/if}
	<div class="grid {gridCols[columns]} gap-6">
		{#each items as item, i}
			<div class="text-center">
				<div class="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-3 font-semibold">{i + 1}</div>
				<h3 class="font-semibold mb-1">{item.title}</h3>
				<p class="text-muted-foreground text-sm">{item.description}</p>
			</div>
		{/each}
	</div>
</section>
