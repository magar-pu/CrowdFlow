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
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 w-full">
      {/* Pills container - takes full width on mobile with smooth touch swipe */}
      <div className="flex w-full min-w-0 items-center gap-2 overflow-x-auto pb-1.5 sm:pb-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {QUICK_FILTERS.map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => on_filter_change(filter)}
            className={cn(
              "whitespace-nowrap rounded-full border px-4 py-1.5 sm:px-6 sm:py-2 text-xs sm:text-sm font-semibold transition-all shrink-0 cursor-pointer",
              active_filter === filter
                ? "border-transparent bg-neutral-900 text-white shadow-xs"
                : "border-border-subtle bg-surface-white text-text-secondary hover:border-neutral-400"
            )}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Sort By Dropdown */}
      <div className="flex items-center justify-end gap-2 shrink-0 self-end sm:self-auto">
        <span className="text-xs sm:text-sm font-medium text-text-secondary whitespace-nowrap">
          Sort by:
        </span>
        <select
          value={sort_by}
          onChange={(e) => on_sort_change(e.target.value)}
          className="rounded-xl border border-border-subtle bg-surface-white px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold text-text-primary focus:outline-none focus:ring-2 focus:ring-neutral-900 cursor-pointer shadow-2xs"
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