<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Team - ortholinear</title>
	<meta name="description" content="Meet the team at ortholinear" />
</svelte:head>

<div class="max-w-4xl mx-auto px-6 py-16">
	<h1 class="text-4xl font-semibold tracking-tight mb-2">The Team</h1>
	<p class="text-muted-foreground mb-8">Meet the people of Dunder Mifflin Scranton</p>

	{#if data.users.length === 0}
		<p class="text-muted-foreground">No team members yet. Run <code class="bg-muted px-2 py-1 rounded">pnpm db:seed-office</code> to add The Office characters.</p>
	{:else}
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
			{#each data.users as user}
				<div class="border border-border rounded-lg p-4 hover:border-foreground/50 transition-colors">
					<div class="w-12 h-12 bg-muted rounded-full flex items-center justify-center text-xl mb-3">
						{user.name?.charAt(0) || '?'}
					</div>
					<h3 class="font-medium">{user.name || 'Unknown'}</h3>
					<p class="text-sm text-muted-foreground">{user.email}</p>
				</div>
			{/each}
		</div>
	{/if}
</div>
