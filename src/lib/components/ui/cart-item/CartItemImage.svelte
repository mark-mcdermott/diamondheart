<script lang="ts">
	import { cn } from '$lib/utils';
	import type { HTMLImgAttributes } from 'svelte/elements';

	interface Props extends HTMLImgAttributes {
		class?: string;
	}

	let { class: className, src, alt, ...restProps }: Props = $props();
</script>

{#if src}
	<div class={cn('w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-muted', className)}>
		<img
			{src}
			{alt}
			data-slot="cart-item-image"
			class="w-full h-full object-cover"
			{...restProps}
		/>
	</div>
{:else}
	<div class={cn('w-20 h-20 flex-shrink-0 rounded-lg bg-muted flex items-center justify-center', className)}>
		<span class="text-muted-foreground text-2xl">📦</span>
	</div>
{/if}
