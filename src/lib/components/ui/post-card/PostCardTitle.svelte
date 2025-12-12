<script lang="ts">
	import { cn } from '$lib/utils';
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends HTMLAttributes<HTMLHeadingElement> {
		class?: string;
		children?: Snippet;
	}

	let { class: className, children, ...restProps }: Props = $props();
</script>

<h2
	data-slot="post-card-title"
	class={cn(
		'text-2xl font-semibold group-hover:text-muted-foreground transition-colors',
		className
	)}
	{...restProps}
>
	{#if children}
		{@render children()}
	{/if}
</h2>
