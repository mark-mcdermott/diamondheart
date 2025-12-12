<script lang="ts">
	import { cn } from '$lib/utils';
	import { Select as SelectPrimitive } from 'bits-ui';
	import { ChevronUp } from 'lucide-svelte';

	type Props = SelectPrimitive.ScrollUpButtonProps;

	let { class: className, ...restProps }: Props = $props();
</script>

<SelectPrimitive.ScrollUpButton
	data-slot="select-scroll-up-button"
	class={cn('flex cursor-default items-center justify-center py-1', className)}
	{...restProps}
>
	<ChevronUp class="size-4" />
</SelectPrimitive.ScrollUpButton>
