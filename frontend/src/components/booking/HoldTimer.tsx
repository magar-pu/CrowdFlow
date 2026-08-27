"use client";

/**
 * components/booking/HoldTimer.tsx
 *
 * The "your seats are held for N more minutes" pill.
 *
 * Presentation only — the countdown itself lives in useHoldCountdown, so the
 * seat map and checkout render the same deadline from the same source and a
 * buyer moving between them never sees two different numbers.
 */

import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

/** Below this the pill turns urgent, matching how little time is really left. */
const URGENT_THRESHOLD_SECONDS = 60;

interface HoldTimerProps {
  seconds_left: number;
  is_expired: boolean;
  /**
   * Neutral by default because a hold may be seats or general admission, and
   * checkout renders both.
   */
  label?: string;
  className?: string;
}

export function HoldTimer({
  seconds_left,
  is_expired,
  label = "Held for you",
  className,
}: HoldTimerProps) {
  const mins = String(Math.floor(seconds_left / 60)).padStart(2, "0");
  const secs = String(seconds_left % 60).padStart(2, "0");
  const is_urgent = !is_expired && seconds_left <= URGENT_THRESHOLD_SECONDS;
  const is_alarming = is_expired || is_urgent;

  /*
    Announced only when it changes, and it only changes at these thresholds —
    a live region on the ticking clock itself would read every single second
    to a screen reader. The digits are hidden from assistive tech for the same
    reason; this sentence is what actually matters.
  */
  const announcement = is_expired
    ? "Your ticket hold has expired."
    : seconds_left === 300
      ? "Five minutes left to complete your purchase."
      : seconds_left === URGENT_THRESHOLD_SECONDS
        ? "One minute left to complete your purchase."
        : "";

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors",
        is_alarming
          ? "border-danger/40 bg-danger/5"
          : "border-border-subtle bg-surface-white",
        className
      )}
    >
      <Clock
        size={16}
        aria-hidden="true"
        className={is_alarming ? "text-danger" : "text-secondary"}
      />

      {is_expired ? (
        <span className="font-label-sm text-label-sm font-bold text-danger">
          Hold expired
        </span>
      ) : (
        <>
          <span
            aria-hidden="true"
            className={cn(
              "font-headline-sm text-headline-sm font-bold tabular-nums",
              is_alarming ? "text-danger" : "text-text-primary"
            )}
          >
            {mins}:{secs}
          </span>
          <span
            className={cn(
              "hidden font-body-sm text-body-sm sm:inline",
              is_alarming ? "text-danger" : "text-text-secondary"
            )}
          >
            {label}
          </span>
        </>
      )}

      <span role="status" aria-live="polite" className="sr-only">
        {announcement}
      </span>
    </div>
  );
}
