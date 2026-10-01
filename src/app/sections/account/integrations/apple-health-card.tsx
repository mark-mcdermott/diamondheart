import { RefreshCw, Unplug, Watch } from "lucide-react";
import { toast } from "sonner";
import { api, keys, type IntegrationConnectionView } from "@/app/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { healthSupported, requestHealthAccess, syncHealth } from "@/lib/health";
import { formatLastSync } from "./last-sync";

/** A sync writes tracker entries, so everything read from the metrics is stale after one. */
const TOUCHED_BY_SYNC = [keys.integrations, ["metrics"]] as const;

const reportSync = (entries: number) =>
  toast.success(entries > 0 ? `Synced ${entries} ${entries === 1 ? "reading" : "readings"} from Apple Health` : "Apple Health had nothing new");

export function AppleHealthCard({ connection }: { connection?: IntegrationConnectionView }) {
  const onPhone = healthSupported();
  const connected = connection?.status === "active";

  const connect = useApiMutation({
    /** Null when this device has no Health to connect to. */
    mutationFn: async () => {
      if (!(await requestHealthAccess())) return null;
      await api.integrations.healthkit.connect();
      return syncHealth();
    },
    invalidates: TOUCHED_BY_SYNC,
    onSuccess: (entries) => {
      if (entries === null) toast.error("Apple Health is not available on this device.");
      else reportSync(entries);
    },
  });
  const sync = useApiMutation({ mutationFn: () => syncHealth(), invalidates: TOUCHED_BY_SYNC, onSuccess: reportSync });
  const disconnect = useApiMutation({ mutationFn: api.integrations.healthkit.disconnect, invalidates: [keys.integrations] });

  return (
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
          {connected && <span className="text-xs font-medium text-success bg-success/10 px-2 py-1 rounded-full">Connected</span>}
        </div>
      </CardHeader>
      <CardContent>
        {connected ? (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              Last sync: {formatLastSync(connection.lastSyncAt)}
              {!onPhone && " · Syncs from the iPhone app"}
            </p>
            <div className="flex gap-2">
              {onPhone && (
                <Button size="sm" onClick={() => sync.mutate()} disabled={sync.isPending}>
                  <RefreshCw className={`w-4 h-4 mr-1 ${sync.isPending ? "animate-spin" : ""}`} />
                  {sync.isPending ? "Syncing..." : "Sync Now"}
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => disconnect.mutate()} disabled={disconnect.isPending}>
                <Unplug className="w-4 h-4 mr-1" /> Disconnect
              </Button>
            </div>
          </>
        ) : onPhone ? (
          <Button onClick={() => connect.mutate()} disabled={connect.isPending}>
            <Watch className="w-4 h-4 mr-2" /> {connect.isPending ? "Connecting..." : "Connect Apple Health"}
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">Connect it from the Diamondheart iPhone app, where Apple Health lives.</p>
        )}
      </CardContent>
    </Card>
  );
}
