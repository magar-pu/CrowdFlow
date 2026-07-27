"use client";

import { useState } from "react";
import { Trash2, Plus, Rocket, Paintbrush, AlertTriangle, ChevronDown, ChevronUp, BarChart3, X } from "lucide-react";
import type { PricingTier, VenueSection } from "@/types/ticket";
import { useVenueEditorStore, type ValidationError } from "@/lib/store/venueEditorStore";
import { cn } from "@/lib/utils";
import Select from "@/components/ui/Select";

interface TierStats {
  tier_id: string;
  assigned_seats: number;
  estimated_revenue: number;
}

interface TicketConfigPanelProps {
  base_currency: string;
  tax_rate: number;
  pricing_tiers: PricingTier[];
  sections: VenueSection[];
  selected_paint_tier_id?: string | null;
  on_tier_select?: (tier_id: string | null) => void;
  on_currency_change: (currency: string) => void;
  on_tax_rate_change: (rate: number) => void;
  on_tier_add: (tier: PricingTier) => void;
  on_tier_update: (tier_id: string, updates: Partial<PricingTier>) => void;
  on_tier_remove: (tier_id: string) => void;
  on_save_draft: () => void;
  on_publish: () => void;
  on_validate: () => ValidationError[];
}

function format_currency(value: number, currency: string): string {
  const code = currency.split(" ")[0];
  if (code === "IDR") return `Rp ${value.toLocaleString("id-ID")}`;
  if (code === "USD") return `$${value.toLocaleString("en-US")}`;
  if (code === "EUR") return `€${value.toLocaleString("de-DE")}`;
  if (code === "GBP") return `£${value.toLocaleString("en-GB")}`;
  return `${value.toLocaleString()}`;
}

export function TicketConfigPanel({
  base_currency,
  tax_rate,
  pricing_tiers,
  sections,
  selected_paint_tier_id,
  on_tier_select,
  on_currency_change,
  on_tax_rate_change,
  on_tier_add,
  on_tier_update,
  on_tier_remove,
  on_save_draft,
  on_publish,
  on_validate,
}: TicketConfigPanelProps) {
  const [show_validation_modal, set_show_validation_modal] = useState(false);
  const [validation_errors, set_validation_errors] = useState<ValidationError[]>([]);
  const [expanded_tier_id, set_expanded_tier_id] = useState<string | null>(null);

  // ── Compute tier stats from the flat seat list ────────────────────────
  const all_seats = useVenueEditorStore((s) => s.seats);
  const total_seats = all_seats.length;
  const unassigned_seats = all_seats.filter((s) => !s.tier_id).length;

  const tier_stats: TierStats[] = pricing_tiers.map((tier) => {
    const assigned = all_seats.filter((s) => s.tier_id === tier.tier_id).length;
    return {
      tier_id: tier.tier_id,
      assigned_seats: assigned,
      estimated_revenue: assigned * tier.price,
    };
  });

  const total_revenue = tier_stats.reduce((sum, t) => sum + t.estimated_revenue, 0);
  const total_assigned = tier_stats.reduce((sum, t) => sum + t.assigned_seats, 0);

  const handle_publish = () => {
    const errors = on_validate();
    if (errors.length > 0) {
      set_validation_errors(errors);
      set_show_validation_modal(true);
    } else {
      on_publish();
    }
  };

  return (
    <div className="relative flex h-full w-full shrink-0 flex-col bg-surface-container-lowest lg:w-[450px] xl:w-[500px]">
      {/* Header / Global Params */}
      <div className="z-10 shrink-0 border-b border-border-subtle bg-surface-white p-6">
        <h2
          className="mb-4 text-2xl font-semibold text-primary"
          style={{ fontFamily: "Hanken Grotesk, sans-serif" }}
        >
          Pricing Tiers
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-medium uppercase tracking-widest text-text-secondary">
              Base Currency
            </label>
            <Select
              selectSize="md"
              value={base_currency}
              onChange={(e) => on_currency_change(e.target.value)}
            >
              <option>USD ($)</option>
              <option>EUR (€)</option>
              <option>GBP (£)</option>
              <option>IDR (Rp)</option>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-medium uppercase tracking-widest text-text-secondary">
              Tax Rate (%)
            </label>
            <input
              type="number"
              value={tax_rate}
              onChange={(e) => on_tax_rate_change(parseFloat(e.target.value) || 0)}
              step={0.1}
              className="w-full rounded-lg border border-border-subtle bg-surface-white px-3 py-2 text-sm text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Summary Stats Bar */}
      <div className="shrink-0 border-b border-border-subtle bg-surface-bright px-6 py-4">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 size={14} className="text-primary" />
          <span className="text-xs font-bold uppercase tracking-wider text-primary">Summary</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col gap-0.5 rounded-lg bg-surface-container-lowest p-2.5">
            <span className="text-[10px] font-medium uppercase tracking-wider text-text-secondary">Total Seats</span>
            <span className="text-lg font-bold text-primary">{total_seats}</span>
          </div>
          <div className="flex flex-col gap-0.5 rounded-lg bg-surface-container-lowest p-2.5">
            <span className="text-[10px] font-medium uppercase tracking-wider text-text-secondary">Assigned</span>
            <span className="text-lg font-bold text-status-success">{total_assigned}</span>
          </div>
          <div className="flex flex-col gap-0.5 rounded-lg bg-surface-container-lowest p-2.5">
            <span className="text-[10px] font-medium uppercase tracking-wider text-text-secondary">Est. Revenue</span>
            <span className="text-sm font-bold text-primary">{format_currency(total_revenue, base_currency)}</span>
          </div>
        </div>
        {unassigned_seats > 0 && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
            <AlertTriangle size={14} className="shrink-0 text-amber-600" />
            <span className="text-xs font-medium text-amber-700">
              {unassigned_seats} seat{unassigned_seats !== 1 ? "s" : ""} unassigned — use Paint Bucket to assign tiers
            </span>
          </div>
        )}
      </div>

      {/* Scrollable Ticket Forms */}
      <div className="flex flex-1 flex-col gap-6 overflow-y-auto bg-surface-bright p-6 pb-32">
        {pricing_tiers.map((tier) => {
          const stats = tier_stats.find((t) => t.tier_id === tier.tier_id);
          const is_expanded = expanded_tier_id === tier.tier_id;
          return (
            <div
              key={tier.tier_id}
              className={cn(
                "rounded-xl border bg-surface-white shadow-sm transition-all hover:shadow-[0_4px_20px_rgba(15,23,42,0.05)]",
                selected_paint_tier_id === tier.tier_id ? "border-primary ring-1 ring-primary/20" : "border-border-subtle"
              )}
            >
              {/* Section Header */}
              <div className="flex items-center justify-between border-b border-border-subtle px-5 py-3">
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={tier.color}
                    onChange={(e) => on_tier_update(tier.tier_id, { color: e.target.value })}
                    className="h-8 w-8 cursor-pointer rounded border-none p-0"
                  />
                  <div>
                    <input
                      type="text"
                      value={tier.name}
                      onChange={(e) => on_tier_update(tier.tier_id, { name: e.target.value })}
                      placeholder="Ticket Name (e.g. VIP)"
                      className="bg-transparent font-medium text-text-primary focus:outline-none"
                    />
                    {stats && (
                      <p className="text-[10px] text-text-secondary">
                        {stats.assigned_seats} seat{stats.assigned_seats !== 1 ? "s" : ""} · {format_currency(stats.estimated_revenue, base_currency)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {on_tier_select && (
                    <button
                      onClick={() => on_tier_select(selected_paint_tier_id === tier.tier_id ? null : tier.tier_id)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                        selected_paint_tier_id === tier.tier_id
                          ? "bg-primary text-on-primary"
                          : "bg-surface-container hover:bg-surface-container-high text-text-secondary"
                      )}
                    >
                      <Paintbrush size={14} />
                      Paint
                    </button>
                  )}
                  <button
                    onClick={() => set_expanded_tier_id(is_expanded ? null : tier.tier_id)}
                    className="p-1.5 text-text-tertiary transition-colors hover:text-primary"
                    title={is_expanded ? "Collapse" : "Expand"}
                  >
                    {is_expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  <button
                    className="p-1.5 text-text-tertiary transition-colors hover:text-status-error"
                    title="Remove Tier"
                    onClick={() => on_tier_remove(tier.tier_id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Config Fields */}
              <div className="flex flex-col gap-4 p-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-text-secondary">
                      Price ({base_currency.split(" ")[0]})
                    </label>
                    <input
                      type="number"
                      value={tier.price}
                      onChange={(e) =>
                        on_tier_update(tier.tier_id, { price: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full rounded-lg border border-border-subtle bg-surface-container-lowest px-3 py-2 text-sm text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-text-secondary">
                      Quota (Max Tickets)
                    </label>
                    <input
                      type="number"
                      value={tier.quota}
                      onChange={(e) =>
                        on_tier_update(tier.tier_id, { quota: parseInt(e.target.value) || 0 })
                      }
                      min={0}
                      className="w-full rounded-lg border border-border-subtle bg-surface-container-lowest px-3 py-2 text-sm text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                {/* Expandable Description */}
                {is_expanded && (
                  <div className="flex flex-col gap-1.5 animate-in slide-in-from-top-2 duration-200">
                    <label className="text-xs font-medium text-text-secondary">
                      Description / Benefits
                    </label>
                    <textarea
                      value={tier.description || ""}
                      onChange={(e) => on_tier_update(tier.tier_id, { description: e.target.value })}
                      placeholder="e.g. Includes meet & greet, backstage access, exclusive merchandise..."
                      rows={3}
                      className="w-full resize-none rounded-lg border border-border-subtle bg-surface-container-lowest px-3 py-2 text-sm text-primary placeholder:text-text-tertiary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}

        <button 
          className="group flex items-center justify-center gap-2 rounded-xl border border-dashed border-border-strong bg-surface-container-lowest py-4 text-sm font-medium text-text-secondary transition-all hover:border-primary hover:bg-primary/5 hover:text-primary"
          onClick={() => on_tier_add({
            tier_id: `tier_${Date.now()}`,
            name: "New Ticket Tier",
            price: 100000,
            color: "#64748b",
            quota: 0,
            description: "",
          })}
        >
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-container group-hover:bg-primary/10">
            <Plus size={14} className="text-text-secondary group-hover:text-primary" />
          </div>
          Add New Pricing Tier
        </button>
      </div>

      {/* Fixed Bottom Actions */}
      <div className="absolute bottom-0 right-0 z-20 flex w-full gap-4 border-t border-border-subtle bg-surface-white/90 p-6 backdrop-blur-md">
        <button
          type="button"
          onClick={on_save_draft}
          className="flex-1 rounded-lg border border-border-subtle bg-surface-white py-3 text-base font-semibold text-primary transition-colors hover:bg-surface-container-low"
        >
          Save Draft
        </button>
        <button
          type="button"
          onClick={handle_publish}
          className="flex flex-[2] items-center justify-center gap-2 rounded-lg bg-primary py-3 text-base font-semibold text-on-primary shadow-lg transition-transform duration-200 hover:scale-[0.98]"
        >
          <Rocket size={16} />
          Publish Event
        </button>
      </div>

      {/* Validation Error Modal */}
      {show_validation_modal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="mx-6 w-full max-w-sm rounded-2xl border border-border-subtle bg-surface-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100">
                  <AlertTriangle size={16} className="text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-primary">Cannot Publish</h3>
              </div>
              <button
                onClick={() => set_show_validation_modal(false)}
                className="rounded-full p-1.5 text-text-secondary transition-colors hover:bg-surface-container-low hover:text-primary"
              >
                <X size={16} />
              </button>
            </div>
            <p className="mb-4 text-sm text-text-secondary">
              Please fix the following issues before publishing:
            </p>
            <div className="flex max-h-48 flex-col gap-2 overflow-y-auto">
              {validation_errors.map((err, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2"
                >
                  <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                  <span className="text-xs font-medium text-red-700">{err.message}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => set_show_validation_modal(false)}
              className="mt-5 w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-on-primary transition-transform hover:scale-[0.98]"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
