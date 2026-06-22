/**
 * components/seat-selection/VenueMapCanvas.tsx
 *
 * The pannable/zoomable venue diagram: a stage block, 3 VIP section
 * buttons, and an 8-cell general admission grid (with 2 sold-out cells).
 * Mouse drag pans, scroll wheel zooms — both wired through the
 * useSeatMap hook's pan/zoom handlers, a direct port of the Alpine.js
 * startPan/pan/endPan/handleZoom methods from the Stitch screen.
 */

"use client";

import type { SeatSection } from "@/types/ticket";

interface VenueMapCanvasProps {
  vip_sections: SeatSection[];
  ga_sections: SeatSection[];
  active_section_id: string | null;
  zoom: number;
  pan_x: number;
  pan_y: number;
  on_select_section: (section_id: string, label: string) => void;
  on_pan_start: (client_x: number, client_y: number) => void;
  on_pan_move: (client_x: number, client_y: number) => void;
  on_pan_end: () => void;
  on_wheel_zoom: (delta_y: number) => void;
}

export function VenueMapCanvas({
  vip_sections,
  ga_sections,
  active_section_id,
  zoom,
  pan_x,
  pan_y,
  on_select_section,
  on_pan_start,
  on_pan_move,
  on_pan_end,
  on_wheel_zoom,
}: VenueMapCanvasProps) {
  return (
    <div
      id="map-viewport"
      onMouseDown={(e) => {
        if ((e.target as HTMLElement).closest("button")) return;
        on_pan_start(e.clientX, e.clientY);
      }}
      onMouseMove={(e) => on_pan_move(e.clientX, e.clientY)}
      onMouseUp={on_pan_end}
      onMouseLeave={on_pan_end}
      onWheel={(e) => {
        e.preventDefault();
        on_wheel_zoom(e.deltaY);
      }}
      className="relative flex-1 select-none overflow-hidden bg-surface-container-lowest shadow-inner"
      style={{ cursor: "grab" }}
    >
      {/* Background dot grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "radial-gradient(circle, #0F172A 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      {/* Pannable / zoomable content */}
      <div
        className="absolute inset-0 flex origin-center items-center justify-center transition-transform duration-75 will-change-transform"
        style={{ transform: `translate(${pan_x}px, ${pan_y}px) scale(${zoom})` }}
      >
        <div className="relative flex h-[600px] w-[800px] flex-col items-center justify-between rounded-3xl border border-border-subtle bg-surface-white p-8 shadow-elevated">
          {/* Stage */}
          <div className="relative mb-12 flex h-24 w-2/3 items-center justify-center overflow-hidden rounded-t-full border-2 border-border-subtle bg-surface-container shadow-inner">
            <span className="font-headline-sm text-headline-sm uppercase tracking-widest text-text-secondary">
              Stage
            </span>
            <div className="absolute bottom-0 h-1 w-full bg-gradient-to-r from-transparent via-tertiary to-transparent opacity-50" />
          </div>

          <div className="flex w-full flex-1 flex-col items-center gap-8">
            {/* VIP row */}
            <div className="flex w-full justify-center gap-4">
              {vip_sections.map((section) => {
                const is_active = active_section_id === section.section_id;
                return (
                  <button
                    key={section.section_id}
                    type="button"
                    onClick={() =>
                      on_select_section(section.section_id, section.label)
                    }
                    className={`flex flex-col items-center gap-2 rounded-xl border-2 px-8 py-6 transition-all duration-200 ${
                      is_active
                        ? "scale-105 border-primary bg-primary text-white shadow-lg"
                        : "border-border-subtle bg-surface text-primary hover:bg-surface-container hover:border-secondary/50"
                    }`}
                  >
                    <span className="font-headline-sm text-headline-sm">
                      {section.label}
                    </span>
                    <span
                      className={`font-label-sm text-label-sm opacity-80 ${
                        is_active ? "text-primary-fixed" : "text-text-secondary"
                      }`}
                    >
                      Available
                    </span>
                  </button>
                );
              })}
            </div>

            {/* General admission grid */}
            <div className="grid w-full grid-cols-4 gap-4 px-12">
              {ga_sections.map((section) => {
                const is_active = active_section_id === section.section_id;
                return (
                  <button
                    key={section.section_id}
                    type="button"
                    disabled={section.is_sold_out}
                    onClick={() =>
                      on_select_section(section.section_id, section.label)
                    }
                    className={`group relative flex h-20 items-center justify-center overflow-hidden rounded-lg border-2 transition-all duration-200 ${
                      section.is_sold_out
                        ? "cursor-not-allowed opacity-50"
                        : is_active
                          ? "z-10 scale-105 border-primary bg-primary text-white shadow-md"
                          : "border-border-subtle bg-surface text-primary hover:border-secondary/50"
                    }`}
                  >
                    <span className="font-label-md text-label-md">
                      {section.label}
                    </span>
                    {section.is_sold_out && (
                      <div className="absolute inset-0 flex items-center justify-center bg-surface-tint/10 backdrop-blur-[1px]">
                        <span className="rounded border border-danger px-2 py-0.5 font-label-sm text-label-sm font-bold uppercase tracking-wider text-danger [transform:rotate(-15deg)]">
                          Sold Out
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}