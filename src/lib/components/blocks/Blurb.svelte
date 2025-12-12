<script lang="ts">
	interface Props {
		title: string;
		description: string;
	}

	let { title, description }: Props = $props();
</script>

<div class="mb-12">
	<h1 class="text-4xl font-semibold tracking-tight mb-4">{title}</h1>
	<p class="text-muted-foreground text-lg">{description}</p>
</div>
