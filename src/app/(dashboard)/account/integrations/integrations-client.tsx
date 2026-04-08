"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ArrowLeft, RefreshCw, Unplug, ExternalLink, Heart, Watch } from "lucide-react";

interface Connection {
  id: string;
  service: string;
  status: string;
  lastSyncAt: string | null;
  lastSyncError: string | null;
}

interface IntegrationsClientProps {
  connections: Connection[];
  ouraConfigured: boolean;
}

function formatLastSync(date: string | null) {
  if (!date) return "Never";
  const d = new Date(date);
  const diffHr = Math.floor((Date.now() - d.getTime()) / 3600000);
  if (diffHr < 1) return "Just now";
  if (diffHr < 24) return `${diffHr}h ago`;
  return d.toLocaleDateString();
}

export function IntegrationsClient({ connections, ouraConfigured }: IntegrationsClientProps) {
  const router = useRouter();
  const [syncing, setSyncing] = useState<string | null>(null);

  const oura = connections.find((c) => c.service === "oura");
  const healthkit = connections.find((c) => c.service === "healthkit");

  async function syncOura() {
    setSyncing("oura");
    try {
      const res = await fetch("/api/integrations/oura/sync", { method: "POST" });
      if (res.ok) router.refresh();
    } catch { /* silent */ }
    setSyncing(null);
  }

  async function disconnectOura() {
    await fetch("/api/integrations/oura/disconnect", { method: "POST" });
    router.refresh();
  }

  async function connectHealthKit() {
    await fetch("/api/integrations/healthkit/connect", { method: "POST" });
    router.refresh();
  }

  async function syncHealthKit() {
    setSyncing("healthkit");
    try {
      const today = new Date().toISOString().split("T")[0];
      await fetch("/api/integrations/healthkit/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: today }),
      });
      router.refresh();
    } catch { /* silent */ }
    setSyncing(null);
  }

  async function disconnectHealthKit() {
    await fetch("/api/integrations/healthkit/disconnect", { method: "POST" });
    router.refresh();
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Link href="/account" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Account
      </Link>

      <h2 className="mb-2">Integrations</h2>
      <p className="text-muted-foreground mb-8">Connect health devices to automatically sync biometric data.</p>

      <div className="space-y-4">
        {/* Oura Ring */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <Heart className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle>Oura Ring</CardTitle>
                  <CardDescription>Sleep, readiness, activity, heart rate, HRV, SpO2, stress</CardDescription>
                </div>
              </div>
              {oura?.status === "active" && (
                <span className="text-xs font-medium text-green-600 bg-green-50 dark:bg-green-950 dark:text-green-400 px-2 py-1 rounded-full">Connected</span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {oura?.status === "active" ? (
              <>
                <p className="text-sm text-muted-foreground mb-4">
                  Last sync: {formatLastSync(oura.lastSyncAt)}
                  {oura.lastSyncError && <span className="text-destructive ml-2">Error: {oura.lastSyncError}</span>}
                </p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={syncOura} disabled={syncing === "oura"}>
                    <RefreshCw className={`w-4 h-4 mr-1 ${syncing === "oura" ? "animate-spin" : ""}`} />
                    {syncing === "oura" ? "Syncing..." : "Sync Now"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={disconnectOura}>
                    <Unplug className="w-4 h-4 mr-1" /> Disconnect
                  </Button>
                </div>
              </>
            ) : ouraConfigured ? (
              <Button onClick={() => { window.location.href = "/api/integrations/oura/authorize"; }}>
                <ExternalLink className="w-4 h-4 mr-2" /> Connect Oura Ring
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">Not configured. Set OURA_CLIENT_ID and OURA_CLIENT_SECRET.</p>
            )}
          </CardContent>
        </Card>

        {/* Apple Health */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <Watch className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle>Apple Health</CardTitle>
                  <CardDescription>Steps, heart rate, HRV, sleep, calories, SpO2</CardDescription>
                </div>
              </div>
              {healthkit?.status === "active" && (
                <span className="text-xs font-medium text-green-600 bg-green-50 dark:bg-green-950 dark:text-green-400 px-2 py-1 rounded-full">Connected</span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {healthkit?.status === "active" ? (
              <>
                <p className="text-sm text-muted-foreground mb-4">Last sync: {formatLastSync(healthkit.lastSyncAt)}</p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={syncHealthKit} disabled={syncing === "healthkit"}>
                    <RefreshCw className={`w-4 h-4 mr-1 ${syncing === "healthkit" ? "animate-spin" : ""}`} />
                    {syncing === "healthkit" ? "Syncing..." : "Sync Now"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={disconnectHealthKit}>
                    <Unplug className="w-4 h-4 mr-1" /> Disconnect
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-4">Available on iOS only.</p>
                <Button onClick={connectHealthKit}>
                  <Watch className="w-4 h-4 mr-2" /> Connect Apple Health
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
