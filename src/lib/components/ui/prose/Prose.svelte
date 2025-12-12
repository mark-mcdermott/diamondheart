<script lang="ts">
	import { cn } from '$lib/utils';
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		class?: string;
		children?: Snippet;
		html?: string;
	}

	let { class: className, children, html, ...restProps }: Props = $props();
</script>

<div
	data-slot="prose"
	class={cn('prose', className)}
	{...restProps}
>
	{#if html}
		{@html html}
	{:else if children}
		{@render children()}
	{/if}
</div>

<style>
	.prose :global(h2) {
		font-size: 1.5rem;
		font-weight: 600;
		margin-top: 2.5rem;
		margin-bottom: 1rem;
		color: #18181b;
	}
	.prose :global(h3) {
		font-size: 1.25rem;
		font-weight: 600;
		margin-top: 2rem;
		margin-bottom: 0.75rem;
		color: #18181b;
	}
	.prose :global(p) {
		margin-bottom: 1.25rem;
		line-height: 1.8;
		color: #3f3f46;
	}
	.prose :global(ul),
	.prose :global(ol) {
		margin-bottom: 1.25rem;
		padding-left: 1.5rem;
		color: #3f3f46;
	}
	.prose :global(li) {
		margin-bottom: 0.5rem;
		line-height: 1.7;
	}
	.prose :global(code) {
		background: #f4f4f5;
		padding: 0.125rem 0.375rem;
		border-radius: 0.25rem;
		font-size: 0.875rem;
	}
	.prose :global(pre) {
		background: #18181b;
		color: #fafafa;
		padding: 1rem;
		border-radius: 0.5rem;
		overflow-x: auto;
		margin-bottom: 1.25rem;
	}
	.prose :global(pre code) {
		background: transparent;
		padding: 0;
	}
	.prose :global(blockquote) {
		border-left: 3px solid #e4e4e7;
		padding-left: 1.25rem;
		font-style: italic;
		color: #71717a;
		margin: 1.5rem 0;
	}
	.prose :global(a) {
		color: #18181b;
		text-decoration: underline;
	}
	.prose :global(a:hover) {
		color: #52525b;
	}
	.prose :global(img) {
		border-radius: 0.5rem;
		margin: 1.5rem 0;
	}
	.prose :global(hr) {
		border: none;
		border-top: 1px solid #e4e4e7;
		margin: 2rem 0;
	}
	.prose :global(table) {
		width: 100%;
		border-collapse: collapse;
		margin: 1.5rem 0;
	}
	.prose :global(th),
	.prose :global(td) {
		border: 1px solid #e4e4e7;
		padding: 0.5rem 0.75rem;
		text-align: left;
	}
	.prose :global(th) {
		background: #f4f4f5;
		font-weight: 600;
	}
</style>
