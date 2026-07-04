import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CrowdFlow Admin Operations Panel",
  description: "Enterprise administration portal for event ticketing, verifications, and compliance desk.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
