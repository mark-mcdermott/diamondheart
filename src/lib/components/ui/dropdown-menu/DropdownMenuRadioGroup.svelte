<script lang="ts">
	import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui';

	type Props = DropdownMenuPrimitive.RadioGroupProps;

	let { value = $bindable(''), children, ...restProps }: Props = $props();
</script>

<DropdownMenuPrimitive.RadioGroup bind:value data-slot="dropdown-menu-radio-group" {...restProps}>
	{@render children?.()}
</DropdownMenuPrimitive.RadioGroup>
