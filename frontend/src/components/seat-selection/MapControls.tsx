/**
 * components/seat-selection/MapControls.tsx
 *
 * Floating zoom in / zoom out / reset-view control stack, pinned to the
 * top-left of the map canvas. Matches Stitch markup exactly.
 */

import { Plus, Minus, Scan } from "lucide-react";

interface MapControlsProps {
  on_zoom_in: () => void;
  on_zoom_out: () => void;
  on_reset: () => void;
}

export function MapControls({
  on_zoom_in,
  on_zoom_out,
  on_reset,
}: MapControlsProps) {
  return (
    <div className="absolute left-6 top-6 z-10 hidden flex-col gap-2 rounded-xl border border-border-subtle bg-surface-white p-1.5 shadow-elevated md:flex">
      <button
        type="button"
        onClick={on_zoom_in}
        aria-label="Zoom in"
        className="flex h-10 w-10 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-container hover:text-primary"
      >
        <Plus size={20} />
      </button>
      <div className="my-0.5 h-px w-full bg-border-subtle" />
      <button
        type="button"
        onClick={on_zoom_out}
        aria-label="Zoom out"
        className="flex h-10 w-10 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-container hover:text-primary"
      >
        <Minus size={20} />
      </button>
      <div className="my-0.5 h-px w-full bg-border-subtle" />
      <button
        type="button"
        onClick={on_reset}
        aria-label="Reset view"
        title="Reset View"
        className="flex h-10 w-10 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-container hover:text-primary"
      >
        <Scan size={20} />
      </button>
    </div>
  );
}