<script lang="ts">
	import { cn } from '$lib/utils';
	import { Select as SelectPrimitive } from 'bits-ui';
	import { ChevronDown } from 'lucide-svelte';

	type Props = SelectPrimitive.ScrollDownButtonProps;

	let { class: className, ...restProps }: Props = $props();
</script>

<SelectPrimitive.ScrollDownButton
	data-slot="select-scroll-down-button"
	class={cn('flex cursor-default items-center justify-center py-1', className)}
	{...restProps}
>
	<ChevronDown class="size-4" />
</SelectPrimitive.ScrollDownButton>
