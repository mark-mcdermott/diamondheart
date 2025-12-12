<script lang="ts">
	import { Select as SelectPrimitive } from 'bits-ui';
	import type { Snippet } from 'svelte';

	interface Props {
		value?: string;
		onValueChange?: (value: string | undefined) => void;
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
		disabled?: boolean;
		required?: boolean;
		name?: string;
		children?: Snippet;
	}

	let {
		value = $bindable(undefined),
		onValueChange,
		open = $bindable(false),
		onOpenChange,
		disabled,
		required,
		name,
		children
	}: Props = $props();
</script>

<SelectPrimitive.Root
	type="single"
	bind:value
	{onValueChange}
	bind:open
	{onOpenChange}
	{disabled}
	{required}
	{name}
>
	{@render children?.()}
</SelectPrimitive.Root>
