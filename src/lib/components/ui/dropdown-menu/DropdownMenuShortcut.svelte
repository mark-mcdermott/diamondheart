<script lang="ts">
	import { cn } from '$lib/utils';
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends HTMLAttributes<HTMLSpanElement> {
		children?: Snippet;
	}

	let { class: className, children, ...restProps }: Props = $props();
</script>

<span
	data-slot="dropdown-menu-shortcut"
	class={cn('text-muted-foreground ml-auto text-xs tracking-widest', className)}
	{...restProps}
>
	{@render children?.()}
</span>
