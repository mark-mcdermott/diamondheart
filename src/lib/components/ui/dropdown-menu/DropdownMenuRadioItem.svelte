<script lang="ts">
	import { cn } from '$lib/utils';
	import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui';
	import { Circle } from 'lucide-svelte';
	import type { Snippet } from 'svelte';

	type Props = Omit<DropdownMenuPrimitive.RadioItemProps, 'children'> & {
		children?: Snippet;
	};

	let { class: className, children: userChildren, ...restProps }: Props = $props();
</script>

<DropdownMenuPrimitive.RadioItem
	data-slot="dropdown-menu-radio-item"
	class={cn(
		"focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
		className
	)}
	{...restProps}
>
	{#snippet children({ checked })}
		<span class="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
			{#if checked}
				<Circle class="size-2 fill-current" />
			{/if}
		</span>
		{@render userChildren?.()}
	{/snippet}
</DropdownMenuPrimitive.RadioItem>
