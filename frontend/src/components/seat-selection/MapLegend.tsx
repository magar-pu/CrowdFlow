/**
 * components/seat-selection/MapLegend.tsx
 *
 * Floating legend pinned to the bottom-left of the map canvas, explaining
 * the 4 seat-color states. Matches Stitch markup exactly.
 */

const LEGEND_ITEMS = [
    { swatch_class: "bg-surface border border-border-subtle", label: "Available", text_class: "text-primary" },
    { swatch_class: "bg-tertiary", label: "Selected", text_class: "text-primary" },
    {
      swatch_class: "bg-surface-tint opacity-50",
      label: "Sold / Unavailable",
      text_class: "text-text-secondary line-through",
    },
    {
      swatch_class: "border border-warning/50 bg-warning/20",
      label: "VIP / Premium",
      text_class: "text-primary",
    },
  ];
  
  export function MapLegend() {
    return (
      <div className="absolute bottom-6 left-6 z-10 rounded-xl border border-border-subtle bg-surface-white/90 p-4 shadow-elevated backdrop-blur-md">
        <h3 className="mb-3 font-label-sm text-label-sm uppercase tracking-wider text-text-secondary">
          Legend
        </h3>
        <div className="flex flex-col gap-2">
          {LEGEND_ITEMS.map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <div className={`h-4 w-4 rounded ${item.swatch_class}`} />
              <span className={`font-body-sm text-body-sm ${item.text_class}`}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }