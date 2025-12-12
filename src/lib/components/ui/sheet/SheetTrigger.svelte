<script lang="ts">
	import { Dialog as DialogPrimitive } from 'bits-ui';

	type Props = DialogPrimitive.TriggerProps;

	let { children, ...restProps }: Props = $props();
</script>

<DialogPrimitive.Trigger data-slot="sheet-trigger" {...restProps}>
	{@render children?.()}
</DialogPrimitive.Trigger>
