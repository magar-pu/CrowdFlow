/**
 * components/event-discovery/EventSearchHero.tsx
 *
 * Hero section: headline + subcopy + a 5-column search bar (event name /
 * location dropdown / date / search button / reset button). Matches the
 * Stitch markup exactly. Indonesian copy preserved as-is, matching the
 * design's locale.
 */

"use client";

import { useState } from "react";
import { Search, MapPin, Calendar, RotateCcw } from "lucide-react";

const LOCATIONS = ["Semua Lokasi", "Jakarta", "Bandung", "Bali", "Surabaya"];

export function EventSearchHero() {
  const [query, set_query] = useState("");
  const [location, set_location] = useState(LOCATIONS[0]);
  const [date, set_date] = useState("");

  function handle_reset() {
    set_query("");
    set_location(LOCATIONS[0]);
    set_date("");
  }

  return (
    <section className="border-b border-border-subtle bg-surface-white px-margin-mobile py-stack-lg md:px-margin-desktop">
      <div className="mx-auto flex max-w-container-max flex-col gap-8">
        <div className="max-w-2xl">
          <h1 className="mb-2 font-headline-xl text-headline-xl text-text-primary">
            Temukan Event Seru Selanjutnya
          </h1>
          <p className="font-body-lg text-body-lg text-text-secondary">
            Platform ticketing paling aman dengan teknologi verifikasi
            identitas real-time.
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
              onChange={(e) => set_query(e.target.value)}
              placeholder="Cari nama event, artis, atau tim..."
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
              onChange={(e) => set_location(e.target.value)}
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
              onChange={(e) => set_date(e.target.value)}
              placeholder="Pilih Tanggal"
              className="w-full rounded-lg border-none bg-surface-white py-4 pl-12 pr-4 font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-secondary"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="flex-1 rounded-lg bg-text-primary font-label-md text-label-md text-white shadow-lg shadow-primary/10 transition-all hover:bg-secondary active:scale-95"
            >
              Search Events
            </button>
            <button
              type="button"
              onClick={handle_reset}
              title="Reset Filters"
              aria-label="Reset filters"
              className="rounded-lg border border-border-subtle bg-surface-white px-4 font-label-md text-label-md text-text-secondary transition-all hover:bg-surface-container active:scale-95"
            >
              <RotateCcw size={20} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}