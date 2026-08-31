import React from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CrowdFlow Ticketman",
  description: "CrowdFlow gate staff portal",
};

export default function TicketmanLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full min-h-screen bg-surface text-text-primary flex flex-col antialiased">
      {children}
    </div>
  );
}
