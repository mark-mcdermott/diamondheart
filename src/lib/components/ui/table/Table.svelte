<script lang="ts">
	import { cn } from '$lib/utils';
	import type { Snippet } from 'svelte';
	import type { HTMLTableAttributes } from 'svelte/elements';

	interface Props extends HTMLTableAttributes {
		children?: Snippet;
	}

	let { class: className, children, ...restProps }: Props = $props();
</script>

<div data-slot="table-container" class="relative w-full overflow-x-auto border border-border rounded-lg overflow-hidden">
	<table data-slot="table" class={cn('w-full text-sm', className)} {...restProps}>
		{@render children?.()}
	</table>
</div>
