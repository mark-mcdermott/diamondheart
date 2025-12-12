<script lang="ts">
	import { cn } from '$lib/utils';
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		class?: string;
		value: string | number;
		unit?: string;
		color?: string;
	}

	let { class: className, value, unit, color, ...restProps }: Props = $props();
</script>

<div
	data-slot="metric-card-value"
	class={cn('mt-3', className)}
	{...restProps}
>
	<span class="text-3xl font-bold" style={color ? `color: ${color}` : ''}>
		{value}
	</span>
	{#if unit}
		<span class="text-muted-foreground text-lg ml-1">{unit}</span>
	{/if}
</div>
