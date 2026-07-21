import React from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CF Ticket Scanner Client",
  description: "Standalone CrowdFlow ticket gate scanner",
};

export default function ScannerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col antialiased">
      {children}
    </div>
  );
}
