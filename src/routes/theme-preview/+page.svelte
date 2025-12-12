<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { Palette, ExternalLink } from 'lucide-svelte';

	let showTab = $derived($page.url.searchParams.get('theme_forseen') === 'true');

	function enablePreview() {
		goto('?theme_forseen=true', { replaceState: true });
	}

	function disablePreview() {
		goto($page.url.pathname, { replaceState: true });
	}
</script>

<svelte:head>
	<title>Theme Preview</title>
	<meta name="description" content="Live theme and font preview powered by ThemeForseen" />
</svelte:head>

<div class="min-h-screen p-8" style="background-color: var(--color-bg, #ffffff); color: var(--color-text, #333333);">
	<div class="max-w-4xl mx-auto">
		<h1 class="text-4xl font-bold mb-4" style="font-family: var(--font-heading, Georgia, serif); color: var(--color-primary, #7209B7);">
			Theme Preview
		</h1>
		<p class="mb-8" style="font-family: var(--font-body, system-ui, sans-serif);">
			Powered by <a href="https://www.themeforseen.com" target="_blank" class="underline" style="color: var(--color-accent, #F72585);">ThemeForseen</a>
		</p>

		{#if !showTab}
			<button onclick={enablePreview} class="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold cursor-pointer" style="background-color: var(--color-primary, #7209B7); color: white;">
				<Palette class="w-5 h-5" />
				Enable Theme Preview Mode
			</button>
			<p class="text-sm mt-3 opacity-70">
				Or add <code class="px-2 py-1 rounded" style="background-color: var(--color-card-bg, #F8F0FF);">?theme_forseen=true</code> to any URL
			</p>
		{:else}
			<div class="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm" style="background-color: var(--color-card-bg, #F8F0FF);">
				<span class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
				Theme Preview Mode Active
				<button onclick={disablePreview} class="ml-2 opacity-60 hover:opacity-100 cursor-pointer">&times;</button>
			</div>
		{/if}

		<!-- Demo Cards -->
		<div class="grid md:grid-cols-2 gap-6 mt-8">
			<div class="p-6 rounded-xl" style="background-color: var(--color-card-bg, #F8F0FF);">
				<h2 class="text-2xl font-semibold mb-3" style="font-family: var(--font-heading, Georgia, serif); color: var(--color-primary, #7209B7);">
					Sample Card
				</h2>
				<p style="font-family: var(--font-body, system-ui, sans-serif);">
					This card demonstrates how your content will look with the selected theme.
				</p>
				<button class="mt-4 px-4 py-2 rounded-lg cursor-pointer" style="background-color: var(--color-accent, #F72585); color: white;">
					Action Button
				</button>
			</div>
			<div class="p-6 rounded-xl" style="background-color: var(--color-card-bg, #F8F0FF);">
				<h2 class="text-2xl font-semibold mb-3" style="font-family: var(--font-heading, Georgia, serif); color: var(--color-accent, #F72585);">
					Another Card
				</h2>
				<p style="font-family: var(--font-body, system-ui, sans-serif);">
					Font pairings affect readability and personality.
				</p>
				<div class="mt-4 flex gap-2">
					<span class="px-3 py-1 rounded-full text-sm" style="background-color: var(--color-extra, #4CC9F0); color: white;">Tag One</span>
					<span class="px-3 py-1 rounded-full text-sm" style="background-color: var(--color-primary-shadow, #560BAD); color: white;">Tag Two</span>
				</div>
			</div>
		</div>

		<!-- Instructions -->
		<div class="mt-8 p-6 rounded-xl" style="background-color: var(--color-card-bg, #F8F0FF);">
			<h3 class="text-xl font-semibold mb-4" style="font-family: var(--font-heading, Georgia, serif); color: var(--color-primary, #7209B7);">
				How It Works
			</h3>
			<ol class="list-decimal list-inside space-y-2">
				<li>Add <code class="px-1 rounded" style="background-color: var(--color-bg);">?theme_forseen=true</code> to any URL</li>
				<li>Click the palette tab on the right side</li>
				<li>Browse color palettes and font pairings</li>
				<li>See changes applied live to your site</li>
			</ol>
			<a href="https://www.themeforseen.com" target="_blank" class="inline-flex items-center gap-1 mt-4 underline" style="color: var(--color-accent, #F72585);">
				Learn more <ExternalLink class="w-4 h-4" />
			</a>
		</div>
	</div>
</div>
