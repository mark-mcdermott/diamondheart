<script lang="ts">
	import { cn } from '$lib/utils';
	import type { HTMLImgAttributes } from 'svelte/elements';

	interface Props extends HTMLImgAttributes {
		class?: string;
	}

	let { class: className, src, alt, ...restProps }: Props = $props();
</script>

{#if src}
	<img
		{src}
		{alt}
		data-slot="post-card-image"
		class={cn('w-full h-48 object-cover rounded-lg mb-4', className)}
		{...restProps}
	/>
{/if}
