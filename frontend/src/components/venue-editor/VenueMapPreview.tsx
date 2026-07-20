/**
 * components/venue-editor/VenueMapPreview.tsx
 *
 * Dynamic venue map preview panel. Renders a live SVG preview from
 * the actual sections, seats, and pricing tier data in the editor state.
 * Shows: venue selector, stage shape, section zones with seats,
 * zoom controls, and a pricing-tier-based legend.
 */

"use client";

import { useState, useMemo } from "react";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import type { VenueSection, VenueShape, PricingTier } from "@/types/ticket";
import { useVenueEditorStore } from "@/lib/store/venueEditorStore";

interface VenueMapPreviewProps {
  event_title: string;
  venue_name: string;
  venues: { venue_id: string; name: string }[];
  selected_venue_id: string;
  on_venue_change: (venue_id: string) => void;
  sections: VenueSection[];
  stage_shape: VenueShape;
  pricing_tiers: PricingTier[];
}

export function VenueMapPreview({
  event_title,
  venue_name,
  venues,
  selected_venue_id,
  on_venue_change,
  sections,
  stage_shape,
  pricing_tiers,
}: VenueMapPreviewProps) {
  const [preview_zoom, set_preview_zoom] = useState(100);
  const seats = useVenueEditorStore((s) => s.seats);

  // Compute SVG viewBox to fit all content
  const viewBox = useMemo(() => {
    let min_x = stage_shape.x;
    let min_y = stage_shape.y;
    let max_x = stage_shape.x + stage_shape.width;
    let max_y = stage_shape.y + stage_shape.height;

    sections.forEach((s) => {
      if (s.shape) {
        min_x = Math.min(min_x, s.shape.x);
        min_y = Math.min(min_y, s.shape.y);
        max_x = Math.max(max_x, s.shape.x + s.shape.width);
        max_y = Math.max(max_y, s.shape.y + s.shape.height);
      }
    });

    seats.forEach((seat) => {
      min_x = Math.min(min_x, seat.x - 10);
      min_y = Math.min(min_y, seat.y - 10);
      max_x = Math.max(max_x, seat.x + 10);
      max_y = Math.max(max_y, seat.y + 10);
    });

    const padding = 80;
    return {
      x: min_x - padding,
      y: min_y - padding,
      width: max_x - min_x + padding * 2,
      height: max_y - min_y + padding * 2,
    };
  }, [sections, seats, stage_shape]);

  // Build legend from pricing tiers
  const active_tier_ids = useMemo(() => {
    const ids = new Set<string>();
    seats.forEach((seat) => {
      if (seat.tier_id) ids.add(seat.tier_id);
    });
    return ids;
  }, [seats]);

  const legend_items = pricing_tiers.filter((t) => active_tier_ids.has(t.tier_id));
  const has_unassigned = seats.some((seat) => !seat.tier_id);

  const scale = preview_zoom / 100;

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden border-r border-border-subtle bg-background">
      {/* Header Overlay */}
      <div className="pointer-events-none absolute left-0 top-0 z-10 flex w-full items-start justify-between p-4">
        {/* Event Info Card */}
        <div className="pointer-events-auto rounded-xl border border-border-subtle bg-surface-white/90 p-3 shadow-sm backdrop-blur-sm">
          <div className="mb-3 flex flex-col gap-1 border-b border-border-subtle pb-3">
            <label className="text-[10px] font-medium uppercase tracking-widest text-text-secondary">
              Selected Venue
            </label>
            <div className="relative">
              <select
                value={selected_venue_id}
                onChange={(e) => on_venue_change(e.target.value)}
                className="w-full cursor-pointer appearance-none rounded-lg border border-border-subtle bg-surface-container-low px-3 py-1.5 pr-8 text-sm text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {venues.map((v) => (
                  <option key={v.venue_id} value={v.venue_id}>
                    {v.name}
                  </option>
                ))}
              </select>
              <svg className="pointer-events-none absolute right-2 top-2 h-4 w-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          <h1
            className="text-xl font-semibold text-primary"
            style={{ fontFamily: "Hanken Grotesk, sans-serif" }}
          >
            {event_title}
          </h1>
          <p className="mt-1 text-[10px] font-medium uppercase tracking-widest text-text-secondary">
            Live Venue Preview
          </p>
        </div>

        {/* Zoom Controls */}
        <div className="pointer-events-auto flex flex-col gap-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => set_preview_zoom(Math.min(200, preview_zoom + 25))}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-border-subtle bg-surface-white text-text-secondary shadow-sm transition-colors hover:bg-surface-container-low"
            >
              <ZoomIn size={20} />
            </button>
            <button
              type="button"
              onClick={() => set_preview_zoom(Math.max(25, preview_zoom - 25))}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-border-subtle bg-surface-white text-text-secondary shadow-sm transition-colors hover:bg-surface-container-low"
            >
              <ZoomOut size={20} />
            </button>
          </div>
          <button
            type="button"
            onClick={() => set_preview_zoom(100)}
            className="flex h-10 items-center justify-center gap-1.5 rounded-lg border border-border-subtle bg-surface-white px-3 text-xs font-medium text-text-secondary shadow-sm transition-colors hover:bg-surface-container-low"
          >
            <Maximize2 size={14} />
            {preview_zoom}%
          </button>
        </div>
      </div>

      {/* Dynamic SVG Map */}
      <div
        className="flex flex-1 items-center justify-center overflow-hidden p-8"
        style={{
          backgroundImage: "radial-gradient(#e2e8f0 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      >
        {sections.length === 0 && (
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-container-low">
              <span className="text-2xl">🎪</span>
            </div>
            <p className="text-sm font-medium text-text-secondary">No sections created yet</p>
            <p className="mt-1 text-xs text-text-tertiary">Switch to Map Editor to add sections and seats</p>
          </div>
        )}

        {sections.length > 0 && (
          <svg
            className="h-auto w-full max-w-3xl"
            viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
            preserveAspectRatio="xMidYMid meet"
            style={{ transform: `scale(${scale})`, transformOrigin: "center" }}
          >
            {/* Stage */}
            <rect
              x={stage_shape.x}
              y={stage_shape.y}
              width={stage_shape.width}
              height={stage_shape.height}
              rx={stage_shape.type === "rounded-rectangle" ? 12 : 4}
              fill="#0f172a"
              stroke="white"
              strokeWidth={3}
            />
            <text
              x={stage_shape.x + stage_shape.width / 2}
              y={stage_shape.y + stage_shape.height / 2 + 5}
              textAnchor="middle"
              fill="white"
              fontSize={14}
              fontWeight={700}
              letterSpacing={3}
              fontFamily="Inter, sans-serif"
            >
              STAGE
            </text>

            {/* Sections */}
            {sections.map((section) => (
              <g key={section.section_id}>
                {/* Section shape */}
                {section.shape && (
                  <>
                    {section.shape.type === "ellipse" ? (
                      <ellipse
                        cx={section.shape.x + section.shape.width / 2}
                        cy={section.shape.y + section.shape.height / 2}
                        rx={section.shape.width / 2}
                        ry={section.shape.height / 2}
                        fill={section.color}
                        opacity={0.12}
                        stroke={section.color}
                        strokeWidth={1.5}
                        strokeDasharray="4 2"
                      />
                    ) : (
                      <rect
                        x={section.shape.x}
                        y={section.shape.y}
                        width={section.shape.width}
                        height={section.shape.height}
                        rx={section.shape.type === "rounded-rectangle" ? 8 : 2}
                        fill={section.color}
                        opacity={0.12}
                        stroke={section.color}
                        strokeWidth={1.5}
                        strokeDasharray="4 2"
                      />
                    )}
                    <text
                      x={section.shape.x + section.shape.width / 2}
                      y={section.shape.y + section.shape.height + 16}
                      textAnchor="middle"
                      fill={section.color}
                      fontFamily="Inter, sans-serif"
                      fontSize={11}
                      fontWeight={600}
                    >
                      {section.label}
                    </text>
                  </>
                )}

              </g>
            ))}

            {/* Seats — flat, so untagged seats render too */}
            {seats.map((seat) => {
              const tier = pricing_tiers.find((t) => t.tier_id === seat.tier_id);
              const color = tier ? tier.color : "#cbd5e1";
              const is_unavailable = seat.status === "unavailable";
              return (
                <circle
                  key={seat.seat_id}
                  cx={seat.x}
                  cy={seat.y}
                  r={4}
                  fill={color}
                  opacity={is_unavailable ? 0.25 : 0.85}
                  className="transition-opacity"
                />
              );
            })}
          </svg>
        )}
      </div>

      {/* Legend — pricing-tier based */}
      <div className="pointer-events-auto absolute bottom-4 left-4 flex flex-wrap gap-3 rounded-xl border border-border-subtle bg-surface-white/90 p-3 shadow-sm backdrop-blur-sm">
        {legend_items.map((tier) => (
          <div key={tier.tier_id} className="flex items-center gap-2">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: tier.color }}
            />
            <span className="text-xs font-medium text-text-secondary">{tier.name}</span>
          </div>
        ))}
        {has_unassigned && (
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-slate-300" />
            <span className="text-xs font-medium text-text-secondary">Unassigned</span>
          </div>
        )}
        {legend_items.length === 0 && !has_unassigned && (
          <span className="text-xs text-text-tertiary">No seats to display</span>
        )}
      </div>
    </div>
  );
}
