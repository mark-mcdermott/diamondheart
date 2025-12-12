<script lang="ts">
	import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui';

	type Props = DropdownMenuPrimitive.TriggerProps;

	let { children, ...restProps }: Props = $props();
</script>

<DropdownMenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...restProps}>
	{@render children?.()}
</DropdownMenuPrimitive.Trigger>
