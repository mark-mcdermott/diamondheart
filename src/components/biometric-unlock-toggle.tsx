import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Fingerprint } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  authenticateWithBiometrics,
  isBiometricAvailable,
} from "@/lib/biometrics";
import {
  isBiometricLockEnabled,
  setBiometricLockEnabled,
} from "@/lib/biometric-lock";

export function BiometricUnlockToggle() {
  const [available, setAvailable] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    isBiometricAvailable().then(setAvailable);
    setEnabled(isBiometricLockEnabled());
  }, []);

  if (!available) return null;

  async function onToggle(next: boolean) {
    setPending(true);
    try {
      if (next) {
        const ok = await authenticateWithBiometrics();
        if (!ok) return;
        setBiometricLockEnabled(true);
        setEnabled(true);
      } else {
        setBiometricLockEnabled(false);
        setEnabled(false);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Fingerprint className="h-5 w-5" />
          Biometric unlock
        </CardTitle>
        <CardDescription>
          Require Face ID, Touch ID, or device PIN to open the app
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <Label htmlFor="biometric-lock" className="text-sm">
            Enable
          </Label>
          <Switch
            id="biometric-lock"
            checked={enabled}
            disabled={pending}
            onCheckedChange={onToggle}
          />
        </div>
      </CardContent>
    </Card>
  );
}
