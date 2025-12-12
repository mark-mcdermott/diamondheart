<script lang="ts">
	import { cn } from '$lib/utils';
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends HTMLAttributes<HTMLSpanElement> {
		class?: string;
		price: string | number;
		quantity?: number;
		currency?: string;
	}

	let { class: className, price, quantity = 1, currency = '$', ...restProps }: Props = $props();

	function formatPrice(value: string | number): string {
		const num = typeof value === 'string' ? parseFloat(value) : value;
		return (num / 100).toFixed(2);
	}

	const lineTotal = Number(price) * quantity;
</script>

<span
	data-slot="cart-item-price"
	class={cn('font-semibold text-foreground', className)}
	{...restProps}
>
	{currency}{formatPrice(lineTotal)}
</span>
