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

<h3
	data-slot="product-card-name"
	class={cn('font-medium text-foreground group-hover:text-muted-foreground transition-colors line-clamp-2', className)}
	{...restProps}
>
	{#if children}
		{@render children()}
	{/if}
</h3>
