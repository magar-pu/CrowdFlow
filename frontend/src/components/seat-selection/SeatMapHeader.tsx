/**
 * components/seat-selection/SeatMapHeader.tsx
 *
 * Sticky top bar for the seat selection screen: brand, event name/date,
 * countdown timer, help button, close button. Matches seat_selection
 * Stitch markup exactly.
 */

import { Timer, CircleHelp, X } from "lucide-react";

interface SeatMapHeaderProps {
  event_title: string;
  event_subtitle: string; // e.g. "Oct 15, 2024 • Grand Convention Center"
  time_remaining_label: string; // e.g. "14:59 remaining"
  on_close: () => void;
}

export function SeatMapHeader({
  event_title,
  event_subtitle,
  time_remaining_label,
  on_close,
}: SeatMapHeaderProps) {
  return (
    <header className="sticky top-0 z-50 flex w-full shrink-0 items-center justify-between border-b border-border-subtle bg-surface-white/90 px-margin-desktop py-4 shadow-sm backdrop-blur-xl">
      <div className="flex items-center gap-6">
        <span className="font-headline-md text-headline-md font-bold tracking-tight text-primary">
          CrowdFlow
        </span>
        <div className="hidden h-6 w-px bg-border-subtle md:block" />
        <div className="hidden flex-col md:flex">
          <h1 className="font-label-md text-label-md text-primary">
            {event_title}
          </h1>
          <p className="font-label-sm text-label-sm text-text-secondary">
            {event_subtitle}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden items-center gap-2 rounded-full bg-surface-container px-3 py-1.5 font-label-sm text-label-sm text-text-secondary sm:flex">
          <Timer size={18} />
          <span>{time_remaining_label}</span>
        </div>
        <button
          type="button"
          className="flex items-center gap-1 font-label-md text-label-md text-text-secondary transition-colors hover:text-primary"
        >
          <CircleHelp size={20} />
          <span className="hidden md:inline">Help</span>
        </button>
        <button
          type="button"
          onClick={on_close}
          aria-label="Close seat selection"
          className="flex items-center justify-center rounded-full bg-surface-container p-2 text-primary transition-colors hover:bg-surface-container-high"
        >
          <X size={20} />
        </button>
      </div>
    </header>
  );
}