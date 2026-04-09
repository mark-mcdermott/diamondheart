import type { Metadata } from "next";
import { ThemeProvider } from "./theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Diamondheart",
  description: "Mindful tracking for meditation, wellness, and daily habits",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
