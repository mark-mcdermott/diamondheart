<script lang="ts">
	import { Card } from '$lib/components/ui';
	import { User, Calendar, ArrowLeft } from 'lucide-svelte';

	interface ProfileUser {
		id: string;
		email: string;
		name?: string | null;
		avatarUrl?: string | null;
		createdAt?: Date | string | null;
	}

	interface Props {
		user: ProfileUser;
		currentUserId?: string | null;
		backHref?: string | null;
		backLabel?: string;
		settingsHref?: string;
		class?: string;
	}

	let {
		user,
		currentUserId = null,
		backHref = '/',
		backLabel = 'Back to Home',
		settingsHref = '/account',
		class: className = ''
	}: Props = $props();

	const isOwnProfile = $derived(currentUserId === user.id);
	const avatarLetter = $derived(
		user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()
	);
	const displayName = $derived(user.name || 'Anonymous User');
	const memberSince = $derived(
		user.createdAt ? new Date(user.createdAt).toLocaleDateString() : null
	);
</script>

<div class="max-w-4xl mx-auto px-6 py-12 {className}">
	{#if backHref}
		<a
			href={backHref}
			class="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
		>
			<ArrowLeft class="w-4 h-4" />
			{backLabel}
		</a>
	{/if}

	<h1 class="mb-2">{isOwnProfile ? 'Your Profile' : 'User Profile'}</h1>
	<p class="text-muted-foreground text-lg mb-12">
		{isOwnProfile ? 'View and manage your profile information.' : 'View user profile information.'}
	</p>

	<Card.Root>
		<Card.Header>
			<div class="flex items-center gap-4">
				<div
					class="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-2xl overflow-hidden"
				>
					{#if user.avatarUrl}
						<img src={user.avatarUrl} alt={displayName} class="w-full h-full object-cover" />
					{:else}
						{avatarLetter}
					{/if}
				</div>
				<div>
					<Card.Title class="text-2xl">{displayName}</Card.Title>
					<Card.Description>{user.email}</Card.Description>
				</div>
			</div>
		</Card.Header>
		<Card.Content class="space-y-4">
			{#if isOwnProfile}
				<div class="flex items-center gap-3 text-muted-foreground">
					<User class="w-5 h-5" />
					<span>ID: {user.id}</span>
				</div>
				{#if memberSince}
					<div class="flex items-center gap-3 text-muted-foreground">
						<Calendar class="w-5 h-5" />
						<span>Member since {memberSince}</span>
					</div>
				{/if}
			{:else}
				<p class="text-muted-foreground">Profile information is private.</p>
			{/if}
		</Card.Content>
		{#if isOwnProfile && settingsHref}
			<Card.Footer>
				<a
					href={settingsHref}
					class="text-sm text-muted-foreground hover:text-foreground transition-colors"
				>
					Edit your settings →
				</a>
			</Card.Footer>
		{/if}
	</Card.Root>
</div>
