import { NATIVE } from "@/app/platform";
import { Toaster } from "@/components/ui/sonner";
import { NativeInit } from "@/components/native-init";
import { ServiceWorkerRegister } from "@/components/blocks/sw-register";
import { PWADetector } from "@/components/blocks/pwa-detector";
import { PWAInstallPrompt } from "@/components/blocks/pwa-install-prompt";

/** What every document mounts once: toasts, the service worker, PWA and native bootstraps. */
export function RootIslands() {
  return (
    <>
      <Toaster position="top-center" richColors />
      <NativeInit />
      {!NATIVE && (
        <>
          <ServiceWorkerRegister />
          <PWADetector />
          <PWAInstallPrompt />
        </>
      )}
    </>
  );
}
