<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		description?: string;
		children?: Snippet;
	}

	let { title, description, children }: Props = $props();
</script>

<section class="bg-muted rounded-2xl p-8 text-center">
	<h2 class="text-2xl font-semibold mt-0 mb-4">{title}</h2>
	{#if description}
		<p class="text-muted-foreground mb-6">{description}</p>
	{/if}
	{#if children}
		{@render children()}
	{/if}
</section>
