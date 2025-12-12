<script lang="ts">
	import { cn } from '$lib/utils';
	import type { Snippet } from 'svelte';
	import type { HTMLTdAttributes } from 'svelte/elements';

	interface Props extends HTMLTdAttributes {
		children?: Snippet;
	}

	let { class: className, children, ...restProps }: Props = $props();
</script>

<td
	data-slot="table-cell"
	class={cn(
		'px-4 py-3 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]',
		className
	)}
	{...restProps}
>
	{@render children?.()}
</td>
