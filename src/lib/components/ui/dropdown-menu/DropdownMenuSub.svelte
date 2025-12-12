<script lang="ts">
	import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui';

	type Props = DropdownMenuPrimitive.SubProps;

	let { children, ...restProps }: Props = $props();
</script>

<DropdownMenuPrimitive.Sub {...restProps}>
	{@render children?.()}
</DropdownMenuPrimitive.Sub>
