<script lang="ts">
	import { onMount } from 'svelte';
	onMount(() => { import('theme-forseen'); });
	import '../app.css';
	import { Nav, Footer } from '$lib/components/blocks';
	import { onNavigate } from '$app/navigation';
	import type { NavLink, AvatarConfig } from '$lib/components/blocks';
	import { User, Settings, LogOut } from 'lucide-svelte';

	let { children, data } = $props();

	const navLinks: NavLink[] = [
		{ href: '/', label: 'Home' },
		{ href: '/about', label: 'About' },
		{ href: '/services', label: 'Services' },
		{ href: '/contact', label: 'Contact' },
		{ href: '/login', label: 'Log In', hideWhenAuth: true, testId: 'nav-login' },
		{ href: '/signup', label: 'Sign Up', hideWhenAuth: true, testId: 'nav-signup' },
		{ href: '/merch', label: 'Merch' }
	];

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
		siteName="Ortholinear"
		logo={"rocket"}
		links={navLinks}
		maxWidth="max-w-6xl"
		user={data.user}
		avatar={avatarConfig}
	/>

	<main class="flex-1">
		{@render children()}
	</main>

	<Footer siteName="Ortholinear" logo={"rocket"} maxWidth="max-w-6xl" />
</div>
