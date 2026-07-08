/**
 * components/home/HeroSection.tsx
 *
 * Landing page hero — headline, subcopy, and the floating glass search
 * console (event / location / date / explore). Matches crowdflow_home
 * Stitch markup: full-bleed background image at 20% opacity fading into
 * the page background, centered content, pill-shaped search bar on desktop.
 */

"use client";

import { useState } from "react";
import { Search, MapPin, Calendar } from "lucide-react";

export function HeroSection() {
  const [search_query, set_search_query] = useState("");
  const [location, set_location] = useState("");
  const [date, set_date] = useState("");

  return (
    <section className="relative overflow-hidden px-margin-mobile pb-32 pt-24 md:px-margin-desktop">
      <div className="absolute inset-0 z-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1493676304819-0d7a8d026dcf?q=80&w=1600&auto=format&fit=crop"
          alt=""
          className="h-full w-full object-cover object-top opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background" />
      </div>

      <div className="relative z-10 mx-auto max-w-container-max space-y-8 text-center">
        <h1 className="mx-auto max-w-4xl font-headline-xl text-headline-xl font-bold tracking-tight text-primary md:text-[64px] md:leading-[72px]">
          Secure Ticketing. <br className="hidden md:block" />
          <span className="text-secondary">Seamless Events.</span>
        </h1>
        <p className="mx-auto max-w-2xl font-body-lg text-body-lg text-text-secondary">
          Experience the next-generation AI-powered ticketing ecosystem
          designed for premium events, featuring interactive seat selection
          and verified resale.
        </p>

        {/* Search console */}
        <div className="mx-auto mt-12 flex max-w-5xl flex-col items-center justify-between gap-2 rounded-2xl border border-border-subtle bg-white/70 p-2 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl md:flex-row md:gap-0 md:rounded-full md:p-4">
          <div className="flex w-full flex-1 items-center gap-3 border-border-subtle px-4 py-3 md:w-auto md:border-r">
            <Search size={20} className="text-text-secondary" />
            <input
              type="text"
              value={search_query}
              onChange={(e) => set_search_query(e.target.value)}
              placeholder="Search events, artists..."
              className="w-full border-none bg-transparent p-0 font-body-md text-body-md text-primary placeholder:text-text-secondary focus:outline-none focus:ring-0"
            />
          </div>
          <div className="flex w-full flex-1 items-center gap-3 border-border-subtle px-4 py-3 md:w-auto md:border-r">
            <MapPin size={20} className="text-text-secondary" />
            <input
              type="text"
              value={location}
              onChange={(e) => set_location(e.target.value)}
              placeholder="Location"
              className="w-full border-none bg-transparent p-0 font-body-md text-body-md text-primary placeholder:text-text-secondary focus:outline-none focus:ring-0"
            />
          </div>
          <div className="flex w-full flex-1 items-center gap-3 px-4 py-3 md:w-auto">
            <Calendar size={20} className="text-text-secondary" />
            <input
              type="text"
              value={date}
              onChange={(e) => set_date(e.target.value)}
              placeholder="Any dates"
              className="w-full border-none bg-transparent p-0 font-body-md text-body-md text-primary placeholder:text-text-secondary focus:outline-none focus:ring-0"
            />
          </div>
          <div className="w-full p-2 md:w-auto">
            <button
              type="button"
              className="w-full rounded-xl bg-secondary px-8 py-3 font-label-md text-label-md text-white shadow-md transition-all hover:bg-secondary/90 md:w-auto md:rounded-full"
            >
              Explore Events
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}