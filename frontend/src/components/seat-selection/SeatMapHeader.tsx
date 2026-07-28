/**
 * components/seat-selection/SeatMapHeader.tsx
 * Sesuai Stitch: event title di tengah, timer box, Seat Guide + Need Help + X
 */

"use client";

import { Calendar, LayoutGrid, HelpCircle, X } from "lucide-react";
import { HoldTimer } from "@/components/booking/HoldTimer";

interface SeatMapHeaderProps {
  event_title: string;
  event_date: string;
  event_time: string;
  event_venue: string;
  /**
   * Seconds until the current hold lapses. Null hides the timer entirely.
   * Counted by the page from the hold's own deadline, not by this header:
   * checkout shows the same clock and the two must not disagree.
   */
  hold_seconds_left?: number | null;
  hold_expired?: boolean;
  on_close: () => void;
  on_seat_guide?: () => void;
}

export function SeatMapHeader({
  event_title,
  event_date,
  event_time,
  event_venue,
  hold_seconds_left = null,
  hold_expired = false,
  on_close,
  on_seat_guide,
}: SeatMapHeaderProps) {
  return (
    <header className="flex w-full shrink-0 items-center justify-between border-b border-border-subtle bg-white px-6 py-3 shadow-sm">
      {/* Left — Logo */}
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <LayoutGrid size={16} className="text-white" />
        </div>
        <span className="font-headline-md text-headline-md font-bold tracking-tight text-primary">
          CrowdFlow
        </span>
      </div>

      {/* Center — Event info */}
      <div className="hidden flex-col items-center md:flex">
        <h1 className="font-label-md text-label-md font-bold text-text-primary">
          {event_title}
        </h1>
        <div className="flex items-center gap-1.5 font-body-sm text-body-sm text-text-secondary">
          <Calendar size={12} />
          <span>{event_date} • {event_time} • {event_venue}</span>
        </div>
      </div>

      {/* Right — Timer + actions */}
      <div className="flex items-center gap-3">
        {/* Only once something is actually held against a deadline. It used to
            count down from a hardcoded 585s on every page load, implying a
            reservation the buyer did not have. */}
        {hold_seconds_left != null && (
          <HoldTimer
            seconds_left={hold_seconds_left}
            is_expired={hold_expired}
            label="Seats held"
          />
        )}

        <button
          type="button"
          onClick={on_seat_guide}
          className="hidden items-center gap-1.5 rounded-lg border border-border-subtle px-3 py-2 font-label-sm text-label-sm text-text-secondary transition-colors hover:bg-surface-container-low md:flex"
        >
          <LayoutGrid size={16} />
          Seat Guide
        </button>

        <button
          type="button"
          className="hidden items-center gap-1.5 rounded-lg border border-border-subtle px-3 py-2 font-label-sm text-label-sm text-text-secondary transition-colors hover:bg-surface-container-low md:flex"
        >
          <HelpCircle size={16} />
          Need Help?
        </button>

        <button
          type="button"
          onClick={on_close}
          aria-label="Close"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border-subtle text-text-secondary transition-colors hover:bg-surface-container-low"
        >
          <X size={18} />
        </button>
      </div>
    </header>
  );
}