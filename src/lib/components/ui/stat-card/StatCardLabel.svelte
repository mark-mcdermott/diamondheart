<script lang="ts">
	import { cn } from '$lib/utils';
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends HTMLAttributes<HTMLSpanElement> {
		class?: string;
		children?: Snippet;
	}

	let { class: className, children, ...restProps }: Props = $props();
</script>

<span
	data-slot="stat-card-label"
	class={cn('text-sm text-muted-foreground font-medium', className)}
	{...restProps}
>
	{#if children}
		{@render children()}
	{/if}
</span>
