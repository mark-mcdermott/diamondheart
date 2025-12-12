<script lang="ts">
	import { Dialog as DialogPrimitive } from 'bits-ui';

	type Props = DialogPrimitive.RootProps;

	let { open = $bindable(false), children, ...restProps }: Props = $props();
</script>

<DialogPrimitive.Root bind:open {...restProps}>
	{@render children?.()}
</DialogPrimitive.Root>
