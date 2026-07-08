/**
 * components/resale-marketplace/ResaleFilterToolbar.tsx
 *
 * Filter pill row ("All Categories", "Any Date", "Price Range") +
 * "Sort by" dropdown. Matches Stitch markup exactly — filters are
 * presentational only for now (no real filtering logic wired in yet,
 * since mock data is small enough that it isn't needed to demo the UI).
 */

import { ChevronDown, Calendar, Wallet } from "lucide-react";

interface ResaleFilterToolbarProps {
  sort_by: string;
  on_sort_change: (value: string) => void;
}

const SORT_OPTIONS = ["Recently Added", "Lowest Price", "Event Date"];

export function ResaleFilterToolbar({
  sort_by,
  on_sort_change,
}: ResaleFilterToolbarProps) {
  return (
    <div className="flex flex-col items-start justify-between gap-4 border-b border-border-subtle pb-6 md:flex-row md:items-center">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 font-label-sm text-label-sm text-on-primary"
        >
          All Categories
          <ChevronDown size={16} />
        </button>
        <button
          type="button"
          className="flex items-center gap-2 rounded-full border border-border-subtle bg-surface-white px-4 py-2 font-label-sm text-label-sm text-primary transition-colors hover:bg-surface-container"
        >
          Any Date
          <Calendar size={16} />
        </button>
        <button
          type="button"
          className="flex items-center gap-2 rounded-full border border-border-subtle bg-surface-white px-4 py-2 font-label-sm text-label-sm text-primary transition-colors hover:bg-surface-container"
        >
          Price Range
          <Wallet size={16} />
        </button>
      </div>
      <div className="flex items-center gap-3">
        <span className="font-body-sm text-body-sm text-text-secondary">
          Sort by:
        </span>
        <select
          value={sort_by}
          onChange={(e) => on_sort_change(e.target.value)}
          className="cursor-pointer border-none bg-transparent font-label-sm text-label-sm text-primary outline-none focus:ring-0"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}