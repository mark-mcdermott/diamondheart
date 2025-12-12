<script lang="ts">
	import { cn } from '$lib/utils';
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends HTMLAttributes<HTMLSpanElement> {
		class?: string;
		variant?: 'sale' | 'new' | 'featured' | 'out-of-stock';
		children?: Snippet;
	}

	let { class: className, variant = 'new', children, ...restProps }: Props = $props();

	const variantClasses = {
		sale: 'bg-red-500 text-white',
		new: 'bg-emerald-500 text-white',
		featured: 'bg-amber-500 text-white',
		'out-of-stock': 'bg-muted-foreground text-background'
	};
</script>

<span
	data-slot="product-card-badge"
	class={cn(
		'absolute top-2 left-2 px-2 py-1 text-xs font-medium rounded',
		variantClasses[variant],
		className
	)}
	{...restProps}
>
	{#if children}
		{@render children()}
	{/if}
</span>
