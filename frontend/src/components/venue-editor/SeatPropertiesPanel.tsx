/**
 * components/venue-editor/SeatPropertiesPanel.tsx
 *
 * Right panel for the Seat Mapper mode. Displays editable properties
 * for a selected seat: ID, Row, Number, Status, and Position (X/Y).
 *
 * Matches the right properties panel from venue_map_editor code.html.
 */

"use client";

import { MoreHorizontal } from "lucide-react";
import Select from "@/components/ui/Select";
import type { VenueSeat } from "@/types/ticket";

interface SeatPropertiesPanelProps {
  seat: VenueSeat | null;
  on_update: (seat_id: string, updates: Partial<VenueSeat>) => void;
}

export function SeatPropertiesPanel({ seat, on_update }: SeatPropertiesPanelProps) {
  if (!seat) {
    return null;
  }

  return (
    <aside className="z-30 flex h-full w-80 shrink-0 flex-col overflow-y-auto border-l border-border-subtle bg-surface-white shadow-[-4px_0_24px_rgba(15,23,42,0.02)]">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border-subtle bg-surface-bright p-5">
        <div>
          <h3 className="text-base font-semibold text-primary">Seat Properties</h3>
          <p className="mt-0.5 text-xs font-medium text-text-secondary">
            Edit individual seat
          </p>
        </div>
        <button
          type="button"
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-surface-container-low text-primary transition-colors hover:bg-surface-variant"
        >
          <MoreHorizontal size={16} />
        </button>
      </div>

      {/* Form */}
      <div className="flex flex-col gap-6 p-5">
        {/* Identity */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-on-surface-variant">
              Seat ID
            </label>
            <input
              type="text"
              value={seat.seat_id.split("-").slice(1).join("-")}
              onChange={(e) =>
                on_update(seat.seat_id, {
                  /* seat_id is derived, usually not directly editable */
                })
              }
              className="w-full rounded-lg border border-border-subtle bg-surface-white px-3 py-2.5 text-sm font-medium text-primary shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-on-surface-variant">
                Row
              </label>
              <input
                type="text"
                value={seat.row}
                onChange={(e) =>
                  on_update(seat.seat_id, { row: e.target.value })
                }
                className="w-full rounded-lg border border-border-subtle bg-surface-white px-3 py-2.5 text-sm text-primary shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-on-surface-variant">
                Number
              </label>
              <input
                type="number"
                value={seat.number}
                onChange={(e) =>
                  on_update(seat.seat_id, {
                    number: parseInt(e.target.value) || 0,
                  })
                }
                className="w-full rounded-lg border border-border-subtle bg-surface-white px-3 py-2.5 text-sm text-primary shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-on-surface-variant">
              Status
            </label>
            <Select
              selectSize="md"
              value={seat.status}
              onChange={(e) =>
                on_update(seat.seat_id, {
                  status: e.target.value as VenueSeat["status"],
                })
              }
            >
              <option value="available">Available</option>
              <option value="unavailable">Unavailable</option>
              <option value="accessible">Accessible</option>
            </Select>
          </div>
        </div>

        <div className="h-px w-full bg-border-subtle" />

        {/* Position */}
        <div className="flex flex-col gap-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-primary">
            Position
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-on-surface-variant">
                X Position (px)
              </label>
              <input
                type="number"
                value={seat.x}
                onChange={(e) =>
                  on_update(seat.seat_id, {
                    x: parseInt(e.target.value) || 0,
                  })
                }
                className="w-full rounded-lg border border-border-subtle bg-surface-white px-3 py-2.5 text-sm text-primary shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-on-surface-variant">
                Y Position (px)
              </label>
              <input
                type="number"
                value={seat.y}
                onChange={(e) =>
                  on_update(seat.seat_id, {
                    y: parseInt(e.target.value) || 0,
                  })
                }
                className="w-full rounded-lg border border-border-subtle bg-surface-white px-3 py-2.5 text-sm text-primary shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
