"use client";

import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";

export function NativeHide({ children }: { children: React.ReactNode }) {
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    setIsNative(Capacitor.isNativePlatform());
  }, []);

  if (isNative) return null;
  return <>{children}</>;
}
