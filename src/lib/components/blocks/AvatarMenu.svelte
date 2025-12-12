<script lang="ts">
	import { enhance } from '$app/forms';
	import { DropdownMenu } from '$lib/components/ui';
	import { User, Settings, LogOut } from 'lucide-svelte';

	interface Props {
		userEmail: string;
		userId?: string;
	}

	let { userEmail, userId }: Props = $props();

	const avatarLetter = $derived(userEmail ? userEmail.charAt(0).toUpperCase() : 'U');
	const profileUrl = $derived(userId ? `/u/${userId}` : '#');
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger>
		<button
			data-testid="nav-avatar"
			class="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-xs cursor-pointer hover:bg-muted/80 transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
			aria-label="User menu"
		>
			{avatarLetter}
		</button>
	</DropdownMenu.Trigger>
	<DropdownMenu.Content data-testid="nav-user-menu" class="w-48">
		<DropdownMenu.Item>
			<a
				href={profileUrl}
				data-testid="menu-profile"
				class="flex items-center gap-2 cursor-pointer w-full"
			>
				<User class="h-4 w-4" />
				<span>Profile</span>
			</a>
		</DropdownMenu.Item>
		<DropdownMenu.Item>
			<a
				href="/account"
				data-testid="menu-settings"
				class="flex items-center gap-2 cursor-pointer w-full"
			>
				<Settings class="h-4 w-4" />
				<span>Settings</span>
			</a>
		</DropdownMenu.Item>
		<DropdownMenu.Separator />
		<DropdownMenu.Item>
			<form action="/logout" method="POST" use:enhance class="w-full">
				<button
					type="submit"
					data-testid="menu-signout"
					class="flex items-center gap-2 cursor-pointer w-full text-left"
				>
					<LogOut class="h-4 w-4" />
					<span>Sign Out</span>
				</button>
			</form>
		</DropdownMenu.Item>
	</DropdownMenu.Content>
</DropdownMenu.Root>
