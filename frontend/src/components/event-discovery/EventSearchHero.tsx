/**
 * components/event-discovery/EventSearchHero.tsx
 *
 * Hero section: headline + subcopy + a 5-column search bar (event name /
 * location dropdown / date / search button / reset button). Matches the
 * Stitch markup exactly. Indonesian copy preserved as-is, matching the
 * design's locale.
 *
 * Now controlled by parent — search state is lifted so the events page
 * can filter its grid in real-time.
 */

"use client";

import { Search, MapPin, Calendar, RotateCcw } from "lucide-react";

const LOCATIONS = ["All Locations", "Jakarta", "Bandung", "Surabaya", "Tangerang", "Sleman", "Badung"];

interface EventSearchHeroProps {
  query: string;
  on_query_change: (value: string) => void;
  location: string;
  on_location_change: (value: string) => void;
  date: string;
  on_date_change: (value: string) => void;
  on_reset: () => void;
}

export function EventSearchHero({
  query,
  on_query_change,
  location,
  on_location_change,
  date,
  on_date_change,
  on_reset,
}: EventSearchHeroProps) {
  return (
    <section className="border-b border-border-subtle bg-surface-white py-stack-lg">
      <div className="mx-auto flex max-w-7xl w-full px-margin-mobile md:px-margin-desktop flex-col gap-8">
        <div className="max-w-2xl">
          <h1 className="mb-2 font-headline-xl text-headline-xl text-text-primary">
            Find Your Next Exciting Event
          </h1>
          <p className="font-body-lg text-body-lg text-text-secondary">
            The most secure ticketing platform with real-time identity
            verification technology.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 rounded-xl border border-border-subtle bg-surface-container-low p-2 shadow-sm md:grid-cols-5">
          <div className="group relative md:col-span-2">
            <Search
              size={20}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary transition-colors group-focus-within:text-secondary"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => on_query_change(e.target.value)}
              placeholder="Search event, artist, or team name..."
              className="w-full rounded-lg border-none bg-surface-white py-4 pl-12 pr-4 font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-secondary"
            />
          </div>
          <div className="relative">
            <MapPin
              size={20}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary"
            />
            <select
              value={location}
              onChange={(e) => on_location_change(e.target.value)}
              className="w-full appearance-none rounded-lg border-none bg-surface-white py-4 pl-12 pr-4 font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-secondary"
            >
              {LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>
          <div className="relative">
            <Calendar
              size={20}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary"
            />
            <input
              type="date"
              value={date}
              onChange={(e) => on_date_change(e.target.value)}
              placeholder="Select Date"
              className="w-full rounded-lg border-none bg-surface-white py-4 pl-12 pr-4 font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-secondary"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={on_reset}
              title="Reset Filters"
              aria-label="Reset filters"
              className="flex-1 rounded-lg border border-border-subtle bg-surface-white px-4 font-label-md text-label-md text-text-secondary transition-all hover:bg-surface-container active:scale-95 flex items-center justify-center gap-2"
            >
              <RotateCcw size={18} /> Reset
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}