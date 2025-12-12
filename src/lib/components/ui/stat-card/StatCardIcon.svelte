<script lang="ts">
	import { cn } from '$lib/utils';
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		class?: string;
		color?: string;
		children?: Snippet;
	}

	let { class: className, color = '#3b82f6', children, ...restProps }: Props = $props();
</script>

<div
	data-slot="stat-card-icon"
	class={cn(
		'w-10 h-10 rounded-lg flex items-center justify-center mb-3',
		className
	)}
	style="background-color: {color}20; color: {color}"
	{...restProps}
>
	{#if children}
		{@render children()}
	{/if}
</div>
