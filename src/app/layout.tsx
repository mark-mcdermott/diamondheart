import type { Metadata } from "next";
import { ThemeProvider } from "./theme-provider";
import { ServiceWorkerRegister } from "@/components/blocks/sw-register";
import { PWADetector } from "@/components/blocks/pwa-detector";
import { PWAInstallPrompt } from "@/components/blocks/pwa-install-prompt";
import "./globals.css";

export const metadata: Metadata = {
  title: "Diamondheart",
  description: "Mindful tracking for meditation, wellness, and daily habits",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.png",
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Diamondheart",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <meta name="theme-color" content="#a57cf4" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <ServiceWorkerRegister />
          <PWADetector />
          <PWAInstallPrompt />
        </ThemeProvider>
      </body>
    </html>
  );
}
