/**
 * components/event-discovery/QuickFilterBar.tsx
 *
 * Horizontal-scroll quick-filter chip row ("Semua", "Hari Ini", ...) +
 * a "Urutkan" sort dropdown. Matches Stitch markup exactly.
 */

"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const QUICK_FILTERS = [
  "All",
  "Today",
  "This Week",
  "This Month",
  "Free Events",
  "Nearby",
  "Online",
  "Newest",
];

const SORT_OPTIONS = [
  "Most Popular",
  "Newest",
  "Lowest Price",
  "Highest Price",
];

interface QuickFilterBarProps {
  active_filter: string;
  on_filter_change: (filter: string) => void;
  sort_by: string;
  on_sort_change: (sort: string) => void;
}

export function QuickFilterBar({
  active_filter,
  on_filter_change,
  sort_by,
  on_sort_change,
}: QuickFilterBarProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex gap-2 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {QUICK_FILTERS.map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => on_filter_change(filter)}
            className={cn(
              "whitespace-nowrap rounded-full border px-6 py-2 font-label-md text-label-md transition-all",
              active_filter === filter
                ? "border-transparent bg-text-primary text-white"
                : "border-border-subtle bg-surface-white text-text-secondary hover:border-secondary"
            )}
          >
            {filter}
          </button>
        ))}
      </div>
      <div className="flex shrink-0 items-center gap-4">
        <span className="hidden font-body-sm text-text-secondary md:inline">
          Sort by:
        </span>
        <select
          value={sort_by}
          onChange={(e) => on_sort_change(e.target.value)}
          className="rounded-lg border-border-subtle bg-surface-white px-4 py-2 font-label-md text-label-md focus:ring-secondary"
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