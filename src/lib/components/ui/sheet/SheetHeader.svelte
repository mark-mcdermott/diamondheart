<script lang="ts">
	import { cn } from '$lib/utils';
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		children?: Snippet;
	}

	let { class: className, children, ...restProps }: Props = $props();
</script>

<div data-slot="sheet-header" class={cn('flex flex-col gap-1.5 p-4', className)} {...restProps}>
	{@render children?.()}
</div>
