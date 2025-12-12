<script lang="ts">
	import { cn } from '$lib/utils';
	import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui';

	type Props = DropdownMenuPrimitive.SubContentProps;

	let { class: className, children, ...restProps }: Props = $props();
</script>

<DropdownMenuPrimitive.SubContent
	data-slot="dropdown-menu-sub-content"
	class={cn(
		'bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 min-w-[8rem] origin-[var(--bits-dropdown-menu-content-transform-origin)] overflow-hidden rounded-md border p-1 shadow-lg',
		className
	)}
	{...restProps}
>
	{@render children?.()}
</DropdownMenuPrimitive.SubContent>
