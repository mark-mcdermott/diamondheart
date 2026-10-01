import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, keys } from "@/app/api";
import { healthSupported, healthSyncDue, syncHealth } from "@/lib/health";

/**
 * Keeps Apple Health flowing without anyone pressing Sync: once the account
 * has connected it, the iPhone build syncs on launch and whenever it comes
 * back to the foreground, at most hourly. Nobody asked for these syncs, so a
 * failure is logged rather than shown; the Integrations page still says when
 * the last one succeeded.
 */
export function useHealthAutoSync(signedIn: boolean) {
  const queryClient = useQueryClient();
  const integrations = useQuery({ queryKey: keys.integrations, queryFn: api.integrations.list, enabled: signedIn && healthSupported() });
  const connection = integrations.data?.connections.find((each) => each.service === "healthkit" && each.status === "active");
  const connected = connection !== undefined;
  const lastSyncAt = connection?.lastSyncAt ?? null;
  const syncing = useRef(false);

  useEffect(() => {
    if (!connected || syncing.current || !healthSyncDue(lastSyncAt)) return;
    syncing.current = true;
    syncHealth()
      .then(() => queryClient.invalidateQueries({ queryKey: keys.integrations }))
      .catch((cause: unknown) => console.error("Apple Health sync failed:", cause))
      .finally(() => {
        syncing.current = false;
      });
    // `dataUpdatedAt` moves when the app returns to the foreground and the query refetches.
  }, [connected, lastSyncAt, integrations.dataUpdatedAt, queryClient]);
}
