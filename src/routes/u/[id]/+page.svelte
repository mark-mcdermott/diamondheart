<script lang="ts">
	import { ProfilePage } from '$lib/components/blocks';

	let { data } = $props();
</script>

<svelte:head>
	<title>{data.profileUser.name || data.profileUser.email} - Profile</title>
	<meta name="description" content="User profile" />
</svelte:head>

<ProfilePage
	user={data.profileUser}
	currentUserId={data.user?.id}
/>
