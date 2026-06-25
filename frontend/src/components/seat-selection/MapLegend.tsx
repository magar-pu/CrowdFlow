/**
 * components/seat-selection/MapLegend.tsx
 * Sesuai Stitch: VIP, VIP C, VIP R, Gold, GA, Unavailable, Selected
 */

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
  return (
    <div className="absolute bottom-24 left-4 z-10 rounded-xl border border-border-subtle bg-white/95 p-4 shadow-elevated backdrop-blur-md md:bottom-28 md:left-6">
      <h3 className="mb-3 font-label-sm text-label-sm font-bold uppercase tracking-wider text-text-secondary">
        Legend
      </h3>
      <div className="flex flex-col gap-2">
        {LEGEND_ITEMS.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div
                className="h-4 w-4 rounded-full border border-white/50 shadow-sm"
                style={{ backgroundColor: item.color }}
              />
              <span className="font-body-sm text-body-sm text-text-primary">{item.label}</span>
            </div>
            {item.price && (
              <span className="font-label-sm text-label-sm text-text-secondary">{item.price}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}