<script lang="ts">
	export interface ServiceItem {
		icon: string;
		title: string;
		description: string;
		features: string[];
	}

	interface Props {
		services: ServiceItem[];
	}

	let { services }: Props = $props();
</script>

<div class="grid gap-8 mb-16">
	{#each services as service}
		<div class="border border-border rounded-2xl p-8 hover:border-muted-foreground transition-colors">
			<div class="flex items-start gap-6">
				<div class="text-4xl">{service.icon}</div>
				<div class="flex-1">
					<h2 class="text-xl font-semibold mb-2">{service.title}</h2>
					<p class="text-muted-foreground mb-4">{service.description}</p>
					<ul class="text-sm text-muted-foreground space-y-1">
						{#each service.features as feature}
							<li>• {feature}</li>
						{/each}
					</ul>
				</div>
			</div>
		</div>
	{/each}
</div>
