<script lang="ts">
	import { cn } from '$lib/utils';
	import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui';

	type Props = DropdownMenuPrimitive.SeparatorProps;

	let { class: className, ...restProps }: Props = $props();
</script>

<DropdownMenuPrimitive.Separator
	data-slot="dropdown-menu-separator"
	class={cn('bg-border -mx-1 my-1 h-px', className)}
	{...restProps}
/>
