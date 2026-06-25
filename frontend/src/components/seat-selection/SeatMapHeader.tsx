/**
 * components/seat-selection/SeatMapHeader.tsx
 * Sesuai Stitch: event title di tengah, timer box, Seat Guide + Need Help + X
 */

"use client";

import { useState, useEffect } from "react";
import { Calendar, LayoutGrid, HelpCircle, X } from "lucide-react";

interface SeatMapHeaderProps {
  event_title: string;
  event_date: string;
  event_time: string;
  event_venue: string;
  initial_seconds?: number;
  on_close: () => void;
  on_seat_guide?: () => void;
}

export function SeatMapHeader({
  event_title,
  event_date,
  event_time,
  event_venue,
  initial_seconds = 585,
  on_close,
  on_seat_guide,
}: SeatMapHeaderProps) {
  const [seconds_left, set_seconds_left] = useState(initial_seconds);

  useEffect(() => {
    const interval = setInterval(() => {
      set_seconds_left((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const mins = String(Math.floor(seconds_left / 60)).padStart(2, "0");
  const secs = String(seconds_left % 60).padStart(2, "0");

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
        {/* Timer box */}
        <div className="flex items-center gap-2 rounded-lg border border-border-subtle px-3 py-2">
          <div className="h-4 w-4 rounded-full border-2 border-secondary flex items-center justify-center">
            <div className="h-1.5 w-1.5 rounded-full bg-secondary" />
          </div>
          <span className="font-headline-sm text-headline-sm font-bold tabular-nums text-text-primary">
            {mins}:{secs}
          </span>
          <span className="hidden font-body-sm text-body-sm text-text-secondary sm:inline">
            Your session will expire in
          </span>
        </div>

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