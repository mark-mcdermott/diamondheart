<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title?: string;
		// Image above the title (centered)
		image?: string;
		// Logo next to the title - can be text/emoji, image path, or use logoIcon snippet for icons/SVGs
		logo?: string;
		logoIcon?: Snippet;
		description?: string;
		// Max width for description text (e.g., 'max-w-md', 'max-w-2xl')
		descriptionWidth?: string;
		// If true, hero takes only the space needed by its content (no min-height)
		inline?: boolean;
		children?: Snippet;
	}

	let {
		title = 'My App',
		image,
		logo,
		logoIcon,
		description,
		descriptionWidth = 'max-w-md',
		inline = false,
		children
	}: Props = $props();

	// Detect if logo is an image path or text/emoji
	const isLogoImage = $derived(logo?.startsWith('/') || logo?.startsWith('http') || logo?.endsWith('.png') || logo?.endsWith('.jpg') || logo?.endsWith('.svg'));
</script>

<div class="w-full flex justify-center items-center text-center {inline ? '' : 'min-h-[50vh]'}">
	<div class="py-16">
		{#if image}
			<div class="flex justify-center mb-6">
				<img src={image} alt={title} class="w-16 h-16" />
			</div>
		{/if}
		<h1
			class="text-4xl sm:text-5xl font-semibold tracking-tight flex items-center justify-center gap-3"
		>
			{#if logoIcon}
				<span class="text-5xl sm:text-6xl">
					{@render logoIcon()}
				</span>
			{:else if logo}
				{#if isLogoImage}
					<img src={logo} alt="" class="w-12 h-12 sm:w-14 sm:h-14" />
				{:else}
					<span class="text-5xl sm:text-6xl">{logo}</span>
				{/if}
			{/if}
			{title}
		</h1>
		{#if description}
			<p class="text-muted-foreground text-lg mt-6 {descriptionWidth} mx-auto px-4">
				{description}
			</p>
		{/if}
		{#if children}
			<div class="flex gap-3 justify-center mt-6">
				{@render children()}
			</div>
		{/if}
	</div>
</div>
