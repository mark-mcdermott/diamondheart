<script lang="ts">
	import { Button, Card } from '$lib/components/ui';
	import { getMerchAvailableSizes, getMerchAvailableColors, getMerchVariantByOptions, formatMerchPrice } from '$lib/data/merch';
	import { ShoppingBag, ArrowLeft, Check } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';

	let { data } = $props();
	const product = data.product;

	const sizes = getMerchAvailableSizes(product);
	const colors = getMerchAvailableColors(product);

	let selectedSize = $state(sizes[0] || '');
	let selectedColor = $state(colors[0]?.color || '');
	let isLoading = $state(false);

	const selectedVariant = $derived(getMerchVariantByOptions(product, selectedSize, selectedColor));

	async function handleCheckout() {
		if (!selectedVariant) {
			toast.error('Please select a size and color');
			return;
		}

		isLoading = true;
		try {
			const response = await fetch('/api/merch/checkout', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					productId: product.id,
					variantId: selectedVariant.id,
					quantity: 1
				})
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error || 'Failed to create checkout');
			}

			// Redirect to Stripe checkout
			window.location.href = result.url;
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to create checkout');
			isLoading = false;
		}
	}
</script>

<svelte:head>
	<title>{product.name} - ortholinear Merch</title>
	<meta name="description" content={product.description} />
</svelte:head>

<div class="max-w-6xl mx-auto px-6 py-8">
	<a href="/merch" class="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 no-underline">
		<ArrowLeft class="w-4 h-4" />
		Back to Merch
	</a>

	<div class="grid md:grid-cols-2 gap-12">
		<!-- Product Image -->
		<div class="aspect-square bg-muted rounded-2xl flex items-center justify-center overflow-hidden">
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
					<ShoppingBag class="w-24 h-24 text-muted-foreground/30" />
				</div>
			{:else}
				<ShoppingBag class="w-24 h-24 text-muted-foreground/30" />
			{/if}
		</div>

		<!-- Product Info -->
		<div>
			<h1 class="text-3xl sm:text-4xl font-bold mb-4">{product.name}</h1>
			<p class="text-2xl font-bold mb-6">{formatMerchPrice(product.price)}</p>
			<p class="text-muted-foreground mb-8">{product.description}</p>

			<!-- Color Selector -->
			{#if colors.length > 1}
				<div class="mb-6">
					<label class="block text-sm font-medium mb-3">Color: {selectedColor}</label>
					<div class="flex gap-3">
						{#each colors as { color, hex }}
							<button
								type="button"
								onclick={() => selectedColor = color}
								class="w-10 h-10 rounded-full border-2 transition-all flex items-center justify-center cursor-pointer"
								style="background-color: {hex}; border-color: {selectedColor === color ? 'var(--app-primary)' : 'transparent'};"
								title={color}
							>
								{#if selectedColor === color}
									<Check class="w-5 h-5" style="color: {hex === '#ffffff' || hex === '#fff' ? '#000' : '#fff'}" />
								{/if}
							</button>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Size Selector -->
			<div class="mb-8">
				<label class="block text-sm font-medium mb-3">Size</label>
				<div class="flex flex-wrap gap-3">
					{#each sizes as size}
						<button
							type="button"
							onclick={() => selectedSize = size}
							class="px-4 py-2 border rounded-lg transition-all cursor-pointer {selectedSize === size ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-foreground/50'}"
						>
							{size}
						</button>
					{/each}
				</div>
			</div>

			<!-- Buy Button -->
			<Button.Root
				onclick={handleCheckout}
				disabled={!selectedVariant || isLoading}
				class="w-full py-6 text-lg"
			>
				{#if isLoading}
					Processing...
				{:else}
					Buy Now - {formatMerchPrice(product.price)}
				{/if}
			</Button.Root>

			<p class="text-sm text-muted-foreground mt-4 text-center">
				Shipping calculated at checkout. Printed and shipped by Printful.
			</p>

			<!-- Product Details -->
			<Card.Root class="mt-8 p-6">
				<h3 class="font-semibold mb-3">Product Details</h3>
				<ul class="text-sm text-muted-foreground space-y-2">
					<li>100% ring-spun cotton</li>
					<li>Pre-shrunk fabric</li>
					<li>Side-seamed construction</li>
					<li>Shoulder-to-shoulder taping</li>
					<li>Printed on demand - ships in 2-5 business days</li>
				</ul>
			</Card.Root>
		</div>
	</div>
</div>
