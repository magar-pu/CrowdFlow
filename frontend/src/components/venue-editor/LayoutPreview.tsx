/**
 * components/venue-editor/LayoutPreview.tsx
 *
 * Store-free render of a venue layout: the stage, section shapes, and seat
 * dots, auto-fit into an SVG viewBox. Used in two places, and deliberately the
 * same component in both so buyers see exactly the map the organizer designed:
 *
 *   - organizer workspace  — read-only, no optional props
 *   - attendee seat map    — pass seat_states / selected_seat_ids /
 *                            on_seat_click / transform to make it interactive
 *
 * Every interactive prop is optional; omitting them all preserves the original
 * read-only behaviour exactly (seats coloured by section, nothing clickable).
 */

"use client";

import { useMemo } from "react";
import { zonesOf, type RenderableLayout } from "@/lib/api/venueLayouts";
import type { SeatStatus } from "@/lib/api/booking";
import type { VenueShape } from "@/types/ticket";

interface LayoutPreviewProps {
  detail: RenderableLayout;
  className?: string;
  /** Seat id -> live availability. Absent = colour seats by section instead. */
  seat_states?: Map<number, SeatStatus>;
  /** Seat ids currently chosen by the buyer. */
  selected_seat_ids?: Set<number>;
  /**
   * Seat id -> fill colour, normally the colour of the ticket tier the seat is
   * painted with. Absent on an untiered template, which renders neutral.
   */
  seat_colors?: Map<number, string>;
  /** Makes available seats clickable and keyboard-focusable. */
  on_seat_click?: (seat_id: number) => void;
  /**
   * Restricts clicking to these seats, on top of the status rules. The buyer's
   * map passes the active tier's seats, because a hold covers exactly one tier
   * — seats outside it stay visible for context but inert. Omit to allow every
   * seat the status rules permit.
   */
  selectable_seat_ids?: Set<number>;
  /** Pan/zoom from useSeatSelection, applied as a single group transform. */
  transform?: { zoom: number; pan_x: number; pan_y: number };
}

const SEAT_RADIUS = 6;
const PADDING = 40;
const FALLBACK_SEAT_COLOR = "#94a3b8";

/** Seat fill by live state, used when no tier colour applies. */
const SEAT_COLOR: Record<SeatStatus, string> = {
  available: "#22c55e",
  sold: "#cbd5e1",
  held: "#f59e0b",
  blocked: "#94a3b8",
};

/**
 * Selection is drawn as a RING, not a fill.
 *
 * It used to replace the fill with #2563eb — which is byte-identical to
 * TIER_PALETTE[0], so the cheapest tier's seats looked permanently selected and
 * a genuinely selected seat in that tier looked like nothing had happened.
 * Overriding the fill also hid which tier a seat belonged to, and a selection
 * can now span tiers, so that information matters while choosing.
 *
 * The white halo sits between the seat and the dark ring so the ring reads
 * against every palette colour and against the map background.
 */
const SELECTED_RING = "#0f172a";
const SELECTED_RING_HALO = "#ffffff";
const SELECTED_RING_WIDTH = 2;

/** Narrow an unknown JSONB value to a VenueShape when it has usable geometry. */
function asShape(value: unknown): VenueShape | null {
  if (!value || typeof value !== "object") return null;
  const o = value as Record<string, unknown>;
  if (
    typeof o.x !== "number" ||
    typeof o.y !== "number" ||
    typeof o.width !== "number" ||
    typeof o.height !== "number"
  ) {
    return null;
  }
  return o as unknown as VenueShape;
}

export function LayoutPreview({
  detail,
  className,
  seat_states,
  selected_seat_ids,
  seat_colors,
  on_seat_click,
  selectable_seat_ids,
  transform,
}: LayoutPreviewProps) {
  const model = useMemo(() => {
    const stage = asShape((detail.geometry as Record<string, unknown>)?.stage);
    // Zones are decoration living in the geometry blob, not rows.
    const zones = zonesOf(detail.geometry)
      .map((z) => ({ ...z, shapeGeom: asShape(z.shape) }))
      .filter((z) => z.shapeGeom);
    const seats = detail.seats.filter(
      (s) => typeof s.pos_x === "number" && typeof s.pos_y === "number"
    );

    // Bounding box over every drawable element so the viewBox auto-fits.
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    const grow = (x: number, y: number, w = 0, h = 0) => {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + w);
      maxY = Math.max(maxY, y + h);
    };
    if (stage) grow(stage.x, stage.y, stage.width, stage.height);
    zones.forEach((z) => grow(z.shapeGeom!.x, z.shapeGeom!.y, z.shapeGeom!.width, z.shapeGeom!.height));
    seats.forEach((s) => grow(s.pos_x! - SEAT_RADIUS, s.pos_y! - SEAT_RADIUS, SEAT_RADIUS * 2, SEAT_RADIUS * 2));

    const isEmpty = !isFinite(minX);
    const viewBox = isEmpty
      ? "0 0 100 100"
      : `${minX - PADDING} ${minY - PADDING} ${maxX - minX + PADDING * 2} ${maxY - minY + PADDING * 2}`;

    return { stage, zones, seats, viewBox, isEmpty };
  }, [detail]);

  if (model.isEmpty) {
    return (
      <div className={`flex items-center justify-center ${className ?? ""}`}>
        <p className="text-xs font-mono text-text-secondary">This layout has no geometry to preview.</p>
      </div>
    );
  }

  const isInteractive = on_seat_click != null;
  // useSeatSelection owns the clamping; this only applies the result.
  const groupTransform = transform
    ? `translate(${transform.pan_x} ${transform.pan_y}) scale(${transform.zoom})`
    : undefined;

  return (
    <svg
      viewBox={model.viewBox}
      preserveAspectRatio="xMidYMid meet"
      className={`h-full w-full ${className ?? ""}`}
      role={isInteractive ? "group" : "img"}
      aria-label={detail.name ? `Seat map for ${detail.name}` : "Seat map"}
    >
      <g transform={groupTransform}>
      {/* Stage */}
      {model.stage && (
        <g>
          <rect
            x={model.stage.x}
            y={model.stage.y}
            width={model.stage.width}
            height={model.stage.height}
            rx={8}
            fill="#0f172a"
          />
          <text
            x={model.stage.x + model.stage.width / 2}
            y={model.stage.y + model.stage.height / 2}
            fill="#ffffff"
            fontSize={Math.min(model.stage.height * 0.4, 22)}
            fontWeight="700"
            textAnchor="middle"
            dominantBaseline="central"
            letterSpacing="2"
          >
            STAGE
          </text>
        </g>
      )}

      {/* Decorative zone outlines */}
      {model.zones.map((s, i) => {
        const shape = s.shapeGeom!;
        const color = s.color ?? FALLBACK_SEAT_COLOR;
        const cx = shape.x + shape.width / 2;
        const isEllipse = shape.type === "ellipse";
        return (
          <g key={`zone-${i}-${s.name}`}>
            {isEllipse ? (
              <ellipse
                cx={cx}
                cy={shape.y + shape.height / 2}
                rx={shape.width / 2}
                ry={shape.height / 2}
                fill={`${color}22`}
                stroke={`${color}88`}
                strokeWidth={2}
              />
            ) : (
              <rect
                x={shape.x}
                y={shape.y}
                width={shape.width}
                height={shape.height}
                rx={shape.type === "rounded-rectangle" ? 20 : 6}
                fill={`${color}22`}
                stroke={`${color}88`}
                strokeWidth={2}
              />
            )}
            <text
              x={cx}
              y={shape.y - 6}
              fill={color}
              fontSize={14}
              fontWeight="700"
              textAnchor="middle"
            >
              {s.name}
            </text>
          </g>
        );
      })}

      {/* Seats */}
      {model.seats.map((seat) => {
        const status = seat_states?.get(seat.id);
        const isSelected = selected_seat_ids?.has(seat.id) ?? false;
        // Committed states are off limits; everything else can be acted on.
        // A seat with NO state yet is selectable on purpose — that is an
        // unpainted seat in the organizer's editor, which must be clickable to
        // get its first tier. Buyer seats always carry a status, so requiring
        // "available" there is unchanged.
        const inSelectableSet = selectable_seat_ids?.has(seat.id) ?? true;
        const isSelectable =
          isInteractive &&
          inSelectableSet &&
          status !== "sold" &&
          status !== "blocked" &&
          status !== "held";

        // Precedence: the tier's colour, then live status, then neutral. An
        // untiered template hits the neutral branch, which is what a plain
        // reusable layout should look like. Selection no longer participates —
        // it is a ring drawn on top, so a selected seat keeps showing which
        // tier it belongs to.
        let fill: string;
        if (seat_colors?.get(seat.id)) {
          fill = seat_colors.get(seat.id)!;
        } else if (status) {
          fill = SEAT_COLOR[status];
        } else {
          fill = FALLBACK_SEAT_COLOR;
        }

        return (
          <g key={`seat-${seat.id}`}>
            {/* Halo first so the ring below draws over it. pointerEvents off:
                these are decoration and must not eat the seat's own clicks. */}
            {isSelected && (
              <circle
                cx={seat.pos_x!}
                cy={seat.pos_y!}
                r={SEAT_RADIUS + SELECTED_RING_WIDTH}
                fill="none"
                stroke={SELECTED_RING_HALO}
                strokeWidth={SELECTED_RING_WIDTH + 1}
                pointerEvents="none"
              />
            )}
            <circle
              cx={seat.pos_x!}
              cy={seat.pos_y!}
              r={SEAT_RADIUS}
              fill={fill}
              stroke={isSelected ? SELECTED_RING : undefined}
              strokeWidth={isSelected ? SELECTED_RING_WIDTH : undefined}
              className={isSelectable ? "cursor-pointer" : undefined}
              // Sold/held/blocked seats stay visible but inert.
              style={isInteractive && !isSelectable && !isSelected ? { opacity: 0.55 } : undefined}
              role={isSelectable ? "button" : undefined}
              tabIndex={isSelectable ? 0 : undefined}
              aria-pressed={isSelectable ? isSelected : undefined}
              aria-label={
                isInteractive
                  ? `Row ${seat.row} seat ${seat.number}${status ? `, ${status}` : ""}`
                  : undefined
              }
              onClick={isSelectable ? () => on_seat_click!(seat.id) : undefined}
              onKeyDown={
                isSelectable
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        on_seat_click!(seat.id);
                      }
                    }
                  : undefined
              }
            />
          </g>
        );
      })}
      </g>
    </svg>
  );
}
