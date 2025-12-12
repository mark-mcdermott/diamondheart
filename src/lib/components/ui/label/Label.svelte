<script lang="ts">
	import { cn } from '$lib/utils';
	import { Label as LabelPrimitive } from 'bits-ui';

	type Props = LabelPrimitive.RootProps;

	let { class: className, children, ...restProps }: Props = $props();
</script>

<LabelPrimitive.Root
	data-slot="label"
	class={cn(
		'flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
		className
	)}
	{...restProps}
>
	{@render children?.()}
</LabelPrimitive.Root>
