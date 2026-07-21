/**
 * components/seat-selection/TicketTypeSelector.tsx
 *
 * Row horizontal ticket type pills sesuai Stitch design.
 * VIP, VIP C, VIP R, Gold, GA — dengan icon + harga.
 */

import { cn } from "@/lib/utils";

interface TicketType {
  id: string;
  label: string;
  price_label: string;
  color: string;
  icon: string;
}

const TICKET_TYPES: TicketType[] = [
  { id: "vip", label: "VIP", price_label: "$299.00", color: "#7C3AED", icon: "👑" },
  { id: "vip_c", label: "VIP C", price_label: "$199.00", color: "#EA580C", icon: "👑" },
  { id: "vip_r", label: "VIP R", price_label: "$149.00", color: "#3B82F6", icon: "💎" },
  { id: "gold", label: "Gold", price_label: "$99.00", color: "#D97706", icon: "🏆" },
  { id: "ga", label: "GA", price_label: "$59.00", color: "#16A34A", icon: "☰" },
];

interface TicketTypeSelectorProps {
  active_type_id: string;
  on_select: (id: string) => void;
}

export function TicketTypeSelector({ active_type_id, on_select }: TicketTypeSelectorProps) {
  return (
    <div className="border-b border-border-subtle bg-white px-6 py-3">
      <p className="mb-2 font-label-sm text-label-sm uppercase tracking-wider text-text-secondary">
        Choose Ticket Type
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TICKET_TYPES.map((type) => {
          const is_active = active_type_id === type.id;
          return (
            <button
              key={type.id}
              type="button"
              onClick={() => on_select(type.id)}
              className={cn(
                "flex shrink-0 items-center gap-3 rounded-xl border-2 px-4 py-2.5 transition-all duration-150",
                is_active
                  ? "border-secondary bg-secondary/5"
                  : "border-border-subtle bg-white hover:bg-surface-container-low"
              )}
            >
              {/* Colored icon circle */}
              <div
                className="flex h-9 w-9 items-center justify-center rounded-full text-base"
                style={{ backgroundColor: `${type.color}20`, border: `2px solid ${type.color}40` }}
              >
                <span>{type.icon}</span>
              </div>
              <div className="text-left">
                <p className={cn(
                  "font-label-md text-label-md font-bold",
                  is_active ? "text-secondary" : "text-text-primary"
                )}>
                  {type.label}
                </p>
                <p className="font-label-sm text-label-sm text-text-secondary">{type.price_label}</p>
              </div>
              {is_active && (
                <div className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-secondary">
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}