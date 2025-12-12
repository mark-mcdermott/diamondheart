<script lang="ts">
	import { Dialog as DialogPrimitive } from 'bits-ui';

	type Props = DialogPrimitive.CloseProps;

	let { children, ...restProps }: Props = $props();
</script>

<DialogPrimitive.Close data-slot="sheet-close" {...restProps}>
	{@render children?.()}
</DialogPrimitive.Close>
