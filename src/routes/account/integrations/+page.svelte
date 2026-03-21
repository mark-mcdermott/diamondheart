<script lang="ts">
	import { Card, Button } from '$lib/components/ui';
	import { ArrowLeft, RefreshCw, Unplug, ExternalLink, Heart, Watch } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import { invalidateAll } from '$app/navigation';

	let { data } = $props();

	type Connection = (typeof data.connections)[number];

	const ouraConnection = $derived(data.connections.find((c: Connection) => c.service === 'oura'));
	const healthkitConnection = $derived(data.connections.find((c: Connection) => c.service === 'healthkit'));

	let syncing = $state<string | null>(null);

	function isOuraConnected() {
		return ouraConnection?.status === 'active';
	}

	function isHealthKitConnected() {
		return healthkitConnection?.status === 'active';
	}

	function formatLastSync(date: string | Date | null) {
		if (!date) return 'Never';
		const d = new Date(date);
		const now = new Date();
		const diffMs = now.getTime() - d.getTime();
		const diffHr = Math.floor(diffMs / 3600000);
		if (diffHr < 1) return 'Just now';
		if (diffHr < 24) return `${diffHr}h ago`;
		return d.toLocaleDateString();
	}

	async function syncOura() {
		syncing = 'oura';
		try {
			const res = await fetch('/api/integrations/oura/sync', { method: 'POST' });
			const result = await res.json();
			if (res.ok) {
				toast.success(`Synced ${result.entriesCreated} entries from Oura`);
				await invalidateAll();
			} else {
				toast.error(result.message || 'Sync failed');
			}
		} catch {
			toast.error('Failed to sync Oura data');
		} finally {
			syncing = null;
		}
	}

	async function disconnectOura() {
		try {
			const res = await fetch('/api/integrations/oura/disconnect', { method: 'POST' });
			if (res.ok) {
				toast.success('Oura Ring disconnected');
				await invalidateAll();
			} else {
				toast.error('Failed to disconnect');
			}
		} catch {
			toast.error('Failed to disconnect');
		}
	}

	async function connectHealthKit() {
		// Import dynamically to avoid SSR issues
		const { isHealthKitAvailable, requestHealthKitPermissions } = await import('$lib/healthkit');

		if (!isHealthKitAvailable()) {
			toast.error('HealthKit is only available on iOS');
			return;
		}

		const granted = await requestHealthKitPermissions();
		if (!granted) {
			toast.error('HealthKit permission denied');
			return;
		}

		try {
			const res = await fetch('/api/integrations/healthkit/connect', { method: 'POST' });
			if (res.ok) {
				toast.success('Apple Health connected');
				await invalidateAll();
			} else {
				toast.error('Failed to save connection');
			}
		} catch {
			toast.error('Failed to connect');
		}
	}

	async function syncHealthKit() {
		syncing = 'healthkit';
		try {
			const { queryHealthKitData } = await import('$lib/healthkit');
			const today = new Date().toISOString().split('T')[0];
			const payload = await queryHealthKitData(today, today);

			const res = await fetch('/api/integrations/healthkit/sync', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});

			const result = await res.json();
			if (res.ok) {
				if (result.skipped) {
					toast.info('Already synced today');
				} else {
					toast.success(`Synced ${result.entriesCreated} entries from Apple Health`);
				}
				await invalidateAll();
			} else {
				toast.error(result.message || 'Sync failed');
			}
		} catch {
			toast.error('Failed to sync HealthKit data');
		} finally {
			syncing = null;
		}
	}

	async function disconnectHealthKit() {
		try {
			const res = await fetch('/api/integrations/healthkit/disconnect', { method: 'POST' });
			if (res.ok) {
				toast.success('Apple Health disconnected');
				await invalidateAll();
			} else {
				toast.error('Failed to disconnect');
			}
		} catch {
			toast.error('Failed to disconnect');
		}
	}
</script>

<svelte:head>
	<title>Integrations</title>
</svelte:head>

<div class="max-w-2xl mx-auto px-6 py-10">
	<a
		href="/account"
		class="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
	>
		<ArrowLeft class="w-4 h-4" />
		Back to Account
	</a>

	<h1 class="text-2xl font-semibold tracking-tight mb-2">Integrations</h1>
	<p class="text-muted-foreground mb-8">Connect health devices to automatically sync biometric data.</p>

	<div class="space-y-4">
		<!-- Oura Ring -->
		<Card.Root>
			<Card.Header>
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-3">
						<div class="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
							<Heart class="w-5 h-5 text-muted-foreground" />
						</div>
						<div>
							<Card.Title>Oura Ring</Card.Title>
							<Card.Description>
								Sleep, readiness, activity, heart rate, HRV, SpO2, stress
							</Card.Description>
						</div>
					</div>
					{#if isOuraConnected()}
						<span class="text-xs font-medium text-green-600 bg-green-50 dark:bg-green-950 dark:text-green-400 px-2 py-1 rounded-full">Connected</span>
					{/if}
				</div>
			</Card.Header>
			<Card.Content>
				{#if isOuraConnected()}
					<p class="text-sm text-muted-foreground mb-4">
						Last sync: {formatLastSync(ouraConnection?.lastSyncAt ?? null)}
						{#if ouraConnection?.lastSyncError}
							<span class="text-destructive ml-2">Error: {ouraConnection.lastSyncError}</span>
						{/if}
					</p>
					<div class="flex gap-2">
						<Button.Root size="sm" onclick={syncOura} disabled={syncing === 'oura'} class="cursor-pointer">
							<RefreshCw class="w-4 h-4 mr-1 {syncing === 'oura' ? 'animate-spin' : ''}" />
							{syncing === 'oura' ? 'Syncing...' : 'Sync Now'}
						</Button.Root>
						<Button.Root size="sm" variant="outline" onclick={disconnectOura} class="cursor-pointer">
							<Unplug class="w-4 h-4 mr-1" />
							Disconnect
						</Button.Root>
					</div>
				{:else if data.ouraConfigured}
					<Button.Root onclick={() => { window.location.href = '/api/integrations/oura/authorize'; }} class="cursor-pointer">
						<ExternalLink class="w-4 h-4 mr-2" />
						Connect Oura Ring
					</Button.Root>
				{:else}
					<p class="text-sm text-muted-foreground">
						Not configured. Set <code class="px-1 py-0.5 bg-muted rounded text-xs">OURA_CLIENT_ID</code> and <code class="px-1 py-0.5 bg-muted rounded text-xs">OURA_CLIENT_SECRET</code> environment variables.
					</p>
				{/if}
			</Card.Content>
		</Card.Root>

		<!-- Apple Health -->
		<Card.Root>
			<Card.Header>
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-3">
						<div class="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
							<Watch class="w-5 h-5 text-muted-foreground" />
						</div>
						<div>
							<Card.Title>Apple Health</Card.Title>
							<Card.Description>
								Steps, heart rate, HRV, sleep, calories, SpO2
							</Card.Description>
						</div>
					</div>
					{#if isHealthKitConnected()}
						<span class="text-xs font-medium text-green-600 bg-green-50 dark:bg-green-950 dark:text-green-400 px-2 py-1 rounded-full">Connected</span>
					{/if}
				</div>
			</Card.Header>
			<Card.Content>
				{#if isHealthKitConnected()}
					<p class="text-sm text-muted-foreground mb-4">
						Last sync: {formatLastSync(healthkitConnection?.lastSyncAt ?? null)}
					</p>
					<div class="flex gap-2">
						<Button.Root size="sm" onclick={syncHealthKit} disabled={syncing === 'healthkit'} class="cursor-pointer">
							<RefreshCw class="w-4 h-4 mr-1 {syncing === 'healthkit' ? 'animate-spin' : ''}" />
							{syncing === 'healthkit' ? 'Syncing...' : 'Sync Now'}
						</Button.Root>
						<Button.Root size="sm" variant="outline" onclick={disconnectHealthKit} class="cursor-pointer">
							<Unplug class="w-4 h-4 mr-1" />
							Disconnect
						</Button.Root>
					</div>
				{:else}
					<p class="text-sm text-muted-foreground mb-4">
						Available on iOS only. Connect to sync health data from your Apple Watch.
					</p>
					<Button.Root onclick={connectHealthKit} class="cursor-pointer">
						<Watch class="w-4 h-4 mr-2" />
						Connect Apple Health
					</Button.Root>
				{/if}
			</Card.Content>
		</Card.Root>
	</div>
</div>
