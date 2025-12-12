<script lang="ts">
	import { Select as SelectPrimitive } from 'bits-ui';

	type Props = SelectPrimitive.GroupProps;

	let { children, ...restProps }: Props = $props();
</script>

<SelectPrimitive.Group data-slot="select-group" {...restProps}>
	{@render children?.()}
</SelectPrimitive.Group>
