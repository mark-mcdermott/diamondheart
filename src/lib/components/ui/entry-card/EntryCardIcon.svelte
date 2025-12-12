<script lang="ts">
	import { cn } from '$lib/utils';
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		class?: string;
		emoji?: string;
		color?: string;
	}

	let { class: className, emoji = '📊', color = '#3b82f6', ...restProps }: Props = $props();
</script>

<div
	data-slot="entry-card-icon"
	class={cn(
		'w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0',
		className
	)}
	style="background-color: {color}15"
	{...restProps}
>
	{emoji}
</div>
