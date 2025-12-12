<script lang="ts">
	import { cn } from '$lib/utils';
	import { Dialog as DialogPrimitive } from 'bits-ui';

	type Props = DialogPrimitive.TitleProps;

	let { class: className, children, ...restProps }: Props = $props();
</script>

<DialogPrimitive.Title
	data-slot="sheet-title"
	class={cn('text-foreground font-semibold', className)}
	{...restProps}
>
	{@render children?.()}
</DialogPrimitive.Title>
