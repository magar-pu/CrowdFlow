/**
 * components/home-v2/HeroSearchSection.tsx
 */

"use client";

import { useState } from "react";
import { Search, MapPin, Calendar } from "lucide-react";

const LOCATIONS = ["Jakarta", "Bali", "Bandung", "Surabaya"];

export function HeroSearchSection() {
  const [query, set_query] = useState("");
  const [location, set_location] = useState(LOCATIONS[0]);
  const [date, set_date] = useState("");

  return (
    <section className="relative flex min-h-[420px] w-full flex-col items-center justify-center overflow-hidden px-margin-mobile md:h-[500px] md:px-margin-desktop">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?q=80&w=1600&auto=format&fit=crop"
          alt=""
          className="h-full w-full object-cover object-center brightness-[0.4]"
        />
      </div>

      {/* Headline */}
      <div className="relative z-10 mb-6 max-w-3xl px-2 text-center md:mb-stack-lg">
        <h1 className="mb-3 text-3xl font-bold leading-tight tracking-tight text-white md:font-headline-xl md:text-headline-xl">
          Temukan Event Seru Di Sekitar Kamu
        </h1>
        <p className="text-sm text-white/80 md:font-body-lg md:text-body-lg">
          Pesan tiket konser, festival, olahraga, dan seminar terbaik
          dengan mudah dan aman.
        </p>
      </div>

      {/* Search bar */}
      <div className="relative z-20 flex w-full max-w-4xl flex-col gap-3 rounded-xl bg-white p-3 shadow-2xl md:flex-row md:items-end md:gap-4 md:p-4">
        {/* Event / Artist */}
        <div className="w-full flex-1 space-y-1.5">
          <label className="block px-1 font-label-sm text-label-sm uppercase text-text-secondary">
            Nama Event atau Artis
          </label>
          <div className="flex items-center rounded-lg border border-border-subtle bg-surface-container-low px-3 py-2">
            <Search size={18} className="mr-2 shrink-0 text-text-secondary" />
            <input
              type="text"
              value={query}
              onChange={(e) => set_query(e.target.value)}
              placeholder="Konser, Seminar, atau Olahraga..."
              className="w-full border-none bg-transparent text-sm text-text-primary focus:outline-none focus:ring-0"
            />
          </div>
        </div>

        {/* Lokasi */}
        <div className="w-full space-y-1.5 md:w-48">
          <label className="block px-1 font-label-sm text-label-sm uppercase text-text-secondary">
            Lokasi
          </label>
          <div className="flex items-center rounded-lg border border-border-subtle bg-surface-container-low px-3 py-2">
            <MapPin size={18} className="mr-2 shrink-0 text-text-secondary" />
            <select
              value={location}
              onChange={(e) => set_location(e.target.value)}
              className="w-full appearance-none border-none bg-transparent text-sm text-text-primary focus:outline-none focus:ring-0"
            >
              {LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tanggal */}
        <div className="w-full space-y-1.5 md:w-48">
          <label className="block px-1 font-label-sm text-label-sm uppercase text-text-secondary">
            Tanggal
          </label>
          <div className="flex items-center rounded-lg border border-border-subtle bg-surface-container-low px-3 py-2">
            <Calendar size={18} className="mr-2 shrink-0 text-text-secondary" />
            <input
              type="date"
              value={date}
              onChange={(e) => set_date(e.target.value)}
              className="w-full border-none bg-transparent text-sm text-text-primary focus:outline-none focus:ring-0"
            />
          </div>
        </div>

        {/* CTA */}
        <button
          type="button"
          className="w-full shrink-0 rounded-lg bg-secondary py-2.5 font-label-md text-label-md text-white transition-all hover:brightness-110 active:scale-95 md:w-auto md:px-8 md:py-3"
        >
          Cari
        </button>
      </div>
    </section>
  );
}