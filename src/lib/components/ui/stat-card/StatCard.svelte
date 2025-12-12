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
	data-slot="stat-card"
	class={cn(
		'bg-card rounded-xl border border-border p-4 flex flex-col',
		className
	)}
	{...restProps}
>
	{#if children}
		{@render children()}
	{/if}
</div>
