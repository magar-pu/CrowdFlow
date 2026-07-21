/**
 * components/venue-editor/LayoutPreview.tsx
 *
 * Read-only, store-free render of a persisted venue layout (LayoutDetail): the
 * stage, section shapes, and seat dots, auto-fit into an SVG viewBox. No editor
 * store, no interactivity — safe to drop anywhere a layout needs to be shown
 * (event workspace canvas now; attendee seat maps later).
 */

"use client";

import { useMemo } from "react";
import type { LayoutDetail } from "@/lib/api/venueLayouts";
import type { VenueShape } from "@/types/ticket";

interface LayoutPreviewProps {
  detail: LayoutDetail;
  className?: string;
}

const SEAT_RADIUS = 6;
const PADDING = 40;
const FALLBACK_SEAT_COLOR = "#94a3b8";

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

export function LayoutPreview({ detail, className }: LayoutPreviewProps) {
  const model = useMemo(() => {
    const stage = asShape((detail.geometry as Record<string, unknown>)?.stage);
    const sections = detail.sections
      .map((s) => ({ ...s, shapeGeom: asShape(s.shape) }))
      .filter((s) => s.shapeGeom);
    const seats = detail.seats.filter(
      (s) => typeof s.pos_x === "number" && typeof s.pos_y === "number"
    );

    const sectionColor = new Map<number, string>();
    detail.sections.forEach((s) => sectionColor.set(s.id, s.color ?? FALLBACK_SEAT_COLOR));

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
    sections.forEach((s) => grow(s.shapeGeom!.x, s.shapeGeom!.y, s.shapeGeom!.width, s.shapeGeom!.height));
    seats.forEach((s) => grow(s.pos_x! - SEAT_RADIUS, s.pos_y! - SEAT_RADIUS, SEAT_RADIUS * 2, SEAT_RADIUS * 2));

    const isEmpty = !isFinite(minX);
    const viewBox = isEmpty
      ? "0 0 100 100"
      : `${minX - PADDING} ${minY - PADDING} ${maxX - minX + PADDING * 2} ${maxY - minY + PADDING * 2}`;

    return { stage, sections, seats, sectionColor, viewBox, isEmpty };
  }, [detail]);

  if (model.isEmpty) {
    return (
      <div className={`flex items-center justify-center ${className ?? ""}`}>
        <p className="text-xs font-mono text-text-secondary">This layout has no geometry to preview.</p>
      </div>
    );
  }

  return (
    <svg
      viewBox={model.viewBox}
      preserveAspectRatio="xMidYMid meet"
      className={`h-full w-full ${className ?? ""}`}
      role="img"
      aria-label={`Seat map for ${detail.name}`}
    >
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

      {/* Section shapes */}
      {model.sections.map((s) => {
        const shape = s.shapeGeom!;
        const color = s.color ?? FALLBACK_SEAT_COLOR;
        const cx = shape.x + shape.width / 2;
        const isEllipse = shape.type === "ellipse";
        return (
          <g key={`sec-${s.id}`}>
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
              {s.section_name}
            </text>
          </g>
        );
      })}

      {/* Seats */}
      {model.seats.map((seat) => (
        <circle
          key={`seat-${seat.id}`}
          cx={seat.pos_x!}
          cy={seat.pos_y!}
          r={SEAT_RADIUS}
          fill={seat.section_id != null ? model.sectionColor.get(seat.section_id) ?? FALLBACK_SEAT_COLOR : FALLBACK_SEAT_COLOR}
        />
      ))}
    </svg>
  );
}
