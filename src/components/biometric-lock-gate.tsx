"use client";

import { useCallback, useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Fingerprint } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authenticateWithBiometrics } from "@/lib/biometrics";
import { isBiometricLockEnabled, setBiometricLockEnabled } from "@/lib/biometric-lock";

type Status = "unlocked" | "locked";

export function BiometricLockGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>("unlocked");
  const [attempting, setAttempting] = useState(false);

  const attemptUnlock = useCallback(async () => {
    setAttempting(true);
    try {
      const ok = await authenticateWithBiometrics();
      if (ok) setStatus("unlocked");
    } finally {
      setAttempting(false);
    }
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !isBiometricLockEnabled()) return;
    setStatus("locked");
    attemptUnlock();
  }, [attemptUnlock]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let cleanup: (() => void) | undefined;
    (async () => {
      const { App } = await import("@capacitor/app");
      const handle = await App.addListener("appStateChange", ({ isActive }) => {
        if (isActive && isBiometricLockEnabled()) {
          setStatus("locked");
          attemptUnlock();
        }
      });
      cleanup = () => handle.remove();
    })();

    return () => {
      cleanup?.();
    };
  }, [attemptUnlock]);

  if (status === "unlocked") return <>{children}</>;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background gap-6 px-6">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
        <Fingerprint className="h-10 w-10 text-primary" />
      </div>
      <div className="text-center space-y-1">
        <h2 className="text-xl font-semibold">Diamondheart is locked</h2>
        <p className="text-sm text-muted-foreground">
          Unlock with biometrics to continue
        </p>
      </div>
      <div className="flex gap-2">
        <Button onClick={attemptUnlock} disabled={attempting}>
          Unlock
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            setBiometricLockEnabled(false);
            setStatus("unlocked");
          }}
        >
          Turn off
        </Button>
      </div>
    </div>
  );
}
