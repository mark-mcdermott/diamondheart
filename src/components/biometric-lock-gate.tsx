import { useCallback, useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Fingerprint } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authenticateWithBiometrics, biometricPromptSettling } from "@/lib/biometrics";
import { isBiometricLockEnabled, setBiometricLockEnabled } from "@/lib/biometric-lock";

type Status = "unlocked" | "locked";

export function BiometricLockGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>("unlocked");
  const [attempting, setAttempting] = useState(false);

  // Turning the lock off is itself a protected action: whoever is holding an
  // unlocked phone at this screen must still pass the check to remove it.
  const turnOff = useCallback(async () => {
    setAttempting(true);
    try {
      const ok = await authenticateWithBiometrics();
      if (!ok) return;
      setBiometricLockEnabled(false);
      setStatus("unlocked");
    } finally {
      setAttempting(false);
    }
  }, []);

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
      // Lock on the way out, so the app switcher's snapshot shows the lock
      // screen, and ask on the way back in. The prompt's own transitions are
      // skipped, or a successful unlock would lock again at once.
      const handle = await App.addListener("appStateChange", ({ isActive }) => {
        if (!isBiometricLockEnabled() || biometricPromptSettling()) return;
        setStatus("locked");
        if (isActive) attemptUnlock();
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
        <Button variant="ghost" onClick={turnOff} disabled={attempting}>
          Turn off
        </Button>
      </div>
    </div>
  );
}
