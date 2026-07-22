import type { Metadata } from "next";
import { AuthGuard } from "@/components/auth/AuthGuard";

export const metadata: Metadata = {
  title: "CrowdFlow Venue Designer",
  description: "Full-screen venue geometry designer for organizers and venue admins.",
};

/**
 * Route group for the full-screen venue geometry designer (VenueMaster Pro).
 * Deliberately does NOT use OrganizerShell — the designer is a full-viewport
 * takeover with its own EditorSidebar. AuthGuard verifies the session against
 * the server (see AuthGuard) and redirects unauthenticated users to /login;
 * the edge middleware also guards this path so anonymous requests never render.
 */
export default function VenueDesignerLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <AuthGuard requiredRole="verified_organizer">{children}</AuthGuard>
  );
}
