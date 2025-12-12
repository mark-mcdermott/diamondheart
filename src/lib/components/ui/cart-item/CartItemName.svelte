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

<h4
	data-slot="cart-item-name"
	class={cn('font-medium text-foreground truncate', className)}
	{...restProps}
>
	{#if children}
		{@render children()}
	{/if}
</h4>
