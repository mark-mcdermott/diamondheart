<script lang="ts">
	import { enhance } from '$app/forms';
	import { Card, Button, Input, Label } from '$lib/components/ui';
	import { User, Lock, Mail, ArrowLeft, Camera } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';

	interface AccountUser {
		id: string;
		email: string;
		name?: string | null;
		avatarUrl?: string | null;
	}

	interface Props {
		user: AccountUser | null;
		form?: { error?: string; passwordError?: string; success?: boolean } | null;
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

	let fileInput = $state<HTMLInputElement>(null!);
	let avatarPreview = $state<string | null>(null);
	let avatarDataUrl = $state('');

	function handleFileSelect(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		if (!file.type.startsWith('image/')) {
			toast.error('Please select an image file');
			return;
		}

		if (file.size > 1024 * 1024) {
			toast.error('Image must be less than 1MB');
			return;
		}

		const reader = new FileReader();
		reader.onload = (e) => {
			const result = e.target?.result as string;
			avatarPreview = result;
			avatarDataUrl = result;
		};
		reader.readAsDataURL(file);
	}

	const displayAvatar = $derived(avatarPreview || user?.avatarUrl);
	const avatarLetter = $derived(user?.email ? user.email.charAt(0).toUpperCase() : 'U');
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
								avatarPreview = null;
								avatarDataUrl = '';
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

						<!-- Avatar Upload -->
						<div class="flex justify-center">
							<button
								type="button"
								onclick={() => fileInput.click()}
								class="relative group w-20 h-20 rounded-full overflow-hidden cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
							>
								{#if displayAvatar}
									<img src={displayAvatar} alt="User avatar" class="w-full h-full object-cover" />
								{:else}
									<div class="w-full h-full bg-muted flex items-center justify-center text-muted-foreground text-2xl font-medium">
										{avatarLetter}
									</div>
								{/if}
								<div class="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
									<Camera class="w-6 h-6 text-white" />
								</div>
							</button>
							<input
								bind:this={fileInput}
								type="file"
								accept="image/*"
								class="hidden"
								onchange={handleFileSelect}
							/>
						</div>
						<input type="hidden" name="avatarUpload" value={avatarDataUrl} />

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
					<form
						method="POST"
						action="?/changePassword"
						use:enhance={() => {
							return async ({ result, update }) => {
								if (result.type === 'success') {
									toast.success('Password updated successfully');
									await update({ reset: true });
								} else if (result.type === 'failure') {
									toast.error((result.data as { error?: string })?.error || 'Failed to update password');
								}
							};
						}}
					>
						<Card.Content class="space-y-4">
							{#if form?.passwordError}
								<div class="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm">
									{form.passwordError}
								</div>
							{/if}
							<div class="space-y-2">
								<Label.Root for="current-password">Current Password</Label.Root>
								<Input.Root id="current-password" name="currentPassword" type="password" placeholder="••••••••" required />
							</div>
							<div class="space-y-2">
								<Label.Root for="new-password">New Password</Label.Root>
								<Input.Root id="new-password" name="newPassword" type="password" placeholder="••••••••" required />
							</div>
							<div class="space-y-2">
								<Label.Root for="confirm-password">Confirm New Password</Label.Root>
								<Input.Root id="confirm-password" name="confirmPassword" type="password" placeholder="••••••••" required />
							</div>
						</Card.Content>
						<Card.Footer>
							<Button.Root type="submit">Update Password</Button.Root>
						</Card.Footer>
					</form>
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
