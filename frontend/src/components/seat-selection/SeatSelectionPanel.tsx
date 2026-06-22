/**
 * components/seat-selection/SeatSelectionPanel.tsx
 *
 * Right sidebar: shows the active section's seat grid (row letter + N
 * numbered seat buttons), or an empty-state prompt when no section is
 * selected yet. Matches Stitch markup exactly (8px seat buttons, stage
 * direction hint, scrollable seat grid).
 */

import { ArrowUp, Hand } from "lucide-react";
import type { SeatSection } from "@/types/ticket";
import { formatIDR } from "@/lib/pricing";
import { cn } from "@/lib/utils";

interface SeatSelectionPanelProps {
  active_section: SeatSection | null;
  unit_face_value: number;
  is_seat_sold: (section_id: string, row: string, seat_number: number) => boolean;
  is_seat_selected: (
    section_id: string,
    row: string,
    seat_number: number
  ) => boolean;
  on_toggle_seat: (
    section_id: string,
    section_label: string,
    row: string,
    seat_number: number
  ) => void;
}

export function SeatSelectionPanel({
  active_section,
  unit_face_value,
  is_seat_sold,
  is_seat_selected,
  on_toggle_seat,
}: SeatSelectionPanelProps) {
  return (
    <>
      {/* Panel header */}
      <div className="sticky top-0 z-10 border-b border-border-subtle bg-surface-white/90 p-6 backdrop-blur-md">
        <h2 className="mb-1 font-headline-sm text-headline-sm text-primary">
          {active_section ? active_section.label : "Select a Section"}
        </h2>
        {!active_section && (
          <p className="font-body-sm text-body-sm text-text-secondary">
            Click on the map to view available seats.
          </p>
        )}
        {active_section && (
          <p className="font-body-sm text-body-sm text-text-secondary">
            Standard Seating • {formatIDR(unit_face_value)}
          </p>
        )}
      </div>

      {/* Seat grid / empty state */}
      <div className="relative flex-1 overflow-y-auto bg-surface-container-lowest p-6">
        {!active_section && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center opacity-60">
            <Hand size={48} className="mb-4 text-border-subtle" />
            <p className="font-body-md text-body-md text-text-secondary">
              Select a section on the map to begin choosing your seats.
            </p>
          </div>
        )}

        {active_section && active_section.rows.length > 0 && (
          <div className="animate-in fade-in">
            <div className="mb-6 flex items-center justify-between">
              <span className="font-label-md text-label-md text-primary">
                Available Seats
              </span>
              <div className="flex items-center gap-1 font-label-sm text-label-sm text-text-secondary">
                <span>Stage Direction</span>
                <ArrowUp size={16} />
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {active_section.rows.map((row) => (
                <div key={row} className="flex items-center gap-3">
                  <span className="w-4 text-right font-label-sm text-label-sm text-text-secondary">
                    {row}
                  </span>
                  <div className="flex flex-1 gap-1.5">
                    {Array.from(
                      { length: active_section.seats_per_row },
                      (_, i) => i + 1
                    ).map((seat_number) => {
                      const sold = is_seat_sold(
                        active_section.section_id,
                        row,
                        seat_number
                      );
                      const selected = is_seat_selected(
                        active_section.section_id,
                        row,
                        seat_number
                      );
                      return (
                        <button
                          key={seat_number}
                          type="button"
                          disabled={sold}
                          onClick={() =>
                            on_toggle_seat(
                              active_section.section_id,
                              active_section.label,
                              row,
                              seat_number
                            )
                          }
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-md border text-[10px] font-semibold transition-all duration-150",
                            sold &&
                              "cursor-not-allowed border-border-subtle bg-surface-dim text-transparent",
                            !sold &&
                              selected &&
                              "z-10 scale-110 border-tertiary bg-tertiary text-white shadow-md",
                            !sold &&
                              !selected &&
                              "cursor-pointer border-outline-variant bg-surface text-primary hover:border-primary hover:bg-surface-container"
                          )}
                        >
                          <span className={sold ? "opacity-0" : ""}>
                            {seat_number}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}