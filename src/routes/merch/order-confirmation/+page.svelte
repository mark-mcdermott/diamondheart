<script lang="ts">
	import { Card } from '$lib/components/ui';
	import { CheckCircle, Package, Mail, MapPin, ArrowLeft } from 'lucide-svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>Order Confirmed - ortholinear Merch</title>
</svelte:head>

<div class="max-w-2xl mx-auto px-6 py-16">
	<div class="text-center mb-8">
		<div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
			<CheckCircle class="w-8 h-8 text-green-600 dark:text-green-400" />
		</div>
		<h1 class="text-3xl font-bold mb-2">Order Confirmed!</h1>
		<p class="text-muted-foreground">
			Thank you for your purchase. Your order is being processed.
		</p>
	</div>

	<Card.Root class="p-6 mb-6">
		<div class="flex items-center justify-between mb-4">
			<span class="text-sm text-muted-foreground">Order Number</span>
			<span class="font-mono font-semibold">{data.orderNumber}</span>
		</div>
		<div class="flex items-center justify-between">
			<span class="text-sm text-muted-foreground">Total</span>
			<span class="text-xl font-bold">${data.total.toFixed(2)}</span>
		</div>
	</Card.Root>

	<div class="grid gap-6 md:grid-cols-2">
		<Card.Root class="p-6">
			<div class="flex items-center gap-2 mb-4">
				<Mail class="w-4 h-4 text-muted-foreground" />
				<h2 class="font-semibold">Confirmation Email</h2>
			</div>
			<p class="text-sm text-muted-foreground">
				A confirmation email has been sent to:
			</p>
			<p class="font-medium mt-1">{data.email}</p>
		</Card.Root>

		{#if data.shippingAddress}
			<Card.Root class="p-6">
				<div class="flex items-center gap-2 mb-4">
					<MapPin class="w-4 h-4 text-muted-foreground" />
					<h2 class="font-semibold">Shipping Address</h2>
				</div>
				<div class="text-sm">
					<p class="font-medium">{data.shippingAddress.name}</p>
					<p class="text-muted-foreground">{data.shippingAddress.line1}</p>
					{#if data.shippingAddress.line2}
						<p class="text-muted-foreground">{data.shippingAddress.line2}</p>
					{/if}
					<p class="text-muted-foreground">
						{data.shippingAddress.city}, {data.shippingAddress.state} {data.shippingAddress.postalCode}
					</p>
					<p class="text-muted-foreground">{data.shippingAddress.country}</p>
				</div>
			</Card.Root>
		{/if}
	</div>

	{#if data.items && data.items.length > 0}
		<Card.Root class="p-6 mt-6">
			<div class="flex items-center gap-2 mb-4">
				<Package class="w-4 h-4 text-muted-foreground" />
				<h2 class="font-semibold">Order Items</h2>
			</div>
			<ul class="divide-y">
				{#each data.items as item}
					<li class="py-3 flex justify-between">
						<div>
							<p class="font-medium">{item.name}</p>
							<p class="text-sm text-muted-foreground">
								{item.color} / {item.size} × {item.quantity}
							</p>
						</div>
						<p class="font-medium">${(item.price * item.quantity / 100).toFixed(2)}</p>
					</li>
				{/each}
			</ul>
		</Card.Root>
	{/if}

	<div class="mt-8 p-6 bg-muted/50 rounded-lg">
		<h3 class="font-semibold mb-2">What's Next?</h3>
		<ul class="text-sm text-muted-foreground space-y-2">
			<li>• Your order will be printed and shipped within 2-5 business days</li>
			<li>• You'll receive a tracking number via email once shipped</li>
			<li>• Estimated delivery: 5-10 business days after shipping</li>
		</ul>
	</div>

	<div class="text-center mt-8">
		<a href="/merch" class="inline-flex items-center gap-2 text-primary hover:underline">
			<ArrowLeft class="w-4 h-4" />
			Continue Shopping
		</a>
	</div>
</div>
