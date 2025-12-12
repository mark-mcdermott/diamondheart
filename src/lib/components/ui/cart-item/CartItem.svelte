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
	data-slot="cart-item"
	class={cn('flex gap-4 py-4 border-b border-border last:border-0', className)}
	{...restProps}
>
	{#if children}
		{@render children()}
	{/if}
</div>
