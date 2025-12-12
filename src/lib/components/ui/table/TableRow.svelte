<script lang="ts">
	import { cn } from '$lib/utils';
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends HTMLAttributes<HTMLTableRowElement> {
		children?: Snippet;
	}

	let { class: className, children, ...restProps }: Props = $props();
</script>

<tr
	data-slot="table-row"
	class={cn(
		'transition-colors hover:bg-muted data-[state=selected]:bg-muted',
		className
	)}
	{...restProps}
>
	{@render children?.()}
</tr>
