<script lang="ts">
	export interface EmojiListItem {
		icon: string;
		title: string;
		description: string;
	}

	interface Props {
		title?: string;
		items: EmojiListItem[];
	}

	let { title, items }: Props = $props();
</script>

<div>
	{#if title}
		<h2 class="text-xl font-semibold mt-0 mb-6">{title}</h2>
	{/if}
	<div class="space-y-6">
		{#each items as item}
			<div class="flex gap-4">
				<div class="text-2xl">{item.icon}</div>
				<div>
					<h3 class="font-medium mb-1">{item.title}</h3>
					<p class="text-muted-foreground">{@html item.description}</p>
				</div>
			</div>
		{/each}
	</div>
</div>
