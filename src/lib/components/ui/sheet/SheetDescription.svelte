<script lang="ts">
	import { cn } from '$lib/utils';
	import { Dialog as DialogPrimitive } from 'bits-ui';

	type Props = DialogPrimitive.DescriptionProps;

	let { class: className, children, ...restProps }: Props = $props();
</script>

<DialogPrimitive.Description
	data-slot="sheet-description"
	class={cn('text-muted-foreground text-sm', className)}
	{...restProps}
>
	{@render children?.()}
</DialogPrimitive.Description>
