"use client";

import { useState } from "react";

interface VenueMapCanvasProps {
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

const PRICE_MAP: Record<string, string> = {
  sec_vip_c: "Rp 2.750.000",
  sec_vip_l: "Rp 2.750.000",
  sec_vip_r: "Rp 2.750.000",
  sec_ga_1: "Rp 850.000",
  sec_ga_2: "Rp 850.000",
  sec_ga_3: "Sold Out",
  sec_ga_4: "Rp 850.000",
  sec_ga_5: "Rp 850.000",
  sec_ga_6: "Sold Out",
  sec_ga_7: "Rp 850.000",
  sec_ga_8: "Rp 850.000",
};

const SOLD_OUT_IDS = ["sec_ga_3", "sec_ga_6"];

/* ═══════════════════════════════════════════════════════════════════
 * Geometry helpers — section shapes AND dots are generated from the
 * same quadrilateral corners, so dots are GUARANTEED to be inside.
 * ═══════════════════════════════════════════════════════════════════ */

interface Pt { x: number; y: number }
interface Quad { tl: Pt; tr: Pt; br: Pt; bl: Pt }

/**
 * Build an SVG path from a quadrilateral with optional bezier curves on
 * top and bottom edges to create a stadium-seating arc look.
 *
 * top_bow > 0  → top edge bows UPWARD   (away from section interior → safe)
 * bot_bow > 0  → bottom edge bows DOWN  (away from section interior → safe)
 *
 * Because both curves bow OUTWARD, the path always CONTAINS the quad,
 * so any dot placed inside the quad is also inside the path.
 */
function quad_path(q: Quad, top_bow = 0, bot_bow = 0): string {
  const tcx = (q.tl.x + q.tr.x) / 2;
  const tcy = (q.tl.y + q.tr.y) / 2 - top_bow;
  const bcx = (q.br.x + q.bl.x) / 2;
  const bcy = (q.br.y + q.bl.y) / 2 + bot_bow;
  return [
    `M${q.tl.x},${q.tl.y}`,
    `Q${tcx},${tcy} ${q.tr.x},${q.tr.y}`,
    `L${q.br.x},${q.br.y}`,
    `Q${bcx},${bcy} ${q.bl.x},${q.bl.y}`,
    "Z",
  ].join(" ");
}

/**
 * Place dots inside a quadrilateral using bilinear interpolation.
 * padding (0–0.4) insets from edges so dots never touch the boundary.
 */
function quad_dots(
  q: Quad, rows: number, cols: number, padding = 0.12
): { cx: number; cy: number }[] {
  const dots: { cx: number; cy: number }[] = [];
  for (let r = 0; r < rows; r++) {
    const v = rows === 1 ? 0.5 : padding + (r / (rows - 1)) * (1 - 2 * padding);
    for (let c = 0; c < cols; c++) {
      const u = cols === 1 ? 0.5 : padding + (c / (cols - 1)) * (1 - 2 * padding);
      // Bilinear interpolation
      const topX = q.tl.x + u * (q.tr.x - q.tl.x);
      const topY = q.tl.y + u * (q.tr.y - q.tl.y);
      const botX = q.bl.x + u * (q.br.x - q.bl.x);
      const botY = q.bl.y + u * (q.br.y - q.bl.y);
      dots.push({
        cx: Math.round((topX + v * (botX - topX)) * 10) / 10,
        cy: Math.round((topY + v * (botY - topY)) * 10) / 10,
      });
    }
  }
  return dots;
}

/* ═══════════════════════════════════════════════════════════════════
 * Section definitions
 *
 * Each section is defined by a quadrilateral (4 corners).
 * The SVG path and seat dots are both derived from these same corners.
 * Left/Right sections are precise mirrors of each other.
 * ═══════════════════════════════════════════════════════════════════ */

// ── VIP CENTER ────────────────────────────────────────────────────
const VIP_C_QUAD: Quad = {
  tl: { x: 330, y: 282 }, tr: { x: 470, y: 282 },
  bl: { x: 336, y: 370 }, br: { x: 464, y: 370 },
};

// ── VIP LEFT ──────────────────────────────────────────────────────
const VIP_L_QUAD: Quad = {
  tl: { x: 238, y: 296 }, tr: { x: 328, y: 282 },
  bl: { x: 234, y: 368 }, br: { x: 334, y: 370 },
};

// ── VIP RIGHT (mirror of LEFT) ───────────────────────────────────
const VIP_R_QUAD: Quad = {
  tl: { x: 472, y: 282 }, tr: { x: 562, y: 296 },
  bl: { x: 466, y: 370 }, br: { x: 566, y: 368 },
};

// ── VIP C LEFT ────────────────────────────────────────────────────
const VIPC_L_QUAD: Quad = {
  tl: { x: 170, y: 316 }, tr: { x: 236, y: 296 },
  bl: { x: 164, y: 362 }, br: { x: 232, y: 368 },
};

// ── VIP C RIGHT (mirror of VIP C LEFT) ───────────────────────────
const VIPC_R_QUAD: Quad = {
  tl: { x: 564, y: 296 }, tr: { x: 630, y: 316 },
  bl: { x: 568, y: 368 }, br: { x: 636, y: 362 },
};

// ── GOLD LEFT ─────────────────────────────────────────────────────
const GOLD_L_QUAD: Quad = {
  tl: { x: 148, y: 372 }, tr: { x: 222, y: 388 },
  bl: { x: 128, y: 444 }, br: { x: 228, y: 474 },
};

// ── GOLD RIGHT (mirror of GOLD LEFT) ─────────────────────────────
const GOLD_R_QUAD: Quad = {
  tl: { x: 578, y: 388 }, tr: { x: 652, y: 372 },
  bl: { x: 572, y: 474 }, br: { x: 672, y: 444 },
};

// ── GENERAL ADMISSION ─────────────────────────────────────────────
const GA_QUAD: Quad = {
  tl: { x: 232, y: 490 }, tr: { x: 568, y: 490 },
  bl: { x: 255, y: 555 }, br: { x: 545, y: 555 },
};

const SECTIONS = [
  {
    section_id: "sec_vip_c",
    label: "VIP\nCENTER",
    color: "#8B5CF6",
    path: quad_path(VIP_C_QUAD, 14, 8),
    dots: quad_dots(VIP_C_QUAD, 5, 7, 0.14),
    lx: 400, ly: 332,
  },
  {
    section_id: "sec_vip_l",
    label: "VIP\nLEFT",
    color: "#8B5CF6",
    path: quad_path(VIP_L_QUAD, 10, 6),
    dots: quad_dots(VIP_L_QUAD, 4, 5, 0.16),
    lx: 282, ly: 332,
  },
  {
    section_id: "sec_vip_r",
    label: "VIP\nRIGHT",
    color: "#8B5CF6",
    path: quad_path(VIP_R_QUAD, 10, 6),
    dots: quad_dots(VIP_R_QUAD, 4, 5, 0.16),
    lx: 518, ly: 332,
  },
  {
    section_id: "sec_ga_1",
    label: "VIP C\nLEFT",
    color: "#F97316",
    path: quad_path(VIPC_L_QUAD, 6, 4),
    dots: quad_dots(VIPC_L_QUAD, 3, 4, 0.18),
    lx: 200, ly: 338,
  },
  {
    section_id: "sec_ga_2",
    label: "VIP C\nRIGHT",
    color: "#F97316",
    path: quad_path(VIPC_R_QUAD, 6, 4),
    dots: quad_dots(VIPC_R_QUAD, 3, 4, 0.18),
    lx: 600, ly: 338,
  },
  {
    section_id: "sec_ga_3",
    label: "GOLD\nLEFT",
    color: "#F59E0B",
    path: quad_path(GOLD_L_QUAD, 4, 6),
    dots: quad_dots(GOLD_L_QUAD, 4, 3, 0.20),
    lx: 178, ly: 428,
  },
  {
    section_id: "sec_ga_4",
    label: "GOLD\nRIGHT",
    color: "#F59E0B",
    path: quad_path(GOLD_R_QUAD, 4, 6),
    dots: quad_dots(GOLD_R_QUAD, 4, 3, 0.20),
    lx: 622, ly: 428,
  },
  {
    section_id: "sec_ga_5",
    label: "GENERAL ADMISSION",
    color: "#22C55E",
    path: quad_path(GA_QUAD, 20, 8),
    dots: quad_dots(GA_QUAD, 3, 12, 0.08),
    lx: 400, ly: 528,
  },
  // Placeholder sections (hidden)
  { section_id: "sec_ga_6", label: "", color: "#CBD5E1", path: "", dots: [], lx: 0, ly: 0 },
  { section_id: "sec_ga_7", label: "", color: "#CBD5E1", path: "", dots: [], lx: 0, ly: 0 },
  { section_id: "sec_ga_8", label: "", color: "#CBD5E1", path: "", dots: [], lx: 0, ly: 0 },
];

interface TooltipState {
  label: string;
  price: string;
  x: number;
  y: number;
}

export function VenueMapCanvas({
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
  const [tooltip, set_tooltip] = useState<TooltipState | null>(null);

  return (
    <div
      onMouseDown={(e) => {
        if ((e.target as HTMLElement).closest("[data-section]")) return;
        on_pan_start(e.clientX, e.clientY);
      }}
      onMouseMove={(e) => on_pan_move(e.clientX, e.clientY)}
      onMouseUp={on_pan_end}
      onMouseLeave={() => { on_pan_end(); set_tooltip(null); }}
      onWheel={(e) => { e.preventDefault(); on_wheel_zoom(e.deltaY); }}
      className="relative h-full w-full select-none overflow-hidden bg-[#F0F2F5]"
      style={{ cursor: "grab" }}
    >
      {/* Subtle dot grid bg */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(circle, #CBD5E1 1px, transparent 1px)",
          backgroundSize: "22px 22px",
          opacity: 0.5,
        }}
      />

      {/* SVG arena */}
      <div
        className="absolute inset-0 flex h-full w-full items-center justify-center"
        style={{
          transform: `translate(${pan_x}px, ${pan_y}px) scale(${zoom})`,
          transition: "transform 0.05s linear",
          transformOrigin: "center center",
        }}
      >
        <svg
          viewBox="0 0 800 680"
          width="760"
          height="640"
          style={{ overflow: "visible" }}
        >
          {/* ── Arena shell ── */}
          <ellipse cx="400" cy="420" rx="350" ry="260"
            fill="none" stroke="#E2E8F0" strokeWidth="18" opacity="0.5" />
          <ellipse cx="400" cy="418" rx="340" ry="250"
            fill="#EEF0F4" stroke="#DDE1E8" strokeWidth="2" />
          <ellipse cx="400" cy="412" rx="290" ry="210"
            fill="#E8EBF0" stroke="#D5DAE3" strokeWidth="1" />

          {/* ── Stage ── */}
          <path d="M288,140 Q400,95 512,140 L500,212 Q400,190 300,212 Z"
            fill="#0F172A" />
          <path d="M296,208 Q400,190 504,208 L507,222 Q400,202 293,222 Z"
            fill="#1E293B" />
          <rect x="292" y="150" width="6" height="56" fill="#334155" rx="2" />
          <rect x="502" y="150" width="6" height="56" fill="#334155" rx="2" />
          <defs>
            <radialGradient id="spotlight" cx="50%" cy="0%" r="100%">
              <stop offset="0%" stopColor="#93C5FD" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
            </radialGradient>
          </defs>
          {[340, 370, 400, 430, 460].map((x, i) => (
            <g key={`light-${i}`}>
              <ellipse cx={x} cy="190" rx="7" ry="3.5" fill="#60A5FA" opacity="0.9" />
              <ellipse cx={x} cy="194" rx="4" ry="2.5" fill="white" opacity="0.55" />
            </g>
          ))}
          <text x="400" y="178" textAnchor="middle" fill="white"
            fontSize="14" fontWeight="800" letterSpacing="6" opacity="0.95">
            STAGE
          </text>

          {/* ── Sections ── */}
          {SECTIONS.filter(s => s.path).map((section) => {
            const is_active = active_section_id === section.section_id;
            const is_sold = SOLD_OUT_IDS.includes(section.section_id);

            return (
              <g
                key={section.section_id}
                data-section={section.section_id}
                style={{ cursor: is_sold ? "not-allowed" : "pointer" }}
                onClick={() => {
                  if (!is_sold) on_select_section(section.section_id, section.label.replace("\n", " "));
                }}
                onMouseEnter={(e) => {
                  set_tooltip({
                    label: section.label.replace("\n", " "),
                    price: PRICE_MAP[section.section_id] ?? "",
                    x: e.clientX,
                    y: e.clientY,
                  });
                }}
                onMouseLeave={() => set_tooltip(null)}
              >
                {/* Section fill */}
                <path
                  d={section.path}
                  fill={section.color}
                  fillOpacity={is_sold ? 0.15 : is_active ? 0.92 : 0.42}
                  stroke={section.color}
                  strokeWidth={is_active ? 2.5 : 1}
                  strokeOpacity={is_active ? 1 : 0.5}
                  className="transition-all duration-200"
                />
                {/* Seat dots */}
                {section.dots.map((dot, i) => (
                  <circle
                    key={i}
                    cx={dot.cx}
                    cy={dot.cy}
                    r={is_active ? 4.2 : 3.6}
                    fill={is_sold ? "#94A3B8" : is_active ? "white" : section.color}
                    fillOpacity={is_sold ? 0.3 : is_active ? 0.95 : 0.82}
                    className="transition-all duration-200"
                  />
                ))}
                {/* Active indicator */}
                {is_active && (
                  <circle cx={section.lx} cy={section.ly - 22}
                    r="10" fill={section.color} stroke="white" strokeWidth="2" />
                )}
                {/* Section label */}
                {section.label && section.label.split("\n").map((line, i) => (
                  <text
                    key={i}
                    x={section.lx}
                    y={section.ly + i * 12}
                    textAnchor="middle"
                    fill={is_active ? "white" : "#1E293B"}
                    fontSize="8.5"
                    fontWeight="700"
                    letterSpacing="0.5"
                    className="pointer-events-none"
                    opacity={is_sold ? 0.4 : 1}
                  >
                    {line}
                  </text>
                ))}
              </g>
            );
          })}

          {/* ── Entrance markers ── */}
          {[
            { x: 148, y: 365 },
            { x: 652, y: 365 },
            { x: 290, y: 590 },
            { x: 510, y: 590 },
          ].map((m, i) => (
            <g key={`entrance-${i}`}>
              <rect x={m.x - 13} y={m.y - 13} width="26" height="26" rx="5"
                fill="#22C55E" opacity="0.9" />
              <text x={m.x} y={m.y + 6} textAnchor="middle"
                fontSize="14" className="pointer-events-none">🚶</text>
            </g>
          ))}

          {/* ── Restroom markers ── */}
          {[
            { x: 255, y: 214 },
            { x: 545, y: 214 },
            { x: 198, y: 618 },
            { x: 602, y: 618 },
            { x: 728, y: 478 },
          ].map((m, i) => (
            <g key={`restroom-${i}`}>
              <rect x={m.x - 14} y={m.y - 13} width="28" height="26" rx="4"
                fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="1" />
              <text x={m.x} y={m.y + 6} textAnchor="middle"
                fontSize="13" className="pointer-events-none">🚻</text>
            </g>
          ))}

          {/* ── Food & Drinks marker ── */}
          <g>
            <rect x="720" y="582" width="48" height="38" rx="5"
              fill="#FEF3C7" stroke="#FCD34D" strokeWidth="1" />
            <text x="744" y="598" textAnchor="middle" fontSize="9"
              fill="#92400E" fontWeight="600" className="pointer-events-none">Food &</text>
            <text x="744" y="610" textAnchor="middle" fontSize="9"
              fill="#92400E" fontWeight="600" className="pointer-events-none">Drinks</text>
          </g>
        </svg>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none fixed z-50 w-48 rounded-xl border border-border-subtle bg-white p-3 shadow-[0_8px_30px_rgba(0,0,0,0.15)]"
          style={{ left: tooltip.x + 14, top: tooltip.y - 80 }}
        >
          <p className="font-label-md text-label-md font-bold text-text-primary">
            {tooltip.label}
          </p>
          <p className="mt-0.5 font-headline-sm text-headline-sm font-bold text-secondary">
            {tooltip.price}
          </p>
          {!tooltip.price.includes("Sold") && (
            <div className="mt-1.5 flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-success" />
              <span className="font-label-sm text-label-sm text-success">Available</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}