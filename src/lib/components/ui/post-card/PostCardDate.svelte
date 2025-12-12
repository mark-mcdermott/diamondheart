<script lang="ts">
	import { cn } from '$lib/utils';
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends HTMLAttributes<HTMLTimeElement> {
		class?: string;
		date: Date | string | null;
		format?: Intl.DateTimeFormatOptions;
	}

	let {
		class: className,
		date,
		format = { year: 'numeric', month: 'long', day: 'numeric' },
		...restProps
	}: Props = $props();

	function formatDate(d: Date | string | null): string {
		if (!d) return '';
		const dateObj = new Date(d);
		return dateObj.toLocaleDateString('en-US', format);
	}
</script>

<time
	data-slot="post-card-date"
	class={cn('text-sm text-muted-foreground mt-3 block', className)}
	{...restProps}
>
	{formatDate(date)}
</time>
