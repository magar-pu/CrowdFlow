"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SeatMapHeader } from "@/components/seat-selection/SeatMapHeader";
import { TicketTypeSelector } from "@/components/seat-selection/TicketTypeSelector";
import { MapLegend } from "@/components/seat-selection/MapLegend";
import { MapBottomToolbar } from "@/components/seat-selection/MapBottomToolbar";
import { VenueMapCanvas } from "@/components/seat-selection/VenueMapCanvas";
import { SelectionPanel } from "@/components/seat-selection/SelectionPanel";
import { useSeatMap } from "@/lib/hooks/useSeatMap";
import { mockEvent, mockSeatSections, mockTicketCategoryById } from "@/mock/eventData";
import { cn } from "@/lib/utils";

const MAX_SEATS = 7;

const TICKET_TYPE_PRICES: Record<string, number> = {
  vip: 2_750_000,
  vip_c: 2_750_000,
  vip_r: 2_750_000,
  gold: 1_450_000,
  ga: 850_000,
};

const TICKET_TYPE_LABELS: Record<string, string> = {
  vip: "VIP",
  vip_c: "VIP C",
  vip_r: "VIP R",
  gold: "Gold",
  ga: "GA",
};

export default function SeatSelectionPage() {
  const router = useRouter();
  const event = mockEvent;
  const [active_ticket_type, set_active_ticket_type] = useState("vip");

  function get_sold_seat_codes(section_id: string): string[] {
    return mockSeatSections.find((s) => s.section_id === section_id)?.sold_seat_codes ?? [];
  }

  function get_unit_face_value(section_id: string): number {
    const section = mockSeatSections.find((s) => s.section_id === section_id);
    if (!section) return TICKET_TYPE_PRICES[active_ticket_type] ?? 0;
    return mockTicketCategoryById[section.ticket_category_id]?.face_value ?? TICKET_TYPE_PRICES[active_ticket_type] ?? 0;
  }

  const {
    zoom, pan_x, pan_y,
    active_section_id,
    selected_seats, subtotal,
    zoom_in, zoom_out, reset_view,
    start_pan, do_pan, end_pan,
    handle_wheel_zoom,
    select_section,
    is_seat_sold,
    is_seat_selected,
    toggle_seat,
    remove_seat,
  } = useSeatMap({ max_seats: MAX_SEATS, get_sold_seat_codes, get_unit_face_value });

  const active_section = mockSeatSections.find((s) => s.section_id === active_section_id) ?? null;

  const event_date = new Date(event.starts_at).toLocaleDateString("en-US", {
    day: "numeric", month: "long", year: "numeric",
  });
  const event_time = new Date(event.starts_at).toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit", hour12: true,
  });

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#F8F9FA]">
      <SeatMapHeader
        event_title={event.title}
        event_date={event_date}
        event_time={event_time}
        event_venue={event.venue.name}
        initial_seconds={585}
        on_close={() => router.push(`/events/${event.event_id}`)}
      />

      <TicketTypeSelector
        active_type_id={active_ticket_type}
        on_select={set_active_ticket_type}
      />

      <main className="relative flex min-h-0 flex-1 overflow-hidden">
        {/* Map */}
        <div className="relative h-full flex-1">
          <VenueMapCanvas
            active_section_id={active_section_id}
            zoom={zoom}
            pan_x={pan_x}
            pan_y={pan_y}
            on_select_section={select_section}
            on_pan_start={start_pan}
            on_pan_move={do_pan}
            on_pan_end={end_pan}
            on_wheel_zoom={handle_wheel_zoom}
          />
          <MapLegend />
          <MapBottomToolbar on_zoom_in={zoom_in} on_zoom_out={zoom_out} />

          {/* Mobile floating checkout button (appears when panel is closed but seats are selected) */}
          {selected_seats.length > 0 && !active_section_id && (
            <div className="absolute bottom-32 left-4 right-4 z-20 md:hidden">
              <button
                type="button"
                onClick={() => select_section(selected_seats[0].section_id, selected_seats[0].section_label)}
                className="flex w-full items-center justify-between rounded-xl bg-primary px-4 py-3 font-label-md text-white shadow-elevated"
              >
                <span>{selected_seats.length} Seat{selected_seats.length > 1 ? "s" : ""} Selected</span>
                <span>View / Proceed</span>
              </button>
            </div>
          )}
        </div>

        {/* Right panel (Desktop) / Bottom Sheet (Mobile) */}
        <aside className={cn(
          "fixed inset-x-0 bottom-0 z-50 flex h-[85vh] shrink-0 flex-col rounded-t-3xl border-t border-border-subtle bg-white shadow-[0_-8px_30px_rgba(0,0,0,0.12)] transition-transform duration-300",
          "md:static md:h-full md:w-[360px] md:translate-y-0 md:rounded-none md:border-l md:border-t-0 md:shadow-[-4px_0_24px_rgba(0,0,0,0.04)]",
          active_section_id ? "translate-y-0" : "translate-y-full"
        )}>
          {/* Mobile Handle to close panel */}
          <div 
            className="flex w-full cursor-pointer items-center justify-center pt-3 pb-1 md:hidden"
            onClick={() => select_section(null)}
          >
            <div className="h-1.5 w-12 rounded-full bg-border-subtle" />
          </div>

          <SelectionPanel
            selected_ticket_type_label={TICKET_TYPE_LABELS[active_ticket_type] ?? "VIP"}
            selected_ticket_type_price={TICKET_TYPE_PRICES[active_ticket_type] ?? 0}
            active_section={active_section}
            selected_seats={selected_seats}
            subtotal={subtotal}
            is_seat_sold={is_seat_sold}
            is_seat_selected={is_seat_selected}
            on_toggle_seat={toggle_seat}
            on_remove_seat={remove_seat}
            on_proceed={() => router.push(`/checkout/${event.event_id}`)}
          />
        </aside>
      </main>
    </div>
  );
}