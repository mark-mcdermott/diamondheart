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
	data-slot="entry-card-value"
	class={cn('text-right flex-shrink-0', className)}
	{...restProps}
>
	{#if children}
		{@render children()}
	{/if}
</div>
