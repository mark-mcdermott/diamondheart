<script lang="ts">
	import { cn } from '$lib/utils';
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		class?: string;
		price: string | number;
		compareAtPrice?: string | number | null;
		currency?: string;
	}

	let { class: className, price, compareAtPrice, currency = '$', ...restProps }: Props = $props();

	function formatPrice(value: string | number): string {
		const num = typeof value === 'string' ? parseFloat(value) : value;
		return (num / 100).toFixed(2);
	}

	const hasDiscount = compareAtPrice && Number(compareAtPrice) > Number(price);
</script>

<div
	data-slot="product-card-price"
	class={cn('flex items-center gap-2 mt-1', className)}
	{...restProps}
>
	<span class={cn('font-semibold', hasDiscount ? 'text-red-600' : 'text-foreground')}>
		{currency}{formatPrice(price)}
	</span>
	{#if hasDiscount}
		<span class="text-muted-foreground line-through text-sm">
			{currency}{formatPrice(compareAtPrice)}
		</span>
	{/if}
</div>
