<script lang="ts" module>
	import type { ComponentType } from 'svelte';

	export interface ToggleOption {
		label: string;
		href: string;
		icon?: ComponentType;
	}
</script>

<script lang="ts">
	import { cn } from '$lib/utils';
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		options: [ToggleOption, ToggleOption];
		activeHref: string;
		class?: string;
	}

	let { options, activeHref, class: className, ...restProps }: Props = $props();
</script>

<div
	data-slot="view-toggle"
	class={cn('inline-flex rounded-lg bg-muted p-1', className)}
	role="tablist"
	{...restProps}
>
	{#each options as option}
		{@const isActive = activeHref.startsWith(option.href)}
		<a
			href={option.href}
			role="tab"
			aria-selected={isActive}
			class={cn(
				'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all',
				isActive
					? 'bg-background text-foreground shadow-sm'
					: 'text-muted-foreground hover:text-foreground'
			)}
		>
			{#if option.icon}
				{@const Icon = option.icon}
				<Icon class="h-4 w-4" />
			{/if}
			{option.label}
		</a>
	{/each}
</div>
