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
	data-slot="metric-card-title"
	class={cn('font-semibold text-foreground', className)}
	{...restProps}
>
	{#if children}
		{@render children()}
	{/if}
</h3>
