<script lang="ts">
	import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui';

	type Props = DropdownMenuPrimitive.GroupProps;

	let { children, ...restProps }: Props = $props();
</script>

<DropdownMenuPrimitive.Group data-slot="dropdown-menu-group" {...restProps}>
	{@render children?.()}
</DropdownMenuPrimitive.Group>
