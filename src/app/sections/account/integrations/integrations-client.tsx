import { useState } from "react";
import { Link } from "@/app/link";
import { useRouter } from "@/app/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ArrowLeft, RefreshCw, Unplug, ExternalLink, Heart } from "lucide-react";
import { API_BASE, apiFetch, type IntegrationConnectionView } from "@/app/api";
import { siteUrl } from "@/app/platform";
import { AppleHealthCard } from "./apple-health-card";
import { formatLastSync } from "./last-sync";

interface IntegrationsClientProps {
  connections: IntegrationConnectionView[];
  ouraConfigured: boolean;
}

export function IntegrationsClient({ connections, ouraConfigured }: IntegrationsClientProps) {
  const router = useRouter();
  const [syncing, setSyncing] = useState<string | null>(null);

  const oura = connections.find((c) => c.service === "oura");
  const healthkit = connections.find((c) => c.service === "healthkit");

  async function syncOura() {
    setSyncing("oura");
    try {
      const res = await apiFetch("/api/integrations/oura/sync", { method: "POST" });
      if (res.ok) router.refresh();
    } catch { /* silent */ }
    setSyncing(null);
  }

  async function disconnectOura() {
    await apiFetch("/api/integrations/oura/disconnect", { method: "POST" });
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
                <span className="text-xs font-medium text-success bg-success/10 px-2 py-1 rounded-full">Connected</span>
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
              <Button onClick={() => { window.location.href = siteUrl("/api/integrations/oura/authorize", API_BASE); }}>
                <ExternalLink className="w-4 h-4 mr-2" /> Connect Oura Ring
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">Not configured. Set OURA_CLIENT_ID and OURA_CLIENT_SECRET.</p>
            )}
          </CardContent>
        </Card>

        <AppleHealthCard connection={healthkit} />
      </div>
    </div>
  );
}
