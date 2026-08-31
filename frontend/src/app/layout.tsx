
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import type { Metadata } from "next";
import { SessionProvider } from "@/components/auth/SessionProvider";

export const metadata: Metadata = {
  title: "CrowdFlow - Next-Generation Event Ticketing Ecosystem",
  description: "Secure, transparent, and high-concurrency event ticketing, venue seat management, and dynamic QR check-ins.",
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">
        {/*
          Runtime config (see src/lib/runtimeEnv.ts) — must load and run
          before any other page JS, including module-scope reads in the
          checkout page and Turnstile.tsx, both of which need their key
          before their own third-party script loads. strategy="beforeInteractive"
          is Next's own guarantee of that ordering; a plain <script> tag or a
          fetch-on-mount would not have it. The file itself is written fresh
          by docker-entrypoint.sh from the container's actual environment on
          every start.
        */}
        <Script src="/env-config.js" strategy="beforeInteractive" />
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
