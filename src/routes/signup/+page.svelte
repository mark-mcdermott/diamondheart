<script lang="ts">
	import { SignUpForm } from '$lib/components/blocks';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
</script>

<svelte:head>
	<title>Sign Up - ortholinear</title>
</svelte:head>

<SignUpForm {form} loginHref="/login" />
