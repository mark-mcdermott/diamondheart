<script lang="ts">
	import { cn } from '$lib/utils';
	import { TrendingUp, TrendingDown, Minus } from 'lucide-svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		class?: string;
		value: number; // Percentage change
		label?: string;
	}

	let { class: className, value, label = 'vs last week', ...restProps }: Props = $props();

	const isPositive = value > 0;
	const isNegative = value < 0;
	const isNeutral = value === 0;
</script>

<div
	data-slot="stat-card-trend"
	class={cn(
		'flex items-center gap-1 text-sm mt-2',
		isPositive && 'text-emerald-600',
		isNegative && 'text-red-600',
		isNeutral && 'text-muted-foreground',
		className
	)}
	{...restProps}
>
	{#if isPositive}
		<TrendingUp class="w-4 h-4" />
		<span>+{value}%</span>
	{:else if isNegative}
		<TrendingDown class="w-4 h-4" />
		<span>{value}%</span>
	{:else}
		<Minus class="w-4 h-4" />
		<span>0%</span>
	{/if}
	<span class="text-muted-foreground">{label}</span>
</div>
