<script lang="ts">
	import { cn } from '$lib/utils';
	import { RadioGroup as RadioGroupPrimitive } from 'bits-ui';

	type Props = RadioGroupPrimitive.RootProps;

	let { value = $bindable(''), class: className, children, ...restProps }: Props = $props();
</script>

<RadioGroupPrimitive.Root
	bind:value
	data-slot="radio-group"
	class={cn('grid gap-3', className)}
	{...restProps}
>
	{@render children?.()}
</RadioGroupPrimitive.Root>
