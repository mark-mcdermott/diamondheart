<script lang="ts">
	import { cn } from '$lib/utils';
	import { Select as SelectPrimitive } from 'bits-ui';

	type Props = SelectPrimitive.GroupHeadingProps;

	let { class: className, children, ...restProps }: Props = $props();
</script>

<SelectPrimitive.GroupHeading
	data-slot="select-label"
	class={cn('text-muted-foreground px-2 py-1.5 text-xs', className)}
	{...restProps}
>
	{@render children?.()}
</SelectPrimitive.GroupHeading>
