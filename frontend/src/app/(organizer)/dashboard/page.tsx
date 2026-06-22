"use client";

/**
 * app/(organizer)/dashboard/page.tsx
 *
 * Organizer Dashboard Overview — sidebar (via OrganizerSidebar) + page
 * header, 4-card stats bento grid, and the Active Events table. Matches
 * the organizer_dashboard_overview_white_theme Stitch screen end-to-end.
 *
 * Currently reads from mockDashboardStats + mockOrganizerEvents — swap for
 * `getDashboardStats()` / `listOrganizerEvents()` (lib/api/organizer.ts)
 * once the Go endpoints exist.
 */

import { useRouter } from "next/navigation";
import { OrganizerSidebar } from "@/components/organizer-dashboard/OrganizerSidebar";
import { DashboardPageHeader } from "@/components/organizer-dashboard/DashboardPageHeader";
import { StatCardsGrid } from "@/components/organizer-dashboard/StatCardsGrid";
import { ActiveEventsTable } from "@/components/organizer-dashboard/ActiveEventsTable";
import { mockDashboardStats, mockOrganizerEvents } from "@/mock/organizerData";

const TOTAL_ACTIVE_EVENTS_COUNT = 12; // mirrors the "Showing 3 of 12" footer in the Stitch screen

export default function OrganizerDashboardPage() {
  const router = useRouter();

  return (
    <>
      <OrganizerSidebar active_href="/dashboard" />

      <main className="relative flex-1 overflow-y-auto bg-surface-dim">
        <div className="mx-auto max-w-[1440px] space-y-8 p-gutter md:p-margin-desktop">
          <DashboardPageHeader />
          <StatCardsGrid stats={mockDashboardStats} />
          <ActiveEventsTable
            events={mockOrganizerEvents}
            total_active_count={TOTAL_ACTIVE_EVENTS_COUNT}
            on_view_all={() => router.push("/dashboard/events")}
            on_edit={(event_id) => router.push(`/dashboard/events/${event_id}`)}
            on_publish={(event_id) =>
              console.log("Publish event:", event_id) // TODO: call PATCH /api/v1/organizer/events/{id}/publish once the Go endpoint exists
            }
            on_view_analytics={(event_id) =>
              router.push(`/dashboard/events/${event_id}/analytics`)
            }
          />
          <div className="h-10" />
        </div>
      </main>
    </>
  );
}