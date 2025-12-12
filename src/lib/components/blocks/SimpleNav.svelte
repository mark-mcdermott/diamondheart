<script lang="ts">
	import type { Snippet } from 'svelte';

	// SimpleNav - A minimal navigation bar with logo and links
	interface NavLink {
		href: string;
		label: string;
	}

	interface Props {
		siteName?: string;
		// Logo next to site name - can be text/emoji, image path, or use logoIcon snippet for icons/SVGs
		logo?: string;
		logoIcon?: Snippet;
		links?: NavLink[];
	}

	let {
		siteName,
		logo,
		logoIcon,
		links
	}: Props = $props();

	// Detect if logo is an image path or text/emoji
	const isLogoImage = $derived(logo?.startsWith('/') || logo?.startsWith('http') || logo?.endsWith('.png') || logo?.endsWith('.jpg') || logo?.endsWith('.svg'));
</script>

<nav class="w-full flex items-center justify-between px-8 py-6">
	<a href="/" class="flex items-center gap-2 text-2xl no-underline hover:no-underline">
		{#if logoIcon}
			<span class="text-2xl">
				{@render logoIcon()}
			</span>
		{:else if logo}
			{#if isLogoImage}
				<img src={logo} alt={siteName ?? ''} class="w-8 h-8" />
			{:else}
				<span>{logo}</span>
			{/if}
		{/if}
		{#if siteName}
			<span class="font-semibold text-lg tracking-tight">{siteName}</span>
		{/if}
	</a>
	{#if links && links.length > 0}
		<div class="flex gap-6">
			{#each links as link}
				<a href={link.href} class="text-sm text-muted-foreground hover:text-foreground transition-colors">
					{link.label}
				</a>
			{/each}
		</div>
	{/if}
</nav>
