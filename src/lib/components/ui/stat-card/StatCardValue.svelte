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
	data-slot="stat-card-value"
	class={cn('text-2xl font-bold text-foreground mt-1', className)}
	{...restProps}
>
	{#if children}
		{@render children()}
	{/if}
</div>
