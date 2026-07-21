/**
 * components/seat-selection/MapBottomToolbar.tsx
 *
 * Bottom toolbar sesuai Stitch: Seat List, Best Available, Zoom In, Zoom Out, Fullscreen.
 */

import { List, Star, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";

interface MapBottomToolbarProps {
  on_zoom_in: () => void;
  on_zoom_out: () => void;
  on_best_available?: () => void;
  on_seat_list?: () => void;
  on_fullscreen?: () => void;
}

const TOOLBAR_ITEMS = (props: MapBottomToolbarProps) => [
  { label: "Seat List", icon: List, action: props.on_seat_list },
  { label: "Best Available", icon: Star, action: props.on_best_available },
  { label: "Zoom In", icon: ZoomIn, action: props.on_zoom_in },
  { label: "Zoom Out", icon: ZoomOut, action: props.on_zoom_out },
  { label: "Fullscreen", icon: Maximize2, action: props.on_fullscreen },
];

export function MapBottomToolbar(props: MapBottomToolbarProps) {
  const items = TOOLBAR_ITEMS(props);
  return (
    <div className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2">
      <div className="flex items-center gap-1 rounded-2xl border border-border-subtle bg-white px-2 py-2 shadow-[0_4px_24px_rgba(0,0,0,0.08)]">
        {items.map((item, idx) => {
          const Icon = item.icon;
          return (
            <button
              key={idx}
              type="button"
              onClick={item.action}
              className="flex flex-col items-center gap-1 rounded-xl px-4 py-2 transition-colors hover:bg-surface-container-low"
            >
              <Icon size={20} className="text-text-secondary" />
              <span className="font-label-sm text-label-sm text-text-secondary">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}