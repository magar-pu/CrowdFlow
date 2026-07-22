
import { Geist, Geist_Mono } from "next/font/google";
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
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
