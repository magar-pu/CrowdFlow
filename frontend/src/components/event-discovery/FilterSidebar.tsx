/**
 * components/event-discovery/FilterSidebar.tsx
 *
 * Sticky advanced-filter sidebar: city checkboxes, price-range slider,
 * availability radios, "Clear All Filters" button. Matches Stitch markup
 * exactly. State is fully controlled — parent page owns the actual
 * filtering logic against mockEventListingCards.
 */

import { Filter } from "lucide-react";

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
  return (
    <aside className="w-full shrink-0 lg:w-72">
      <div className="sticky top-24 rounded-xl border border-border-subtle bg-surface-white p-6">
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