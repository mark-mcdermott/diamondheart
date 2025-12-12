<script lang="ts">
	export interface TeamMember {
		icon: string;
		name: string;
		role: string;
		bio: string;
	}

	interface Props {
		title?: string;
		members: TeamMember[];
		columns?: 2 | 3 | 4;
	}

	let { title, members, columns = 3 }: Props = $props();

	const gridCols = {
		2: 'md:grid-cols-2',
		3: 'md:grid-cols-3',
		4: 'md:grid-cols-4'
	};
</script>

<section class="mb-16">
	{#if title}
		<h2 class="text-2xl font-semibold mt-0 mb-8">{title}</h2>
	{/if}
	<div class="grid {gridCols[columns]} gap-8">
		{#each members as member}
			<div class="text-center">
				<div class="text-6xl mb-4">{member.icon}</div>
				<h3 class="font-semibold mb-1">{member.name}</h3>
				<p class="text-sm text-muted-foreground mb-3">{member.role}</p>
				<p class="text-muted-foreground text-sm">{member.bio}</p>
			</div>
		{/each}
	</div>
</section>
