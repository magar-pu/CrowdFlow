/**
 * components/organizer-dashboard/DashboardPageHeader.tsx
 *
 * Page title + subtitle + "Last 30 Days" date-range dropdown trigger.
 * Matches Stitch markup exactly. The dropdown is presentational only for
 * now — wiring an actual range picker is a follow-up once there's real
 * time-series data to filter.
 */

import { CalendarDays, ChevronDown, Plus } from "lucide-react";

interface DashboardPageHeaderProps {
  date_range_label?: string;
}

export function DashboardPageHeader({
  date_range_label = "Last 30 Days",
}: DashboardPageHeaderProps) {
  return (
    <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
      <div>
        <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-text-primary md:font-headline-lg md:text-headline-lg">
          Dashboard Overview
        </h2>
        <p className="mt-1 font-body-md text-body-md text-text-secondary">
          Welcome back. Here&apos;s what&apos;s happening with your events
          today.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="flex items-center gap-2 rounded-lg border border-border-subtle bg-surface-white px-4 py-2 shadow-sm transition-colors hover:border-secondary"
        >
          <CalendarDays size={20} className="text-text-secondary" />
          <span className="font-label-md text-label-md text-text-primary">
            {date_range_label}
          </span>
          <ChevronDown size={20} className="text-text-secondary" />
        </button>
        <button
          type="button"
          aria-label="Create new event"
          className="flex items-center justify-center rounded-lg bg-secondary p-2 text-on-secondary shadow-sm transition-colors hover:bg-secondary/90 md:hidden"
        >
          <Plus size={20} />
        </button>
      </div>
    </div>
  );
}