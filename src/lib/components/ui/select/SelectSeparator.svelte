<script lang="ts">
	import { cn } from '$lib/utils';
	import { Separator } from 'bits-ui';

	type Props = Separator.RootProps;

	let { class: className, ...restProps }: Props = $props();
</script>

<Separator.Root
	data-slot="select-separator"
	class={cn('bg-border pointer-events-none -mx-1 my-1 h-px', className)}
	{...restProps}
/>
