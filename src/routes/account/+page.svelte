<script lang="ts">
	import { AccountPage } from '$lib/components/blocks';

	let { data, form } = $props();
</script>

<svelte:head>
	<title>Account Settings</title>
	<meta name="description" content="Manage your account settings" />
</svelte:head>

<AccountPage user={data.user} {form} />
