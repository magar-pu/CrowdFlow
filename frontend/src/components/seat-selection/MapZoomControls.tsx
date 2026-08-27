/**
 * components/seat-selection/MapZoomControls.tsx
 *
 * Zoom and reset for the buyer's seat map.
 *
 * Replaces the bottom toolbar, which floated across the middle of the map and
 * covered seats on shorter viewports, and whose "Seat List" and "Best
 * Available" buttons had no handlers at all. Only zoom survived, so only zoom
 * is here.
 *
 * It matters most on touch: there is no wheel event on a phone and the map has
 * no pinch handler, so without these a dense layout cannot be magnified enough
 * to tap an individual seat.
 *
 * Pinned top-right, clear of MapLegend at bottom-left.
 */

"use client";

import { ZoomIn, ZoomOut, Undo2 } from "lucide-react";

interface MapZoomControlsProps {
  on_zoom_in: () => void;
  on_zoom_out: () => void;
  on_reset_view: () => void;
  can_zoom_in: boolean;
  can_zoom_out: boolean;
  /** Hides the reset button when there is nothing to reset. */
  is_default_view: boolean;
}

const button_class =
  "flex h-9 w-9 items-center justify-center text-text-secondary transition-colors hover:bg-surface-container-low hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-secondary disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent";

export function MapZoomControls({
  on_zoom_in,
  on_zoom_out,
  on_reset_view,
  can_zoom_in,
  can_zoom_out,
  is_default_view,
}: MapZoomControlsProps) {
  return (
    <div className="absolute right-4 top-4 z-10 flex flex-col overflow-hidden rounded-xl border border-border-subtle bg-white shadow-[0_4px_24px_rgba(0,0,0,0.08)] md:right-6 md:top-6">
      <button
        type="button"
        onClick={on_zoom_in}
        disabled={!can_zoom_in}
        aria-label="Zoom in"
        className={button_class}
      >
        <ZoomIn size={18} />
      </button>

      <div aria-hidden className="h-px w-full bg-border-subtle" />

      <button
        type="button"
        onClick={on_zoom_out}
        disabled={!can_zoom_out}
        aria-label="Zoom out"
        className={button_class}
      >
        <ZoomOut size={18} />
      </button>

      {!is_default_view && (
        <>
          <div aria-hidden className="h-px w-full bg-border-subtle" />
          <button
            type="button"
            onClick={on_reset_view}
            aria-label="Reset view"
            title="Reset view"
            className={button_class}
          >
            <Undo2 size={16} />
          </button>
        </>
      )}
    </div>
  );
}
