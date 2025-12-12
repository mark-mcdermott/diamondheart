<svelte:head>
	<title>Contact - Ortholinear</title>
	<meta name="description" content="Contact Ortholinear" />
</svelte:head>

<div class="max-w-4xl mx-auto px-6 py-16">
	<h1 class="text-4xl font-semibold tracking-tight">Contact</h1>
	<p class="text-muted-foreground text-lg mt-4">
		Get in touch with us.
	</p>

	<div class="mt-8 card max-w-md">
		<form class="space-y-4">
			<div>
				<label for="name" class="block text-sm font-medium text-muted-foreground mb-1">Name</label>
				<input type="text" id="name" name="name" class="form-input w-full" placeholder="Your name" />
			</div>
			<div>
				<label for="email" class="block text-sm font-medium text-muted-foreground mb-1">Email</label>
				<input type="email" id="email" name="email" class="form-input w-full" placeholder="you@example.com" />
			</div>
			<div>
				<label for="message" class="block text-sm font-medium text-muted-foreground mb-1">Message</label>
				<textarea id="message" name="message" rows="4" class="form-input w-full" placeholder="Your message"></textarea>
			</div>
			<button type="submit" class="btn btn-dark w-full">Send Message</button>
		</form>
	</div>
</div>
