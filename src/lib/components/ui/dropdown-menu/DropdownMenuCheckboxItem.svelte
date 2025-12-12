<script lang="ts">
	import { cn } from '$lib/utils';
	import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui';
	import { Check } from 'lucide-svelte';
	import type { Snippet } from 'svelte';

	type Props = DropdownMenuPrimitive.CheckboxItemProps & {
		children?: Snippet;
	};

	let { checked = $bindable(false), class: className, children, ...restProps }: Props = $props();
</script>

<DropdownMenuPrimitive.CheckboxItem
	bind:checked
	data-slot="dropdown-menu-checkbox-item"
	class={cn(
		"focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
		className
	)}
	{...restProps}
>
	<span class="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
		{#if checked}
			<Check class="size-4" />
		{/if}
	</span>
	{@render children?.()}
</DropdownMenuPrimitive.CheckboxItem>
