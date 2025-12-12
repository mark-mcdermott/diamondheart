<script lang="ts">
	import { cn } from '$lib/utils';
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		class?: string;
		value: number; // Current value
		goal: number; // Target value
		color?: string;
	}

	let { class: className, value, goal, color = '#3b82f6', ...restProps }: Props = $props();

	const percentage = Math.min(100, Math.round((value / goal) * 100));
	const isComplete = percentage >= 100;
</script>

<div
	data-slot="metric-card-progress"
	class={cn('mt-4', className)}
	{...restProps}
>
	<div class="flex items-center justify-between text-sm mb-1.5">
		<span class="text-muted-foreground">
			{isComplete ? 'Goal reached!' : `${percentage}% of goal`}
		</span>
		<span class="font-medium" style="color: {color}">
			{value} / {goal}
		</span>
	</div>
	<div class="h-2 bg-muted rounded-full overflow-hidden">
		<div
			class="h-full rounded-full transition-all duration-500"
			style="width: {percentage}%; background-color: {color}"
		></div>
	</div>
</div>
