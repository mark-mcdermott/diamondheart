<script lang="ts">
	import { cn } from '$lib/utils';
	import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui';

	type Props = DropdownMenuPrimitive.GroupHeadingProps & {
		inset?: boolean;
	};

	let { class: className, inset = false, children, ...restProps }: Props = $props();
</script>

<DropdownMenuPrimitive.GroupHeading
	data-slot="dropdown-menu-label"
	data-inset={inset}
	class={cn('px-2 py-1.5 text-sm font-medium data-[inset]:pl-8', className)}
	{...restProps}
>
	{@render children?.()}
</DropdownMenuPrimitive.GroupHeading>
