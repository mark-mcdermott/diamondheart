<script lang="ts">
	import { cn } from '$lib/utils';
	import { Minus, Plus } from 'lucide-svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		class?: string;
		quantity: number;
		onIncrement?: () => void;
		onDecrement?: () => void;
		min?: number;
		max?: number;
	}

	let { class: className, quantity, onIncrement, onDecrement, min = 1, max = 99, ...restProps }: Props = $props();
</script>

<div
	data-slot="cart-item-quantity"
	class={cn('flex items-center gap-2', className)}
	{...restProps}
>
	<button
		type="button"
		class="w-7 h-7 rounded border border-border flex items-center justify-center hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
		disabled={quantity <= min}
		onclick={onDecrement}
	>
		<Minus class="w-3 h-3" />
	</button>
	<span class="w-8 text-center text-sm font-medium">{quantity}</span>
	<button
		type="button"
		class="w-7 h-7 rounded border border-border flex items-center justify-center hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
		disabled={quantity >= max}
		onclick={onIncrement}
	>
		<Plus class="w-3 h-3" />
	</button>
</div>
