<script lang="ts">
	import { Flame } from 'lucide-svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		title?: string;
		// Image above the title (centered)
		image?: string;
		imageSize?: 'sm' | 'md' | 'lg';
		// Logo next to the title - can be text/emoji, image path, or use logoIcon snippet for icons/SVGs
		logo?: string;
		logoIcon?: Snippet;
		tagline?: string;
		showFlame?: boolean;
		description?: string;
		children?: Snippet;
	}

	let {
		title = 'cleanroom',
		image,
		imageSize = 'sm',
		logo,
		logoIcon,
		tagline = 'Less Boilerplate, More Boil',
		showFlame = false,
		description,
		children
	}: Props = $props();

	const imageSizeClasses = {
		sm: 'w-16 h-16',
		md: 'w-32 h-32',
		lg: 'w-48 h-48'
	};

	// Detect if logo is an image path or text/emoji
	const isLogoImage = $derived(logo?.startsWith('/') || logo?.startsWith('http') || logo?.endsWith('.png') || logo?.endsWith('.jpg') || logo?.endsWith('.svg'));
</script>

<div class="flex justify-center items-center min-h-[70vh] px-6">
	<div class="card w-full max-w-md text-center space-y-6">
		{#if image}
			<div class="flex justify-center mb-4">
				<img src={image} alt={title} class={imageSizeClasses[imageSize]} />
			</div>
		{/if}
		<h1 class="flex items-center justify-center gap-3">
			{#if logoIcon}
				<span class="text-5xl sm:text-6xl">
					{@render logoIcon()}
				</span>
			{:else if logo}
				{#if isLogoImage}
					<img src={logo} alt="" class="w-12 h-12 sm:w-14 sm:h-14 translate-y-1" />
				{:else}
					<span class="text-5xl sm:text-6xl">{logo}</span>
				{/if}
			{/if}
			{title}
		</h1>
		{#if tagline}
			<h2
				class="flex items-center justify-center gap-1 text-muted-foreground font-medium tracking-hero text-base !mt-2"
			>
				{tagline}
				{#if showFlame}
					<Flame class="w-4 h-4 text-orange-500" />
				{/if}
			</h2>
		{/if}
		{#if description}
			<p class="text-muted-foreground text-lg mt-3">
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
