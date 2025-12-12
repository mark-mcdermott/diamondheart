<script lang="ts">
	import { cn } from '$lib/utils';
	import type { HTMLImgAttributes } from 'svelte/elements';

	interface Props extends HTMLImgAttributes {
		class?: string;
	}

	let { class: className, src, alt, ...restProps }: Props = $props();
</script>

{#if src}
	<div class={cn('relative aspect-square overflow-hidden rounded-lg bg-muted mb-3', className)}>
		<img
			{src}
			{alt}
			data-slot="product-card-image"
			class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
			{...restProps}
		/>
	</div>
{:else}
	<div class={cn('relative aspect-square overflow-hidden rounded-lg bg-muted mb-3 flex items-center justify-center', className)}>
		<span class="text-muted-foreground text-4xl">📦</span>
	</div>
{/if}
