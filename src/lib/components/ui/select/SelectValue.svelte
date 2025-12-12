<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends HTMLAttributes<HTMLSpanElement> {
		placeholder?: string;
		children?: Snippet;
	}

	let { placeholder, children, ...restProps }: Props = $props();
</script>

<span data-slot="select-value" {...restProps}>
	{#if children}
		{@render children()}
	{:else if placeholder}
		<span class="text-muted-foreground">{placeholder}</span>
	{/if}
</span>
