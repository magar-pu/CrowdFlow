"use client";

/**
 * app/events/[event_id]/seats/page.tsx
 *
 * Interactive Seat Selection page — pannable/zoomable venue map (VIP
 * blocks + general admission grid), a right-side panel with the active
 * section's seat grid, and a sticky checkout summary bar. Matches the
 * seat_selection Stitch screen end-to-end.
 *
 * All interactive state lives in lib/hooks/useSeatMap.ts, a direct port
 * of the screen's original Alpine.js x-data object.
 *
 * Currently reads from mockEvent + mockSeatSections regardless of the
 * [event_id] param. Next.js 16 passes `params` as a Promise — swap in
 * `use(params)` or a Server Component wrapper once this reads real data.
 */

import { useRouter } from "next/navigation";
import { SeatMapHeader } from "@/components/seat-selection/SeatMapHeader";
import { MapControls } from "@/components/seat-selection/MapControls";
import { MapLegend } from "@/components/seat-selection/MapLegend";
import { VenueMapCanvas } from "@/components/seat-selection/VenueMapCanvas";
import { SeatSelectionPanel } from "@/components/seat-selection/SeatSelectionPanel";
import { CheckoutSummaryBar } from "@/components/seat-selection/CheckoutSummaryBar";
import { useSeatMap } from "@/lib/hooks/useSeatMap";
import { mockEvent, mockSeatSections, mockTicketCategoryById } from "@/mock/eventData";

const MAX_SEATS_PER_TRANSACTION = 4;

export default function SeatSelectionPage() {
  const router = useRouter();
  const event = mockEvent; // TODO: replace with getEvent(event_id) once the Go API exists

  const vip_sections = mockSeatSections.filter((s) =>
    s.label.startsWith("VIP")
  );
  const ga_sections = mockSeatSections.filter((s) => s.label.startsWith("Sec"));

  function get_sold_seat_codes(section_id: string): string[] {
    return (
      mockSeatSections.find((s) => s.section_id === section_id)
        ?.sold_seat_codes ?? []
    );
  }

  function get_unit_face_value(section_id: string): number {
    const section = mockSeatSections.find((s) => s.section_id === section_id);
    if (!section) return 0;
    return mockTicketCategoryById[section.ticket_category_id]?.face_value ?? 0;
  }

  const {
    zoom,
    pan_x,
    pan_y,
    active_section_id,
    active_section_label,
    selected_seats,
    subtotal,
    zoom_in,
    zoom_out,
    reset_view,
    start_pan,
    do_pan,
    end_pan,
    handle_wheel_zoom,
    select_section,
    is_seat_sold,
    is_seat_selected,
    toggle_seat,
    remove_seat,
  } = useSeatMap({
    max_seats: MAX_SEATS_PER_TRANSACTION,
    get_sold_seat_codes,
    get_unit_face_value,
  });

  const active_section =
    mockSeatSections.find((s) => s.section_id === active_section_id) ?? null;
  const active_unit_face_value = active_section_id
    ? get_unit_face_value(active_section_id)
    : 0;

  function handle_proceed() {
    // Next step: pass selected_seats into the checkout flow. For now we
    // jump to the checkout mock with the event id; cart wiring happens once
    // Zustand's cart store is connected here.
    router.push(`/checkout/${event.event_id}`);
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-surface">
      <SeatMapHeader
        event_title={event.title}
        event_subtitle={`${new Date(event.starts_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} • ${event.venue.name}`}
        time_remaining_label="14:59 remaining"
        on_close={() => router.push(`/events/${event.event_id}`)}
      />

      <main className="relative flex flex-1 overflow-hidden">
        <VenueMapCanvas
          vip_sections={vip_sections}
          ga_sections={ga_sections}
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

        <MapControls
          on_zoom_in={zoom_in}
          on_zoom_out={zoom_out}
          on_reset={reset_view}
        />
        <MapLegend />

        {/* Right sidebar panel */}
        <aside className="z-20 flex w-[400px] shrink-0 flex-col border-l border-border-subtle bg-surface-white shadow-[-4px_0_24px_rgba(0,0,0,0.02)]">
          <SeatSelectionPanel
            active_section={active_section}
            unit_face_value={active_unit_face_value}
            is_seat_sold={is_seat_sold}
            is_seat_selected={is_seat_selected}
            on_toggle_seat={toggle_seat}
          />
          <CheckoutSummaryBar
            selected_seats={selected_seats}
            max_seats={MAX_SEATS_PER_TRANSACTION}
            subtotal={subtotal}
            on_remove_seat={remove_seat}
            on_proceed={handle_proceed}
          />
        </aside>
      </main>
    </div>
  );
}