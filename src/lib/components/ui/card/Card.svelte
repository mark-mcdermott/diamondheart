<script lang="ts">
	import { cn } from '$lib/utils';
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		children?: Snippet;
	}

	let { class: className, children, ...restProps }: Props = $props();
</script>

<div
	data-slot="card"
	class={cn(
		'bg-card text-card-foreground flex flex-col gap-6 rounded-2xl border border-border p-8 hover:border-muted-foreground transition-colors',
		className
	)}
	{...restProps}
>
	{@render children?.()}
</div>
