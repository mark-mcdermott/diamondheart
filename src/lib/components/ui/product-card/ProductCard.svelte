<script lang="ts">
	import { cn } from '$lib/utils';
	import type { Snippet } from 'svelte';
	import type { HTMLAnchorAttributes } from 'svelte/elements';

	interface Props extends HTMLAnchorAttributes {
		class?: string;
		children?: Snippet;
	}

	let { class: className, children, href, ...restProps }: Props = $props();
</script>

<a
	{href}
	data-slot="product-card"
	class={cn('group block', className)}
	{...restProps}
>
	{#if children}
		{@render children()}
	{/if}
</a>
