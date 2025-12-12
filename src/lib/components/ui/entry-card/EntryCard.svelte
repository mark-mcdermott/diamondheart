<script lang="ts">
	import { cn } from '$lib/utils';
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		class?: string;
		children?: Snippet;
	}

	let { class: className, children, ...restProps }: Props = $props();
</script>

<div
	data-slot="entry-card"
	class={cn(
		'flex items-center gap-4 p-4 bg-card rounded-lg border border-border hover:border-muted-foreground/30 transition-colors',
		className
	)}
	{...restProps}
>
	{#if children}
		{@render children()}
	{/if}
</div>
