<script lang="ts">
	export interface Feature {
		icon: string;
		title: string;
		description: string;
	}

	interface Props {
		title?: string;
		features: Feature[];
		columns?: 2 | 3 | 4;
	}

	let { title, features, columns = 3 }: Props = $props();

	const gridCols = {
		2: 'md:grid-cols-2',
		3: 'md:grid-cols-3',
		4: 'md:grid-cols-4'
	};
</script>

<section class="mb-20">
	{#if title}
		<h2 class="text-2xl font-semibold mt-0 mb-8 text-center">{title}</h2>
	{/if}
	<div class="grid {gridCols[columns]} gap-8">
		{#each features as feature}
			<div class="text-center p-6">
				<div class="text-4xl mb-4">{feature.icon}</div>
				<h3 class="font-semibold mb-2">{feature.title}</h3>
				<p class="text-muted-foreground text-sm">{feature.description}</p>
			</div>
		{/each}
	</div>
</section>
