<script lang="ts">
	import { enhance } from '$app/forms';
	import { Card, Button, Input, Label } from '$lib/components/ui';
	import { User, Lock, Mail, ArrowLeft } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';

	interface AccountUser {
		id: string;
		email: string;
		name?: string | null;
	}

	interface Props {
		user: AccountUser | null;
		form?: { error?: string; success?: boolean } | null;
		backHref?: string | null;
		backLabel?: string;
		loginHref?: string;
		action?: string;
		showPasswordSection?: boolean;
		class?: string;
	}

	let {
		user,
		form = null,
		backHref = '/',
		backLabel = 'Back to Home',
		loginHref = '/login',
		action = '',
		showPasswordSection = true,
		class: className = ''
	}: Props = $props();
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

	<h1 class="mb-2">Account Settings</h1>
	<p class="text-muted-foreground text-lg mb-12">
		Manage your profile information and security settings.
	</p>

	{#if !user}
		<Card.Root>
			<Card.Content class="py-8 text-center">
				<p class="text-muted-foreground mb-4">You need to be logged in to access settings.</p>
				<a href={loginHref}>
					<Button.Root>Log In</Button.Root>
				</a>
			</Card.Content>
		</Card.Root>
	{:else}
		<div class="space-y-6">
			<!-- Profile Section -->
			<Card.Root>
				<Card.Header>
					<Card.Title class="flex items-center gap-2">
						<User class="w-5 h-5" />
						Profile
					</Card.Title>
					<Card.Description>Manage your profile information</Card.Description>
				</Card.Header>
				<form
					method="POST"
					{action}
					use:enhance={() => {
						return async ({ result, update }) => {
							if (result.type === 'success') {
								toast.success('Profile updated successfully');
								await update();
							} else if (result.type === 'failure') {
								toast.error((result.data as { error?: string })?.error || 'Failed to update profile');
							}
						};
					}}
				>
					<Card.Content class="space-y-4">
						{#if form?.error}
							<div class="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
								{form.error}
							</div>
						{/if}

						<div class="space-y-2">
							<Label.Root for="name">Display Name</Label.Root>
							<Input.Root
								id="name"
								name="name"
								type="text"
								value={user.name || ''}
								placeholder="Enter your display name"
							/>
						</div>

						<div class="space-y-2">
							<Label.Root for="email">Email</Label.Root>
							<Input.Root
								id="email"
								name="email"
								type="email"
								value={user.email}
								placeholder="Enter your email"
								required
							/>
						</div>
					</Card.Content>
					<Card.Footer>
						<Button.Root type="submit">Save Changes</Button.Root>
					</Card.Footer>
				</form>
			</Card.Root>

			<!-- Security Section -->
			{#if showPasswordSection}
				<Card.Root>
					<Card.Header>
						<Card.Title class="flex items-center gap-2">
							<Lock class="w-5 h-5" />
							Security
						</Card.Title>
						<Card.Description>Manage your password and security settings</Card.Description>
					</Card.Header>
					<Card.Content class="space-y-4">
						<div class="space-y-2">
							<Label.Root for="current-password">Current Password</Label.Root>
							<Input.Root id="current-password" type="password" placeholder="••••••••" disabled />
						</div>
						<div class="space-y-2">
							<Label.Root for="new-password">New Password</Label.Root>
							<Input.Root id="new-password" type="password" placeholder="••••••••" disabled />
						</div>
						<div class="space-y-2">
							<Label.Root for="confirm-password">Confirm New Password</Label.Root>
							<Input.Root id="confirm-password" type="password" placeholder="••••••••" disabled />
						</div>
					</Card.Content>
					<Card.Footer>
						<Button.Root disabled>Update Password</Button.Root>
						<p class="text-xs text-muted-foreground ml-3">Coming soon</p>
					</Card.Footer>
				</Card.Root>
			{/if}

			<!-- Account Info -->
			<Card.Root>
				<Card.Header>
					<Card.Title class="flex items-center gap-2">
						<Mail class="w-5 h-5" />
						Account Info
					</Card.Title>
				</Card.Header>
				<Card.Content>
					<p class="text-sm text-muted-foreground">
						<span class="font-medium">User ID:</span>
						<code class="ml-2 px-2 py-1 bg-muted rounded text-xs">{user.id}</code>
					</p>
				</Card.Content>
			</Card.Root>
		</div>
	{/if}
</div>
