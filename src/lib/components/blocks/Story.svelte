<script lang="ts">
	interface Props {
		title?: string;
		paragraphs: string[];
	}

	let { title, paragraphs }: Props = $props();
</script>

<section class="mb-16">
	{#if title}
		<h2 class="text-2xl font-semibold mt-0 mb-6">{title}</h2>
	{/if}
	<div class="prose prose-zinc max-w-none">
		{#each paragraphs as paragraph, i}
			<p class="text-muted-foreground leading-relaxed {i < paragraphs.length - 1 ? 'mb-4' : ''}">
				{paragraph}
			</p>
		{/each}
	</div>
</section>
