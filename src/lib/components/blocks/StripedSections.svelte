<script lang="ts">
	export interface Section {
		id: string;
		title: string;
		content: string | string[];
	}

	interface Props {
		sections: Section[];
		maxWidth?: string;
	}

	let { sections, maxWidth = 'max-w-4xl' }: Props = $props();

	// Normalize content to always be an array
	function getContentArray(content: string | string[]): string[] {
		return Array.isArray(content) ? content : [content];
	}
</script>

{#each sections as section, i}
	<section
		id={section.id}
		class="py-20 scroll-mt-20 {i % 2 === 0 ? 'bg-muted' : ''}"
	>
		<div class="{maxWidth} mx-auto px-6">
			<h2 class="mt-0 text-3xl font-semibold mb-6">{section.title}</h2>
			{#each getContentArray(section.content) as paragraph, j}
				<p class="text-muted-foreground leading-relaxed {j < getContentArray(section.content).length - 1 ? 'mb-4' : ''}">
					{paragraph}
				</p>
			{/each}
		</div>
	</section>
{/each}
