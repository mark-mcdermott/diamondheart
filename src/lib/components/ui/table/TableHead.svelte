<script lang="ts">
	import { cn } from '$lib/utils';
	import type { Snippet } from 'svelte';
	import type { HTMLThAttributes } from 'svelte/elements';

	interface Props extends HTMLThAttributes {
		children?: Snippet;
	}

	let { class: className, children, ...restProps }: Props = $props();
</script>

<th
	data-slot="table-head"
	class={cn(
		'text-left px-4 py-3 text-sm font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]',
		className
	)}
	{...restProps}
>
	{@render children?.()}
</th>
