/**
 * components/venue-editor/SeatArrangePanel.tsx
 *
 * Right panel shown while several seats are selected. Edits the seat count
 * and re-flows the selection into a grid / arc / diagonal / ellipse, with
 * per-axis gaps and curvature.
 *
 * Replaces the floating selection toolbar that used to sit over the canvas.
 */

"use client";

import { useEffect, useState } from "react";
import { Square, Circle, Triangle, Scan, Trash2 } from "lucide-react";
import type { SeatArrangeForm } from "@/types/ticket";
import { useVenueEditorStore } from "@/lib/store/venueEditorStore";
import { cn } from "@/lib/utils";

const FORMS: { form: SeatArrangeForm; label: string; icon: typeof Square }[] = [
  { form: "grid", label: "Grid", icon: Square },
  { form: "arc", label: "Arc", icon: Scan },
  { form: "diagonal", label: "Diagonal", icon: Triangle },
  { form: "ellipse", label: "Ellipse", icon: Circle },
];

export function SeatArrangePanel() {
  const {
    seats,
    multi_selected_seat_ids,
    set_multi_selected_seats,
    delete_multiple_seats,
    resize_seat_selection,
    arrange,
    arrange_bounds,
    set_arrange,
    apply_arrange,
    save_history,
    pricing_tiers,
    paint_seats,
    base_currency,
  } = useVenueEditorStore();

  const count = multi_selected_seat_ids.length;
  const [count_draft, set_count_draft] = useState(String(count));

  useEffect(() => {
    set_count_draft(String(count));
  }, [count]);

  if (count < 2) return null;

  const selected = seats.filter((s) => multi_selected_seat_ids.includes(s.seat_id));
  const has_locked = selected.some((s) => s.is_locked);
  const untagged = selected.filter((s) => !s.tier_id).length;

  /** Apply a new seat count, then re-flow into the same frame. */
  const commit_count = () => {
    const wanted = Number(count_draft);
    if (!Number.isFinite(wanted) || wanted < 1) {
      set_count_draft(String(count));
      return;
    }
    if (wanted === count) return;

    const next_ids = resize_seat_selection(multi_selected_seat_ids, wanted);
    set_multi_selected_seats(next_ids);

    const cols = Math.max(1, Math.min(arrange.cols, next_ids.length));
    const rows = Math.max(1, Math.ceil(next_ids.length / cols));
    set_arrange({ rows, cols });
    // The store reads the *current* selection, so defer past this render.
    requestAnimationFrame(() => apply_arrange({ rows, cols }, false));
  };

  /** Rows and cols are two views of one number — keep them consistent. */
  const commit_rows = (value: number) => {
    const rows = Math.max(1, Math.min(value || 1, count));
    const cols = Math.max(1, Math.ceil(count / rows));
    set_arrange({ rows, cols });
    apply_arrange({ rows, cols }, false);
  };
  const commit_cols = (value: number) => {
    const cols = Math.max(1, Math.min(value || 1, count));
    const rows = Math.max(1, Math.ceil(count / cols));
    set_arrange({ rows, cols });
    apply_arrange({ rows, cols }, false);
  };

  const disabled = has_locked || !arrange_bounds;

  return (
    <aside className="z-30 flex h-full w-80 shrink-0 flex-col overflow-y-auto border-l border-border-subtle bg-surface-white shadow-[-4px_0_24px_rgba(15,23,42,0.02)]">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-border-subtle bg-surface-bright p-5">
        <h3 className="text-base font-semibold text-primary">Selection</h3>
        <p className="mt-0.5 text-xs font-medium text-text-secondary">
          {count} seats selected
          {has_locked && " — contains locked seats"}
        </p>
      </div>

      <div className="flex flex-col gap-6 p-5">
        {/* Seat count */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-on-surface-variant">Seat count</label>
          <input
            type="number"
            min={1}
            value={count_draft}
            disabled={disabled}
            onChange={(e) => set_count_draft(e.target.value)}
            onBlur={commit_count}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              if (e.key === "Escape") {
                set_count_draft(String(count));
                (e.target as HTMLInputElement).blur();
              }
            }}
            className="w-full rounded-lg border border-border-subtle bg-surface-white px-3 py-2.5 text-sm font-medium text-primary shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
          />
          <p className="text-[11px] text-text-secondary">
            Reducing removes seats from the end of the flow. Press Enter to apply.
          </p>
        </div>

        {/* Ticket tier — apply one of the existing tiers to the whole selection */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-on-surface-variant">Ticket tier</label>

          {pricing_tiers.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border-subtle px-3 py-3 text-[11px] text-text-secondary">
              No pricing tiers yet. Add one in the Ticket Pricing tool first.
            </p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {pricing_tiers.map((tier) => {
                const in_tier = selected.filter((s) => s.tier_id === tier.tier_id).length;
                const all = in_tier === selected.length;
                return (
                  <button
                    key={tier.tier_id}
                    type="button"
                    onClick={() => paint_seats(multi_selected_seat_ids, tier.tier_id)}
                    className={cn(
                      "flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors",
                      all
                        ? "border-primary bg-surface-container-low"
                        : "border-border-subtle hover:bg-surface-container-low"
                    )}
                  >
                    <span
                      className="h-4 w-4 shrink-0 rounded-full ring-1 ring-black/10"
                      style={{ backgroundColor: tier.color }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-semibold text-primary">
                        {tier.name}
                      </span>
                      <span className="block text-[11px] text-text-secondary">
                        {base_currency} {tier.price.toLocaleString()}
                      </span>
                    </span>
                    {in_tier > 0 && (
                      <span className="shrink-0 text-[10px] font-medium text-text-secondary">
                        {all ? "all" : `${in_tier}/${selected.length}`}
                      </span>
                    )}
                  </button>
                );
              })}

              {untagged > 0 && (
                <p className="text-[11px] text-warning">
                  {untagged} of {selected.length} seats still have no tier — required before publish.
                </p>
              )}

              <button
                type="button"
                onClick={() => paint_seats(multi_selected_seat_ids, undefined)}
                className="cursor-pointer rounded-lg border border-border-subtle px-3 py-1.5 text-[11px] font-medium text-text-secondary transition-colors hover:bg-surface-container-low"
              >
                Clear tier from selection
              </button>
            </div>
          )}
        </div>

        {/* Arrangement form */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-on-surface-variant">Arrangement</label>
          <div className="grid grid-cols-4 gap-1.5">
            {FORMS.map(({ form, label, icon: Icon }) => (
              <button
                key={form}
                type="button"
                title={label}
                disabled={disabled}
                onClick={() => {
                  set_arrange({ form });
                  apply_arrange({ form });
                }}
                className={cn(
                  "flex cursor-pointer flex-col items-center gap-1 rounded-lg border px-2 py-2.5 text-[10px] font-medium transition-colors disabled:opacity-50",
                  arrange.form === form
                    ? "border-primary bg-primary text-on-primary"
                    : "border-border-subtle bg-surface-white text-text-secondary hover:bg-surface-container-low"
                )}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Rows × Columns */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-on-surface-variant">Rows × Columns</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={count}
              value={arrange.rows}
              disabled={disabled}
              onChange={(e) => commit_rows(Number(e.target.value))}
              onBlur={() => save_history()}
              className="w-full rounded-lg border border-border-subtle bg-surface-white px-3 py-2 text-sm text-primary shadow-sm focus:border-primary focus:outline-none disabled:opacity-50"
            />
            <span className="text-xs text-text-secondary">×</span>
            <input
              type="number"
              min={1}
              max={count}
              value={arrange.cols}
              disabled={disabled}
              onChange={(e) => commit_cols(Number(e.target.value))}
              onBlur={() => save_history()}
              className="w-full rounded-lg border border-border-subtle bg-surface-white px-3 py-2 text-sm text-primary shadow-sm focus:border-primary focus:outline-none disabled:opacity-50"
            />
          </div>
          <p className="text-[11px] text-text-secondary">
            Linked to the seat count — changing one recalculates the other.
          </p>
        </div>

        {/* Gaps — meaningless for the ellipse perimeter */}
        {arrange.form !== "ellipse" && (
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-on-surface-variant">
              Gap (0 = fit to selection)
            </label>
            <div className="flex items-center gap-2">
              {([
                { key: "gap_x" as const, glyph: "↔", value: arrange.gap_x },
                { key: "gap_y" as const, glyph: "↕", value: arrange.gap_y },
              ]).map(({ key, glyph, value }) => (
                <div key={key} className="flex flex-1 items-center gap-1.5">
                  <span className="text-xs text-text-secondary">{glyph}</span>
                  <input
                    type="number"
                    min={0}
                    max={200}
                    value={value}
                    disabled={disabled}
                    onChange={(e) => {
                      const val = Math.max(0, Number(e.target.value) || 0);
                      set_arrange({ [key]: val });
                      apply_arrange({ [key]: val }, false);
                    }}
                    onBlur={() => save_history()}
                    className="w-full rounded-lg border border-border-subtle bg-surface-white px-3 py-2 text-sm text-primary shadow-sm focus:border-primary focus:outline-none disabled:opacity-50"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Arc / skew, one slider per axis */}
        {(arrange.form === "arc" || arrange.form === "diagonal") && (
          <div className="flex flex-col gap-3">
            <label className="text-xs font-medium text-on-surface-variant">
              {arrange.form === "arc" ? "Arc" : "Skew"}
            </label>
            {([
              {
                key: "amount_x" as const,
                value: arrange.amount_x,
                label: arrange.form === "arc" ? "Horizontal — bows rows" : "Horizontal — shears rows",
              },
              {
                key: "amount_y" as const,
                value: arrange.amount_y,
                label: arrange.form === "arc" ? "Vertical — bows columns" : "Vertical — shears columns",
              },
            ]).map(({ key, value, label }) => (
              <div key={key} className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-text-secondary">{label}</span>
                  <span className="text-[11px] font-medium text-primary">{value}</span>
                </div>
                <input
                  type="range"
                  min={-100}
                  max={100}
                  step={5}
                  value={value}
                  disabled={disabled}
                  title="Double click to reset"
                  onDoubleClick={() => {
                    set_arrange({ [key]: 0 });
                    apply_arrange({ [key]: 0 });
                  }}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    set_arrange({ [key]: val });
                    apply_arrange({ [key]: val }, false);
                  }}
                  onPointerUp={() => save_history()}
                  className="w-full accent-primary disabled:opacity-50"
                />
              </div>
            ))}
          </div>
        )}

        {/* Destructive action, kept last */}
        {!has_locked && (
          <button
            type="button"
            onClick={() => delete_multiple_seats(multi_selected_seat_ids)}
            className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-red-200 px-3 py-2.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50"
          >
            <Trash2 size={14} /> Delete {count} seats
          </button>
        )}
      </div>
    </aside>
  );
}
