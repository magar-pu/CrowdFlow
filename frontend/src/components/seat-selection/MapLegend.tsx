/**
 * components/seat-selection/MapLegend.tsx
 * Sesuai Stitch: VIP, VIP C, VIP R, Gold, GA, Unavailable, Selected
 */

"use client";

import { useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";

const LEGEND_ITEMS = [
  { color: "#A78BFA", label: "VIP", price: "$299.00" },
  { color: "#F97316", label: "VIP C", price: "$199.00" },
  { color: "#3B82F6", label: "VIP R", price: "$149.00" },
  { color: "#EAB308", label: "Gold", price: "$99.00" },
  { color: "#4ADE80", label: "General Admission", price: "$59.00" },
  { color: "#E2E8F0", label: "Unavailable", price: "" },
  { color: "#1D4ED8", label: "Selected", price: "", is_check: true },
];

export function MapLegend() {
  const [is_open, set_is_open] = useState(false);

  return (
    <div className="absolute bottom-32 left-4 z-10 w-[140px] md:w-auto rounded-xl border border-border-subtle bg-white/95 shadow-elevated backdrop-blur-md md:bottom-28 md:left-6">
      {/* Mobile Toggle */}
      <button 
        className="flex w-full items-center justify-between p-3 font-label-sm text-label-sm font-bold uppercase tracking-wider text-text-secondary md:hidden"
        onClick={() => set_is_open(!is_open)}
      >
        Legend
        {is_open ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
      </button>

      {/* Content */}
      <div className={`flex-col gap-2 p-3 pt-0 md:flex md:p-4 ${is_open ? "flex" : "hidden"}`}>
        <h3 className="mb-1 hidden font-label-sm text-label-sm font-bold uppercase tracking-wider text-text-secondary md:block">
          Legend
        </h3>
        {LEGEND_ITEMS.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-3 md:gap-6">
            <div className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-full border border-white/50 shadow-sm md:h-4 md:w-4"
                style={{ backgroundColor: item.color }}
              />
              <span className="font-body-sm text-body-sm text-text-primary text-xs md:text-sm">{item.label}</span>
            </div>
            {item.price && (
              <span className="font-label-sm text-label-sm text-text-secondary text-[10px] md:text-xs">{item.price}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}