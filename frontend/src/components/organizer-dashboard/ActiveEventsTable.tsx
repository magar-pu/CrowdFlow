/**
 * components/organizer-dashboard/ActiveEventsTable.tsx
 *
 * "Active Events" table: search + filter header, status-aware rows (status
 * badge color/dot + which action icons show depend on OrganizerEventStatus),
 * sales-progress bar, and a "Showing N of M" footer. Matches
 * organizer_dashboard_overview_white_theme Stitch markup exactly — including
 * the draft row's reduced opacity and its "Edit Draft" + "Publish" actions
 * replacing the normal bar_chart/edit/more_vert action set.
 */

"use client";

import { useState } from "react";
import {
  Search,
  Filter,
  BarChart3,
  Pencil,
  MoreVertical,
  ArrowRight,
} from "lucide-react";
import type { OrganizerEvent, OrganizerEventStatus } from "@/types/ticket";

interface ActiveEventsTableProps {
  events: OrganizerEvent[];
  total_active_count: number;
  on_view_all: () => void;
  on_edit: (event_id: string) => void;
  on_publish: (event_id: string) => void;
  on_view_analytics: (event_id: string) => void;
}

const STATUS_CONFIG: Record<
  OrganizerEventStatus,
  { label: string; badge_class: string; dot_class: string }
> = {
  on_sale: {
    label: "On Sale",
    badge_class: "bg-success/10 text-success",
    dot_class: "bg-success",
  },
  almost_full: {
    label: "Almost Full",
    badge_class: "bg-warning/10 text-warning",
    dot_class: "bg-warning",
  },
  draft: {
    label: "Draft",
    badge_class: "bg-surface-container text-text-secondary",
    dot_class: "bg-text-secondary",
  },
  sold_out: {
    label: "Sold Out",
    badge_class: "bg-danger/10 text-danger",
    dot_class: "bg-danger",
  },
  ended: {
    label: "Ended",
    badge_class: "bg-surface-container text-text-secondary",
    dot_class: "bg-outline",
  },
};

export function ActiveEventsTable({
  events,
  total_active_count,
  on_view_all,
  on_edit,
  on_publish,
  on_view_analytics,
}: ActiveEventsTableProps) {
  const [search_query, set_search_query] = useState("");

  const filtered_events = events.filter((event) =>
    event.title.toLowerCase().includes(search_query.toLowerCase())
  );

  return (
    <div className="overflow-hidden rounded-xl border border-border-subtle bg-surface-white shadow-sm">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 border-b border-border-subtle p-6 sm:flex-row sm:items-center">
        <div>
          <h3 className="font-headline-sm text-headline-sm text-text-primary">
            Active Events
          </h3>
          <p className="font-body-sm text-body-sm text-text-secondary">
            Manage and monitor your ongoing events.
          </p>
        </div>
        <div className="flex w-full items-center gap-3 sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search
              size={20}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
            />
            <input
              type="text"
              value={search_query}
              onChange={(e) => set_search_query(e.target.value)}
              placeholder="Search events..."
              className="w-full rounded-lg border border-border-subtle bg-surface-dim py-2 pl-10 pr-4 font-body-sm text-body-sm transition-all focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
            />
          </div>
          <button
            type="button"
            aria-label="Filter events"
            className="flex items-center justify-center rounded-lg border border-border-subtle p-2 text-text-secondary transition-colors hover:bg-surface-container"
          >
            <Filter size={20} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-border-subtle bg-surface-dim font-label-sm text-label-sm uppercase tracking-wider text-text-secondary">
              <th className="px-6 py-4 font-semibold">Event Name</th>
              <th className="px-6 py-4 font-semibold">Date &amp; Venue</th>
              <th className="px-6 py-4 font-semibold">Status</th>
              <th className="px-6 py-4 font-semibold">Sales Progress</th>
              <th className="px-6 py-4 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {filtered_events.map((event) => {
              const status = STATUS_CONFIG[event.status];
              const progress_pct = Math.round(
                (event.tickets_sold / event.tickets_total) * 100
              );
              const is_draft = event.status === "draft";

              return (
                <tr
                  key={event.event_id}
                  className={`group transition-colors hover:bg-surface-container-low ${
                    is_draft ? "opacity-80" : ""
                  }`}
                >
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-4">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={event.cover_image_url}
                        alt={event.title}
                        className={`h-12 w-12 shrink-0 rounded-lg bg-surface-container object-cover ${
                          is_draft ? "grayscale" : ""
                        }`}
                      />
                      <div>
                        <p className="cursor-pointer font-label-md text-label-md text-text-primary transition-colors group-hover:text-secondary">
                          {event.title}
                        </p>
                        <p className="font-body-sm text-body-sm text-text-secondary">
                          ID: {event.display_id}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <p className="font-body-sm text-body-sm text-text-primary">
                      {event.date_range_label}
                    </p>
                    <p className="font-body-sm text-body-sm text-text-secondary">
                      {event.venue_name}
                    </p>
                  </td>
                  <td className="px-6 py-5">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-label-sm text-label-sm font-semibold ${status.badge_class}`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${status.dot_class}`}
                      />
                      {status.label}
                    </span>
                  </td>
                  <td className="min-w-[200px] px-6 py-5">
                    <div className="mb-1.5 flex justify-between font-label-sm text-label-sm">
                      <span className="font-medium text-text-primary">
                        {event.tickets_sold.toLocaleString("en-US")} /{" "}
                        {event.tickets_total.toLocaleString("en-US")}
                      </span>
                      <span className="text-text-secondary">
                        {progress_pct}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-surface-container">
                      <div
                        className={`h-1.5 rounded-full ${
                          is_draft ? "bg-outline-variant" : "bg-secondary"
                        }`}
                        style={{ width: `${progress_pct}%` }}
                      />
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right">
                    {is_draft ? (
                      <div className="flex items-center justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => on_edit(event.event_id)}
                          title="Edit Draft"
                          className="rounded-lg p-2 text-text-secondary transition-colors hover:bg-surface-container hover:text-primary"
                        >
                          <Pencil size={20} />
                        </button>
                        <button
                          type="button"
                          onClick={() => on_publish(event.event_id)}
                          className="font-label-sm text-label-sm font-bold text-secondary transition-colors hover:text-secondary/80"
                        >
                          Publish
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => on_view_analytics(event.event_id)}
                          title="View Analytics"
                          className="rounded-lg p-2 text-text-secondary transition-colors hover:bg-secondary/5 hover:text-secondary"
                        >
                          <BarChart3 size={20} />
                        </button>
                        <button
                          type="button"
                          onClick={() => on_edit(event.event_id)}
                          title="Edit Event"
                          className="rounded-lg p-2 text-text-secondary transition-colors hover:bg-surface-container hover:text-primary"
                        >
                          <Pencil size={20} />
                        </button>
                        <button
                          type="button"
                          title="More Options"
                          className="rounded-lg p-2 text-text-secondary transition-colors hover:bg-surface-container hover:text-primary"
                        >
                          <MoreVertical size={20} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-border-subtle bg-surface-dim/50 p-5">
        <p className="font-body-sm text-body-sm text-text-secondary">
          Showing {filtered_events.length} of {total_active_count} active
          events
        </p>
        <button
          type="button"
          onClick={on_view_all}
          className="flex items-center gap-1 font-label-sm text-label-sm font-bold text-text-primary transition-colors hover:text-secondary"
        >
          View All <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}