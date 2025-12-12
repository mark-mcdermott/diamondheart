<script lang="ts">
	import { Card } from '$lib/components/ui';
	import { merchProducts, formatMerchPrice } from '$lib/data/merch';
	import { ShoppingBag } from 'lucide-svelte';
</script>

<svelte:head>
	<title>Merch - ortholinear</title>
	<meta name="description" content="Browse our merchandise" />
</svelte:head>

<div class="max-w-6xl mx-auto px-6 py-16">
	<div class="text-center mb-12">
		<h1 class="text-4xl sm:text-5xl font-bold mb-4">Merch</h1>
		<p class="text-lg text-muted-foreground max-w-2xl mx-auto">
			Rep us with our premium merch. All items are printed on-demand and shipped directly to you.
		</p>
	</div>

	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
		{#each merchProducts as product}
			<a href="/merch/{product.slug}" class="group no-underline">
				<Card.Root class="overflow-hidden hover:shadow-lg transition-shadow">
					<div class="aspect-square bg-muted flex items-center justify-center">
						{#if product.images[0]}
							<img
								src={product.images[0]}
								alt={product.name}
								class="w-full h-full object-cover"
								onerror={(e) => {
									const img = e.currentTarget as HTMLImageElement;
									img.style.display = 'none';
									const next = img.nextElementSibling as HTMLElement;
									if (next) next.style.display = 'flex';
								}}
							/>
							<div class="hidden w-full h-full items-center justify-center">
								<ShoppingBag class="w-16 h-16 text-muted-foreground/30" />
							</div>
						{:else}
							<ShoppingBag class="w-16 h-16 text-muted-foreground/30" />
						{/if}
					</div>
					<div class="p-6">
						<h2 class="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
							{product.name}
						</h2>
						<p class="text-muted-foreground text-sm mb-4 line-clamp-2">
							{product.description}
						</p>
						<div class="flex items-center justify-between">
							<span class="text-lg font-bold">{formatMerchPrice(product.price)}</span>
							<span class="text-sm text-muted-foreground">
								{product.variants.filter(v => v.inStock).length} options
							</span>
						</div>
					</div>
				</Card.Root>
			</a>
		{/each}
	</div>

	{#if merchProducts.length === 0}
		<div class="text-center py-16">
			<ShoppingBag class="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
			<h2 class="text-xl font-semibold mb-2">Coming Soon</h2>
			<p class="text-muted-foreground">Our merch store is being set up. Check back soon!</p>
		</div>
	{/if}
</div>

<style>
	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
