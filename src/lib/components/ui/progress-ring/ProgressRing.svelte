<script lang="ts">
	import { cn } from '$lib/utils';
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		class?: string;
		value: number; // 0-100
		size?: number; // px
		strokeWidth?: number; // px
		color?: string;
		trackColor?: string;
		children?: Snippet;
	}

	let {
		class: className,
		value,
		size = 80,
		strokeWidth = 8,
		color = '#3b82f6',
		trackColor = '#e4e4e7',
		children,
		...restProps
	}: Props = $props();

	const radius = (size - strokeWidth) / 2;
	const circumference = radius * 2 * Math.PI;
	const clampedValue = Math.min(100, Math.max(0, value));
	const offset = circumference - (clampedValue / 100) * circumference;
</script>

<div
	data-slot="progress-ring"
	class={cn('relative inline-flex items-center justify-center', className)}
	style="width: {size}px; height: {size}px"
	{...restProps}
>
	<svg
		width={size}
		height={size}
		class="transform -rotate-90"
	>
		<!-- Track -->
		<circle
			cx={size / 2}
			cy={size / 2}
			r={radius}
			fill="none"
			stroke={trackColor}
			stroke-width={strokeWidth}
		/>
		<!-- Progress -->
		<circle
			cx={size / 2}
			cy={size / 2}
			r={radius}
			fill="none"
			stroke={color}
			stroke-width={strokeWidth}
			stroke-linecap="round"
			stroke-dasharray={circumference}
			stroke-dashoffset={offset}
			class="transition-all duration-500 ease-out"
		/>
	</svg>
	{#if children}
		<div class="absolute inset-0 flex items-center justify-center">
			{@render children()}
		</div>
	{/if}
</div>
