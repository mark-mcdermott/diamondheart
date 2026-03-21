<script lang="ts">
	import '../app.css';
	import { Sonner } from '$lib/components/ui';
	import { Nav, Footer } from '$lib/components/blocks';
	import { onNavigate } from '$app/navigation';
	import type { NavLink, AvatarConfig } from '$lib/components/blocks';
	import { User, Settings, LogOut, Dumbbell, Apple } from 'lucide-svelte';

	let { children, data } = $props();

	const isLoggedIn = $derived(!!data.user);
	const logoHref = $derived(isLoggedIn ? '/dashboard' : '/');

	const navLinks = $derived<NavLink[]>([
		{ href: isLoggedIn ? '/dashboard' : '/', label: isLoggedIn ? 'Dashboard' : 'Home' },
		{ href: '/workout', label: 'Workout', icon: Dumbbell, requiresAuth: true },
		{ href: '/food', label: 'Food', icon: Apple, requiresAuth: true },
		{ href: '/login', label: 'Log In', hideWhenAuth: true, testId: 'nav-login' },
		{ href: '/merch', label: 'Merch' }
	]);

	const profileUrl = $derived(data.user?.id ? `/u/${data.user.id}` : '#');

	const avatarConfig = $derived<AvatarConfig>({
		show: true,
		links: [
			{
				label: 'Profile',
				href: profileUrl,
				icon: User,
				testId: 'menu-profile'
			},
			{
				label: 'Settings',
				href: '/account',
				icon: Settings,
				testId: 'menu-settings'
			},
			{
				label: 'Sign Out',
				icon: LogOut,
				action: '/logout',
				testId: 'menu-signout',
				separator: true
			}
		]
	});

	// Enable View Transitions API for smooth page transitions
	onNavigate((navigation) => {
		if (!document.startViewTransition) return;

		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});
</script>

<div class="min-h-dvh flex flex-col">
	<Nav showThemeToggle={true} themeToggleMode="light-dark-system"
		logo={"/images/logo.svg"}
		logoHref={logoHref}
		links={navLinks}
		maxWidth="max-w-6xl"
		user={data.user}
		avatar={avatarConfig}
	/>

	<main class="flex-1">
		{@render children()}
	</main>

	<Footer siteName="Ortholinear" logo={"/images/logo.svg"} maxWidth="max-w-6xl" />
</div>

<Sonner.Toaster />
