<script lang="ts">
	import { cn } from '$lib/utils';
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends HTMLAttributes<HTMLTableSectionElement> {
		children?: Snippet;
	}

	let { class: className, children, ...restProps }: Props = $props();
</script>

<tfoot
	data-slot="table-footer"
	class={cn('bg-muted/50 border-t font-medium [&>tr]:last:border-b-0', className)}
	{...restProps}
>
	{@render children?.()}
</tfoot>
