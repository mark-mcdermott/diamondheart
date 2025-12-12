<script lang="ts">
	export interface CalloutGridItem {
		icon: string;
		title: string;
		description: string;
	}

	interface Props {
		title?: string;
		items: CalloutGridItem[];
		columns?: 1 | 2;
	}

	let { title, items, columns = 2 }: Props = $props();

	const gridCols = {
		1: 'grid-cols-1',
		2: 'md:grid-cols-2'
	};
</script>

<section class="bg-muted rounded-2xl p-8">
	{#if title}
		<h2 class="text-2xl font-semibold mt-0 mb-6 text-center">{title}</h2>
	{/if}
	<div class="grid {gridCols[columns]} gap-6">
		{#each items as item}
			<div class="flex gap-4">
				<span class="text-2xl">{item.icon}</span>
				<div>
					<h3 class="font-semibold mb-1">{item.title}</h3>
					<p class="text-muted-foreground text-sm">{item.description}</p>
				</div>
			</div>
		{/each}
	</div>
</section>
