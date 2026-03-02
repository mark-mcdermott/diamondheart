<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button, Input, Label, Textarea } from '$lib/components/ui';
	import { toast } from 'svelte-sonner';
	import { CheckCircle } from 'lucide-svelte';

	let { form } = $props();
	let submitted = $state(false);
</script>

<svelte:head>
	<title>Contact - Ortholinear</title>
	<meta name="description" content="Contact Ortholinear" />
</svelte:head>

<div class="max-w-4xl mx-auto px-6 py-16">
	<h1 class="text-4xl font-semibold tracking-tight">Contact</h1>
	<p class="text-muted-foreground text-lg mt-4">
		Get in touch with us.
	</p>

	<div class="mt-8 max-w-md">
		{#if submitted}
			<div class="border border-border rounded-lg p-8 text-center">
				<CheckCircle class="w-12 h-12 text-green-600 mx-auto mb-4" />
				<h2 class="text-xl font-semibold mb-2">Message sent</h2>
				<p class="text-muted-foreground">We'll get back to you as soon as we can.</p>
			</div>
		{:else}
			<form
				method="POST"
				class="space-y-4"
				use:enhance={() => {
					return async ({ result, update }) => {
						if (result.type === 'success') {
							submitted = true;
							toast.success('Message sent!');
						} else if (result.type === 'failure') {
							toast.error((result.data as { error?: string })?.error || 'Failed to send');
							await update();
						}
					};
				}}
			>
				{#if form?.error}
					<div class="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm">
						{form.error}
					</div>
				{/if}

				<div class="space-y-2">
					<Label.Root for="name">Name</Label.Root>
					<Input.Root id="name" name="name" type="text" placeholder="Your name" value={(form as unknown as Record<string, string>)?.name ?? ''} required />
				</div>

				<div class="space-y-2">
					<Label.Root for="email">Email</Label.Root>
					<Input.Root id="email" name="email" type="email" placeholder="you@example.com" value={(form as unknown as Record<string, string>)?.email ?? ''} required />
				</div>

				<div class="space-y-2">
					<Label.Root for="message">Message</Label.Root>
					<Textarea.Root id="message" name="message" rows={4} placeholder="Your message" value={(form as unknown as Record<string, string>)?.message ?? ''} required />
				</div>

				<Button.Root type="submit" class="w-full">Send Message</Button.Root>
			</form>
		{/if}
	</div>
</div>
