import React, { useEffect, useState } from "react";
import { Globe, Mail, Share2, Tv2, ChevronRight, Download, DollarSign, Ticket, UserCheck, Timer, ArrowUpRight, ArrowDownRight, PieChart } from "lucide-react";
import { getEventAnalytics, OrganizerAnalytics } from "@/lib/api/eorganizer";

const DATE_RANGES = [
  { label: 'Last 7 Days', value: '7d' },
  { label: 'Last 30 Days', value: '30d' },
  { label: 'Last 90 Days', value: '90d' },
];

export default function WorkspaceAnalytics({ eventId }: { eventId?: string }) {
  const [dateRange, setDateRange] = useState('30d');
  const [analytics, setAnalytics] = useState<OrganizerAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!eventId) return;
      setIsLoading(true);
      const res = await getEventAnalytics(Number(eventId), dateRange);
      if (res.success && res.data) {
        setAnalytics(res.data);
      }
      setIsLoading(false);
    };
    fetchAnalytics();
  }, [eventId, dateRange]);

  const channels = [
    { name: "Direct / Portal Search", icon: Globe, visitors: 4210, conversion: "43%", revenue: "$121,500" },
    { name: "Newsletter Campaign", icon: Mail, visitors: 3105, conversion: "32%", revenue: "$81,200" },
    { name: "Partner Promos", icon: Share2, visitors: 1980, conversion: "21%", revenue: "$52,400" },
    { name: "Social Ad Retargeting", icon: Tv2, visitors: 1220, conversion: "18%", revenue: "$29,800" }
  ];

  const peakData = [
    { hour: "08:00", attendees: 120 },
    { hour: "09:00", attendees: 450 },
    { hour: "10:00", attendees: 320 },
    { hour: "11:00", attendees: 190 },
    { hour: "12:00", attendees: 240 },
    { hour: "13:00", attendees: 110 }
  ];

  const tierBreakdown = [
    { label: 'VIP All-Access', value: 18, color: 'var(--color-primary)' },
    { label: 'General Admission', value: 52, color: 'var(--color-secondary)' },
    { label: 'Early Bird', value: 21, color: 'var(--color-tertiary)' },
    { label: 'Group Bundle', value: 9, color: 'var(--color-success)' },
  ];

  const trendData = (analytics?.points || []).map((p) => ({
    label: p.date.slice(5),
    sales: p.sales,
    attendance: p.tickets,
  }));

  const totalSales = trendData.reduce((acc, curr) => acc + curr.sales, 0);
  const totalTickets = trendData.reduce((acc, curr) => acc + curr.attendance, 0);

  const performanceMetrics = [
    { label: 'Total Revenue', value: `$${totalSales.toLocaleString()}`, delta: 'Cumulative earnings', up: true, icon: DollarSign },
    { label: 'Tickets Sold', value: totalTickets.toLocaleString(), delta: 'Issued credentials', up: true, icon: Ticket },
    { label: 'Attendance Rate', value: '100.0%', delta: 'Check-in ratio', up: true, icon: UserCheck },
    { label: 'Avg. Scan Time', value: '1.2s', delta: 'NFC/QR scanner avg', up: false, icon: Timer },
  ];

  const svgWidth = 560;
  const svgHeight = 200;
  const padding = 30;

  const getX = (index: number) => padding + (index * (svgWidth - 2 * padding)) / peakData.length;
  const getY = (val: number) => svgHeight - padding - (val * (svgHeight - 2 * padding)) / 500;

  const trendWidth = 480;
  const trendHeight = 180;
  const trendPad = 24;
  const maxSales = Math.max(...trendData.map(d => d.sales), 1);
  const maxAttendance = Math.max(...trendData.map(d => d.attendance), 1);
  const trendX = (i: number) => trendPad + (i * (trendWidth - 2 * trendPad)) / Math.max(trendData.length - 1, 1);
  const trendY = (val: number, max: number) => trendHeight - trendPad - (val / max) * (trendHeight - 2 * trendPad);
  const trendPath = (key: "sales" | "attendance") => {
    if (trendData.length === 0) return "";
    return trendData.reduce((acc, d, i) => `${acc} ${i === 0 ? "M" : "L"} ${trendX(i)} ${trendY(d[key], key === "sales" ? maxSales : maxAttendance)}`, "");
  };

  const donutRadius = 60;
  const donutCircumference = 2 * Math.PI * donutRadius;
  let cumulative = 0;

  return (
    <div className="space-y-6 animate-fade-in text-left">
      <div className="flex flex-wrap justify-between items-center gap-3 bg-white p-4 border border-border-subtle rounded-xl soft-shadow">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-text-secondary">Date Range:</span>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="h-9 px-3 border border-border-subtle rounded-lg text-xs bg-white outline-none cursor-pointer"
          >
            {DATE_RANGES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        <button
          onClick={() => alert(`Exporting analytics report for ${dateRange}...`)}
          className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-white text-xs font-bold px-3.5 py-2 rounded-lg shadow-sm transition-colors cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" /> Export Report
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {performanceMetrics.map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.label} className="p-4 bg-white border border-border-subtle rounded-xl shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold text-text-secondary">{m.label}</span>
                <div className="p-1.5 bg-secondary/10 border border-secondary/20 text-secondary rounded-lg"><Icon className="w-4 h-4" /></div>
              </div>
              <div className="flex justify-between items-baseline mt-2">
                <h3 className="text-lg font-bold text-text-primary">{m.value}</h3>
                <span className={`text-[10px] font-mono font-bold flex items-center gap-0.5 ${m.up ? 'text-success' : 'text-danger'}`}>
                  {m.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />} {m.delta}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-5 bg-white border border-border-subtle rounded-xl flex flex-col justify-between shadow-sm">
          <div>
            <h4 className="text-sm font-bold text-text-primary mb-1">Sales vs. Attendance</h4>
            <p className="text-xs text-text-secondary mb-4">Weekly ticket sales against realized attendance rate</p>
            <div className="flex gap-3 text-[10px] font-bold mb-2">
              <span className="flex items-center gap-1.5 text-tertiary">● Sales</span>
              <span className="flex items-center gap-1.5 text-secondary">● Attendance</span>
            </div>
            <div className="relative w-full h-[160px]">
              <svg viewBox={`0 0 ${trendWidth} ${trendHeight}`} className="w-full h-full overflow-visible">
                {[0, 0.5, 1].map((r, i) => (
                  <line key={i} x1={trendPad} y1={trendPad + r * (trendHeight - 2 * trendPad)} x2={trendWidth - trendPad} y2={trendPad + r * (trendHeight - 2 * trendPad)} stroke="#F1F5F9" strokeWidth="1" />
                ))}
                {trendData.map((d, i) => (
                  <text key={i} x={trendX(i)} y={trendHeight - trendPad + 14} fill="#94A3B8" fontSize="8" fontFamily="monospace" textAnchor="middle">{d.label}</text>
                ))}
                <path d={trendPath("sales")} fill="none" stroke="var(--color-tertiary)" strokeWidth="2" strokeLinecap="round" />
                <path d={trendPath("attendance")} fill="none" stroke="var(--color-secondary)" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </div>

        <div className="p-5 bg-white border border-border-subtle rounded-xl flex flex-col justify-between shadow-sm">
          <div>
            <h4 className="text-sm font-bold text-text-primary mb-1 flex items-center gap-1.5"><PieChart className="w-4 h-4 text-secondary" /> Ticket Tier Breakdown</h4>
            <p className="text-xs text-text-secondary mb-4">Share of tickets sold per tier</p>
          </div>
          <div className="flex items-center gap-6">
            <svg viewBox="0 0 160 160" className="w-36 h-36 shrink-0 -rotate-90">
              {tierBreakdown.map((seg, i) => {
                const dash = (seg.value / 100) * donutCircumference;
                const offset = -((cumulative / 100) * donutCircumference);
                cumulative += seg.value;
                return (
                  <circle
                    key={i}
                    cx="80"
                    cy="80"
                    r={donutRadius}
                    fill="none"
                    stroke={seg.color}
                    strokeWidth="22"
                    strokeDasharray={`${dash} ${donutCircumference - dash}`}
                    strokeDashoffset={offset}
                  />
                );
              })}
            </svg>
            <div className="space-y-2 flex-1">
              {tierBreakdown.map((seg) => (
                <div key={seg.label} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-text-primary font-medium">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: seg.color }}></span>
                    {seg.label}
                  </span>
                  <span className="text-text-secondary font-mono text-[10px]">{seg.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-5 bg-white border border-border-subtle rounded-xl flex flex-col justify-between shadow-sm">
          <div>
            <h4 className="text-sm font-bold text-text-primary mb-1">Peak Entrance Hour Flow</h4>
            <p className="text-xs text-text-secondary mb-6">Traffic velocity breakdown measured in check-ins/hour</p>

            <div className="relative w-full h-[200px]">
              <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full overflow-visible">
                {[0, 0.25, 0.5, 0.75, 1].map((r, i) => {
                  const y = padding + r * (svgHeight - 2 * padding);
                  return (
                    <g key={i}>
                      <line x1={padding} y1={y} x2={svgWidth - padding} y2={y} stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
                      <text x={padding - 10} y={y + 3} fill="#94A3B8" fontSize="8" fontFamily="monospace" textAnchor="end">{Math.round(500 - r * 500)}</text>
                    </g>
                  );
                })}

                {peakData.map((d, i) => {
                  const x = getX(i) + 15;
                  const y = getY(d.attendees);
                  const colWidth = 35;
                  const colHeight = svgHeight - padding - y;
                  return (
                    <g key={i} className="group cursor-pointer">
                      <rect
                        x={x}
                        y={y}
                        width={colWidth}
                        height={colHeight}
                        rx="4"
                        fill="url(#barGrad)"
                        stroke="var(--color-secondary)"
                        strokeWidth="1"
                        className="transition-all duration-300 hover:fill-secondary hover:opacity-100"
                        opacity="0.85"
                      />
                      <text
                        x={x + colWidth / 2}
                        y={y - 6}
                        fill="var(--color-secondary)"
                        fontSize="9"
                        fontWeight="bold"
                        fontFamily="monospace"
                        textAnchor="middle"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        {d.attendees} scans
                      </text>
                      <text x={x + colWidth / 2} y={svgHeight - padding + 15} fill="var(--color-text-secondary)" fontSize="8" fontFamily="monospace" textAnchor="middle">{d.hour}</text>
                    </g>
                  );
                })}

                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-secondary)" /><stop offset="100%" stopColor="var(--color-secondary)" stopOpacity="0.2" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>
        </div>

        <div className="p-5 bg-white border border-border-subtle rounded-xl flex flex-col justify-between shadow-sm">
          <div>
            <h4 className="text-sm font-bold text-text-primary mb-1">Top Performing Channels</h4>
            <p className="text-xs text-text-secondary mb-4">Identify top traffic conversion pathways</p>

            <div className="divide-y divide-border-subtle">
              {channels.map((chan, i) => {
                const Icon = chan.icon;
                return (
                  <div key={i} className="py-3 flex items-center justify-between text-xs hover:bg-surface-container-low/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-secondary/10 border border-secondary/20 text-secondary rounded-lg shadow-sm">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-bold text-text-primary">{chan.name}</p>
                        <p className="text-[10px] text-on-surface-variant font-mono">{chan.visitors.toLocaleString()} Visited</p>
                      </div>
                    </div>

                    <div className="flex gap-6 items-center text-right font-mono text-xs">
                      <div>
                        <span className="text-[10px] text-on-surface-variant block font-bold">CVR</span>
                        <span className="font-bold text-text-primary">{chan.conversion}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-on-surface-variant block font-bold">REVENUE</span>
                        <span className="font-bold text-secondary">{chan.revenue}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-on-surface-variant" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
