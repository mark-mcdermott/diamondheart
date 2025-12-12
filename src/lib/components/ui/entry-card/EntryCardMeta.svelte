<script lang="ts">
	import { cn } from '$lib/utils';
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends HTMLAttributes<HTMLParagraphElement> {
		class?: string;
		children?: Snippet;
	}

	let { class: className, children, ...restProps }: Props = $props();
</script>

<p
	data-slot="entry-card-meta"
	class={cn('text-sm text-muted-foreground mt-0.5', className)}
	{...restProps}
>
	{#if children}
		{@render children()}
	{/if}
</p>
