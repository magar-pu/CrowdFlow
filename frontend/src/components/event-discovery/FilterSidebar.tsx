"use client";

import { useState } from "react";
import { Filter, ChevronDown, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

const CITIES = ["Jakarta", "Bandung", "Surabaya", "Tangerang", "Sleman", "Badung"];

interface FilterSidebarProps {
  selected_cities: string[];
  on_toggle_city: (city: string) => void;
  max_price: number;
  on_max_price_change: (value: number) => void;
  availability: "available" | "limited";
  on_availability_change: (value: "available" | "limited") => void;
  on_clear_filters: () => void;
}

export function FilterSidebar({
  selected_cities,
  on_toggle_city,
  max_price,
  on_max_price_change,
  availability,
  on_availability_change,
  on_clear_filters,
}: FilterSidebarProps) {
  const [isOpenMobile, setIsOpenMobile] = useState(false);

  const activeFilterCount =
    selected_cities.length + (max_price < 5_000_000 ? 1 : 0);

  return (
    <aside className="w-full shrink-0 lg:w-72">
      {/* Mobile Toggle Trigger Button */}
      <div className="lg:hidden mb-4">
        <button
          type="button"
          onClick={() => setIsOpenMobile((prev) => !prev)}
          className="w-full flex items-center justify-between p-4 rounded-xl border border-border-subtle bg-surface-white font-bold text-sm text-text-primary shadow-2xs active:scale-[0.99] transition-all cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={18} className="text-secondary" />
            <span>Filter Events</span>
            {activeFilterCount > 0 && (
              <span className="ml-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </div>
          <ChevronDown
            size={18}
            className={cn(
              "text-text-secondary transition-transform duration-300",
              isOpenMobile && "rotate-180"
            )}
          />
        </button>
      </div>

      {/* Filter Sidebar Box - Collapsible on Mobile, Sticky on Desktop */}
      <div
        className={cn(
          "rounded-xl border border-border-subtle bg-surface-white p-5 sm:p-6 lg:sticky lg:top-24 shadow-sm transition-all duration-300",
          !isOpenMobile && "hidden lg:block"
        )}
      >
        <h3 className="mb-6 flex items-center justify-between font-headline-sm text-headline-sm text-text-primary">
          Filter
          <Filter size={18} className="text-text-secondary" />
        </h3>

        <div className="space-y-8">
          {/* City */}
          <div>
            <label className="mb-4 block font-label-md text-label-md text-text-primary">
              City
            </label>
            <div className="space-y-3">
              {CITIES.map((city) => (
                <label
                  key={city}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selected_cities.includes(city)}
                    onChange={() => on_toggle_city(city)}
                    className="h-5 w-5 rounded border-border-subtle text-secondary focus:ring-secondary"
                  />
                  <span className="text-body-md text-text-primary">
                    {city}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Price range */}
          <div className="border-t border-border-subtle pt-6">
            <label className="mb-4 block font-label-md text-label-md text-text-primary">
              Price Range
            </label>
            <input
              type="range"
              min={0}
              max={5_000_000}
              step={50_000}
              value={max_price}
              onChange={(e) => on_max_price_change(Number(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-surface-container accent-secondary"
            />
            <div className="mt-2 flex justify-between text-label-sm text-text-secondary">
              <span>Rp 0</span>
              <span>Rp {(max_price / 1_000_000).toFixed(1)}M</span>
            </div>
          </div>

          {/* Availability */}
          <div className="border-t border-border-subtle pt-6">
            <label className="mb-4 block font-label-md text-label-md text-text-primary">
              Availability
            </label>
            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <input
                  type="radio"
                  name="avail"
                  checked={availability === "available"}
                  onChange={() => on_availability_change("available")}
                  className="h-5 w-5 border-border-subtle text-secondary focus:ring-secondary"
                />
                <span className="text-body-md text-text-primary">
                  Available
                </span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="radio"
                  name="avail"
                  checked={availability === "limited"}
                  onChange={() => on_availability_change("limited")}
                  className="h-5 w-5 border-border-subtle text-secondary focus:ring-secondary"
                />
                <span className="text-body-md text-text-primary">
                  Limited
                </span>
              </label>
            </div>
          </div>

          <button
            type="button"
            onClick={on_clear_filters}
            className="w-full rounded-lg bg-surface-container py-3 font-label-md text-label-md text-text-primary transition-all hover:bg-border-subtle"
          >
            Clear All Filters
          </button>
        </div>
      </div>
    </aside>
  );
}