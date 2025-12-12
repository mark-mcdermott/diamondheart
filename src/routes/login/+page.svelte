<script lang="ts">
	import { LoginForm } from '$lib/components/blocks';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
</script>

<svelte:head>
	<title>Login - ortholinear</title>
</svelte:head>

<LoginForm {form} signupHref="/signup" />
