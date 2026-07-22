/**
 * components/event-detail/VenueLayoutPreview.tsx
 *
 * The real venue layout on the buyer's event page: the same LayoutPreview the
 * organizer designs with, fed by the public seat map, plus a legend of the
 * tiers actually on sale for this event.
 *
 * Read-only on purpose. It answers "where would I be sitting and what does it
 * cost"; picking a seat happens on the seat selection screen behind the CTA.
 * That is why no `on_seat_click` is passed — omitting it leaves the seats
 * rendered but neither clickable nor focusable.
 */

"use client";

import Link from "next/link";
import { useMemo } from "react";
// Aliased: an unqualified `Map` here would shadow the global Map constructor
// used to build the seat-colour lookup below.
import { Map as MapIcon, Ticket } from "lucide-react";
import { LayoutPreview } from "@/components/venue-editor/LayoutPreview";
import { useEventSeatMap } from "@/lib/hooks/useEventSeatMap";
import { seatMapToRenderableLayout } from "@/lib/api/booking";
import { tierColor } from "@/lib/tierColors";
import { formatIDR } from "@/lib/pricing";

interface VenueLayoutPreviewProps {
  event_id: string;
}

/** Shared chrome so every state keeps the heading and the same box metrics. */
function PreviewFrame({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-3 font-label-md text-label-md font-bold text-text-primary">
        Venue Layout Preview
      </h3>
      {children}
    </div>
  );
}

export function VenueLayoutPreview({ event_id }: VenueLayoutPreviewProps) {
  const { seat_map, loading, error } = useEventSeatMap(event_id);

  const renderable = useMemo(
    () => (seat_map ? seatMapToRenderableLayout(seat_map) : null),
    [seat_map]
  );

  // Tiers arrive price-ascending, so a tier's index is a stable palette slot.
  const seat_colors = useMemo(() => {
    const colors = new Map<number, string>();
    seat_map?.tiers.forEach((tier, i) => {
      const color = tierColor(tier.color, i);
      tier.seats.forEach((seat) => colors.set(seat.seat_id, color));
    });
    return colors;
  }, [seat_map]);

  if (loading) {
    return (
      <PreviewFrame>
        <div className="h-[260px] animate-pulse rounded-xl border border-border-subtle bg-surface-container-low sm:h-[320px]" />
      </PreviewFrame>
    );
  }

  // A failed request must not take the venue section down with it.
  if (error) {
    return (
      <PreviewFrame>
        <div className="flex h-[160px] items-center justify-center rounded-xl border border-border-subtle bg-surface-container-low">
          <p className="font-body-sm text-body-sm text-text-secondary">{error}</p>
        </div>
      </PreviewFrame>
    );
  }

  // No layout bound: the event is general admission, which is a legitimate
  // configuration rather than a failure — so say so instead of drawing an
  // empty canvas.
  if (!renderable) {
    const ga_tiers = seat_map?.ga_tiers ?? [];
    return (
      <PreviewFrame>
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border-subtle bg-surface-container-low px-6 py-10 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary/10">
            <Ticket size={20} className="text-secondary" />
          </div>
          <p className="font-label-md text-label-md font-bold text-text-primary">
            Tiket bebas pilih tempat
          </p>
          <p className="max-w-sm font-body-sm text-body-sm text-text-secondary">
            {ga_tiers.length > 0
              ? "Event ini tidak menggunakan nomor kursi. Pilih jumlah tiket saat checkout."
              : "Denah kursi untuk event ini belum tersedia."}
          </p>
        </div>
      </PreviewFrame>
    );
  }

  const tiers = seat_map?.tiers ?? [];
  const seat_count = renderable.seats.length;

  return (
    <PreviewFrame>
      <div className="overflow-hidden rounded-xl border border-border-subtle bg-surface-container-low">
        <div className="h-[260px] w-full sm:h-[320px]">
          <LayoutPreview detail={renderable} seat_colors={seat_colors} />
        </div>

        {tiers.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border-subtle bg-white px-4 py-3">
            {tiers.map((tier, i) => (
              <span key={tier.ticket_tier_id} className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: tierColor(tier.color, i) }}
                />
                <span className="font-label-sm text-label-sm text-text-primary">
                  {tier.name}
                </span>
                <span className="font-label-sm text-label-sm text-text-secondary">
                  {formatIDR(tier.price)}
                </span>
              </span>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle bg-white px-4 py-3">
          <p className="font-label-sm text-label-sm text-text-secondary">
            {seat_count > 0
              ? `${seat_count.toLocaleString("id-ID")} kursi tersedia di denah`
              : "Denah venue"}
          </p>
          <Link
            href={`/events/${event_id}/venue`}
            className="flex items-center gap-2 rounded-xl border border-border-subtle bg-white px-4 py-2 font-label-md text-label-md text-text-primary transition-colors hover:bg-surface-container-low"
          >
            <MapIcon size={16} className="text-secondary" />
            View Full Venue Layout
          </Link>
        </div>
      </div>
    </PreviewFrame>
  );
}
