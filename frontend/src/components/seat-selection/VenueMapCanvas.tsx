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

// Dot grid generator helper
function make_dots(
  count: number,
  cols: number,
  start_x: number,
  start_y: number,
  gap_x: number,
  gap_y: number
) {
  return Array.from({ length: count }, (_, i) => ({
    cx: start_x + (i % cols) * gap_x,
    cy: start_y + Math.floor(i / cols) * gap_y,
  }));
}

const SECTIONS = [
  // ── VIP CENTER (purple, innermost) ──────────────────────────────
  {
    section_id: "sec_vip_c",
    label: "VIP\nCENTER",
    color: "#8B5CF6",
    path: "M310,310 Q400,280 490,310 L478,400 Q400,378 322,400 Z",
    dots: make_dots(30, 6, 328, 318, 27, 22),
    lx: 400, ly: 365,
  },
  // ── VIP LEFT (purple, left of center) ───────────────────────────
  {
    section_id: "sec_vip_l",
    label: "VIP\nLEFT",
    color: "#8B5CF6",
    path: "M205,300 Q275,268 318,302 L308,398 Q258,388 198,368 Z",
    dots: make_dots(25, 5, 215, 308, 21, 22),
    lx: 262, ly: 358,
  },
  // ── VIP RIGHT (purple, right of center) ─────────────────────────
  {
    section_id: "sec_vip_r",
    label: "VIP\nRIGHT",
    color: "#8B5CF6",
    path: "M482,302 Q525,268 595,300 L602,368 Q542,388 492,398 Z",
    dots: make_dots(25, 5, 492, 308, 21, 22),
    lx: 540, ly: 358,
  },
  // ── VIP C LEFT (orange/salmon) ───────────────────────────────────
  {
    section_id: "sec_ga_1",
    label: "VIP C\nLEFT",
    color: "#F97316",
    path: "M130,268 Q185,235 215,272 L202,372 Q158,368 122,338 Z",
    dots: make_dots(18, 4, 140, 275, 18, 22),
    lx: 172, ly: 338,
  },
  // ── VIP C RIGHT (orange/salmon) ──────────────────────────────────
  {
    section_id: "sec_ga_2",
    label: "VIP C\nRIGHT",
    color: "#F97316",
    path: "M585,272 Q615,235 670,268 L678,338 Q642,368 598,372 Z",
    dots: make_dots(18, 4, 598, 275, 18, 22),
    lx: 632, ly: 338,
  },
  // ── GOLD LEFT (yellow/amber) ─────────────────────────────────────
  {
    section_id: "sec_ga_3",
    label: "GOLD\nLEFT",
    color: "#F59E0B",
    path: "M105,348 Q148,385 200,410 L215,500 Q148,492 98,448 Z",
    dots: make_dots(20, 4, 118, 358, 20, 22),
    lx: 168, ly: 458,
  },
  // ── GOLD RIGHT (yellow/amber) ────────────────────────────────────
  {
    section_id: "sec_ga_4",
    label: "GOLD\nRIGHT",
    color: "#F59E0B",
    path: "M600,410 Q652,385 695,348 L702,448 Q652,492 585,500 Z",
    dots: make_dots(20, 4, 605, 358, 20, 22),
    lx: 636, ly: 458,
  },
  // ── GENERAL ADMISSION (green, bottom arc) ───────────────────────
  {
    section_id: "sec_ga_5",
    label: "GENERAL ADMISSION",
    color: "#22C55E",
    path: "M205,505 Q300,552 400,562 Q500,552 595,505 L582,572 Q400,615 218,572 Z",
    dots: make_dots(48, 12, 222, 515, 31, 18),
    lx: 400, ly: 548,
  },
  // ── SEC GA 6 (sold out placeholder, hidden visually) ────────────
  {
    section_id: "sec_ga_6",
    label: "",
    color: "#CBD5E1",
    path: "",
    dots: [],
    lx: 0, ly: 0,
  },
  {
    section_id: "sec_ga_7",
    label: "",
    color: "#CBD5E1",
    path: "",
    dots: [],
    lx: 0, ly: 0,
  },
  {
    section_id: "sec_ga_8",
    label: "",
    color: "#CBD5E1",
    path: "",
    dots: [],
    lx: 0, ly: 0,
  },
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
          {/* Outer glow ring */}
          <ellipse cx="400" cy="430" rx="362" ry="272"
            fill="none" stroke="#E2E8F0" strokeWidth="18" opacity="0.6" />
          {/* Main arena floor */}
          <ellipse cx="400" cy="428" rx="352" ry="264"
            fill="#EEF0F4" stroke="#DDE1E8" strokeWidth="2" />
          {/* Inner floor */}
          <ellipse cx="400" cy="418" rx="300" ry="218"
            fill="#E8EBF0" stroke="#D5DAE3" strokeWidth="1" />

          {/* ── Stage ── */}
          {/* Stage structure */}
          <path d="M278,135 Q400,88 522,135 L505,215 Q400,188 295,215 Z"
            fill="#0F172A" />
          {/* Stage front lip */}
          <path d="M290,210 Q400,190 510,210 L515,225 Q400,205 285,225 Z"
            fill="#1E293B" />
          {/* Stage scaffolding left */}
          <rect x="285" y="148" width="8" height="62" fill="#334155" rx="2" />
          {/* Stage scaffolding right */}
          <rect x="507" y="148" width="8" height="62" fill="#334155" rx="2" />
          {/* Stage lights */}
          <defs>
            <radialGradient id="spotlight" cx="50%" cy="0%" r="100%">
              <stop offset="0%" stopColor="#93C5FD" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
            </radialGradient>
          </defs>
          {[330, 358, 400, 442, 470].map((x, i) => (
            <g key={i}>
              <ellipse cx={x} cy="190" rx="8" ry="4" fill="#60A5FA" opacity="0.9" />
              <ellipse cx={x} cy="195" rx="5" ry="3" fill="white" opacity="0.6" />
            </g>
          ))}
          {/* Stage label */}
          <text x="400" y="178" textAnchor="middle" fill="white"
            fontSize="15" fontWeight="800" letterSpacing="6" opacity="0.95">
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
                  fillOpacity={is_sold ? 0.15 : is_active ? 0.85 : 0.38}
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
                    r={is_active ? 4.5 : 4}
                    fill={is_sold ? "#94A3B8" : is_active ? "white" : section.color}
                    fillOpacity={is_sold ? 0.3 : is_active ? 0.95 : 0.82}
                    className="transition-all duration-200"
                  />
                ))}
                {/* Selected checkmark dot */}
                {is_active && (
                  <circle
                    cx={section.lx}
                    cy={section.ly - 22}
                    r="10"
                    fill={section.color}
                    stroke="white"
                    strokeWidth="2"
                  />
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

          {/* ── Entrance markers (green walking person) ── */}
          {[
            { x: 140, y: 375, label: "" },
            { x: 660, y: 375, label: "" },
            { x: 280, y: 612, label: "" },
            { x: 520, y: 612, label: "" },
          ].map((m, i) => (
            <g key={i}>
              <rect x={m.x - 13} y={m.y - 13} width="26" height="26" rx="5"
                fill="#22C55E" opacity="0.9" />
              <text x={m.x} y={m.y + 6} textAnchor="middle"
                fontSize="14" className="pointer-events-none">🚶</text>
            </g>
          ))}

          {/* ── Restroom markers ── */}
          {[
            { x: 248, y: 210 },
            { x: 552, y: 210 },
            { x: 200, y: 640 },
            { x: 600, y: 640 },
            { x: 740, y: 490 },
          ].map((m, i) => (
            <g key={i}>
              <rect x={m.x - 14} y={m.y - 13} width="28" height="26" rx="4"
                fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="1" />
              <text x={m.x} y={m.y + 6} textAnchor="middle"
                fontSize="13" className="pointer-events-none">🚻</text>
            </g>
          ))}

          {/* ── Food & Drinks marker (right side) ── */}
          <g>
            <rect x="734" y="598" width="48" height="38" rx="5"
              fill="#FEF3C7" stroke="#FCD34D" strokeWidth="1" />
            <text x="758" y="614" textAnchor="middle" fontSize="9"
              fill="#92400E" fontWeight="600" className="pointer-events-none">Food &</text>
            <text x="758" y="626" textAnchor="middle" fontSize="9"
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