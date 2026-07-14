"use client";

import { useVenueEditorStore } from "@/lib/store/venueEditorStore";
import { Coffee, Info, LogOut, PlusSquare, Tent, Utensils } from "lucide-react";

const ICONS = [
  { type: "restroom", label: "Restroom", icon: Tent, color: "text-blue-500", bg: "bg-blue-500/10" },
  { type: "food", label: "Food & Drink", icon: Utensils, color: "text-orange-500", bg: "bg-orange-500/10" },
  { type: "medical", label: "First Aid", icon: PlusSquare, color: "text-red-500", bg: "bg-red-500/10" },
  { type: "exit", label: "Gate / Exit", icon: LogOut, color: "text-green-500", bg: "bg-green-500/10" },
  { type: "info", label: "Information", icon: Info, color: "text-purple-500", bg: "bg-purple-500/10" },
  { type: "merch", label: "Merchandise", icon: Coffee, color: "text-pink-500", bg: "bg-pink-500/10" },
] as const;

export function FacilityIconsPanel() {
  const add_facility = useVenueEditorStore((s) => s.add_facility);

  const handle_add = (type: typeof ICONS[number]["type"]) => {
    // Add to the center of the viewport/canvas (approximate for now)
    add_facility(type, 400, 300);
  };

  return (
    <div className="flex h-full w-72 flex-col border-r border-border-subtle bg-surface-white">
      <div className="flex items-center justify-between border-b border-border-subtle p-4">
        <h3 className="text-sm font-bold text-primary">Facility Icons</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <p className="mb-4 text-xs text-text-secondary">
          Click an icon to add it to the center of the canvas. You can drag it into position later.
        </p>

        <div className="grid grid-cols-2 gap-3">
          {ICONS.map((item) => (
            <button
              key={item.type}
              type="button"
              onClick={() => handle_add(item.type)}
              className="flex flex-col items-center gap-2 rounded-xl border border-border-subtle bg-surface-white p-3 transition-colors hover:border-primary hover:bg-surface-variant"
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${item.bg} ${item.color}`}>
                <item.icon size={20} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary text-center">
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
