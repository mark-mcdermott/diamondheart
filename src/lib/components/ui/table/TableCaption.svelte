<script lang="ts">
	import { cn } from '$lib/utils';
	import type { Snippet } from 'svelte';

	interface Props {
		class?: string;
		children?: Snippet;
	}

	let { class: className, children }: Props = $props();
</script>

<caption data-slot="table-caption" class={cn('text-muted-foreground mt-4 text-sm', className)}>
	{@render children?.()}
</caption>
