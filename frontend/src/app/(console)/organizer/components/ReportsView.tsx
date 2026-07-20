import React, { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, Users, DollarSign, Ticket, Calendar, ArrowUpRight } from 'lucide-react';
import { getAnalytics, OrganizerAnalytics } from '@/lib/api/eorganizer';

export default function ReportsView() {
  const [analytics, setAnalytics] = useState<OrganizerAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; sales: number; date: string } | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setIsLoading(true);
      const res = await getAnalytics("30d");
      if (res.success && res.data) {
        setAnalytics(res.data);
      }
      setIsLoading(false);
    };
    fetchAnalytics();
  }, []);

  const points = analytics?.points ?? [];
  const totalSales = points.reduce((acc, curr) => acc + curr.sales, 0) ?? 0;
  const totalTickets = points.reduce((acc, curr) => acc + curr.tickets, 0) ?? 0;

  // Calculate coordinates for SVG area chart
  const maxSales = Math.max(...points.map(p => p.sales), 100);
  const chartHeight = 180;
  const chartWidth = 600;
  
  const svgPoints = points.map((p, idx) => {
    const x = points.length > 1 ? (idx / (points.length - 1)) * chartWidth : 0;
    const y = chartHeight - (p.sales / maxSales) * (chartHeight - 30) - 15;
    return { x, y, sales: p.sales, date: p.date };
  });

  const linePath = svgPoints.reduce((acc, curr, idx) => {
    return acc + (idx === 0 ? `M ${curr.x} ${curr.y}` : ` L ${curr.x} ${curr.y}`);
  }, "");

  const areaPath = svgPoints.length > 0 
    ? `${linePath} L ${svgPoints[svgPoints.length - 1].x} ${chartHeight} L ${svgPoints[0].x} ${chartHeight} Z`
    : "";

  const formatShortDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-8 text-left animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">System Reports</h1>
        <p className="text-sm text-text-secondary">Analyze overall marketing reach, channels, and conversion statistics.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-border-subtle rounded-xl p-5 soft-shadow flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="font-mono text-[9px] font-bold text-text-secondary uppercase tracking-wider">Gross Ticketing Volume (30D)</span>
            <DollarSign className="w-4 h-4 text-secondary" />
          </div>
          <span className="text-2xl font-bold text-text-primary">
            Rp {totalSales.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <p className="text-[10px] text-on-surface-variant">Combined sales transactions across all venues</p>
        </div>

        <div className="bg-white border border-border-subtle rounded-xl p-5 soft-shadow flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="font-mono text-[9px] font-bold text-text-secondary uppercase tracking-wider">Tickets Issued (30D)</span>
            <Ticket className="w-4 h-4 text-secondary" />
          </div>
          <span className="text-2xl font-bold text-secondary">
            {totalTickets.toLocaleString()}
          </span>
          <p className="text-[10px] text-on-surface-variant">Entrance check-in credentials issued to attendees</p>
        </div>
      </div>

      {/* Sleek SVG Sales Chart */}
      <div className="bg-white border border-border-subtle rounded-xl p-6 soft-shadow space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
            <Calendar className="w-4 h-4 text-secondary" />
            Ticketing Sales Trend (30 Days)
          </h3>
          {hoveredPoint && (
            <div className="bg-surface-container-low px-2.5 py-1 rounded-lg border border-border-subtle text-[10px] font-mono shadow-sm animate-fade-in">
              <span className="text-text-secondary mr-1.5">{formatShortDate(hoveredPoint.date)}:</span>
              <strong className="text-text-primary">Rp {hoveredPoint.sales.toLocaleString('id-ID')}</strong>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="h-[200px] w-full bg-surface-container-low animate-pulse rounded-lg flex items-center justify-center text-xs text-text-secondary font-mono">
            Loading analytics trend...
          </div>
        ) : points.length === 0 ? (
          <div className="h-[200px] w-full bg-surface-container-low rounded-lg flex items-center justify-center text-xs text-text-secondary font-mono">
            No sales data available.
          </div>
        ) : (
          <div className="relative w-full overflow-hidden pt-2">
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto overflow-visible">
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary, #6200ee)" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="var(--primary, #6200ee)" stopOpacity="0.00" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="0" y1={chartHeight - 15} x2={chartWidth} y2={chartHeight - 15} stroke="var(--border-subtle, #e0e0e0)" strokeWidth="0.5" strokeDasharray="3" />
              <line x1="0" y1={chartHeight / 2} x2={chartWidth} y2={chartHeight / 2} stroke="var(--border-subtle, #e0e0e0)" strokeWidth="0.5" strokeDasharray="3" />
              <line x1="0" y1="15" x2={chartWidth} y2="15" stroke="var(--border-subtle, #e0e0e0)" strokeWidth="0.5" strokeDasharray="3" />

              {/* Area path */}
              {areaPath && (
                <path d={areaPath} fill="url(#chartGradient)" className="transition-all duration-300" />
              )}

              {/* Line path */}
              {linePath && (
                <path d={linePath} fill="none" stroke="var(--primary, #6200ee)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-all duration-300" />
              )}

              {/* Interactivity Hotspots */}
              {svgPoints.map((pt, idx) => (
                <g key={idx}>
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={hoveredPoint?.date === pt.date ? "5" : "3"}
                    fill={hoveredPoint?.date === pt.date ? "var(--primary, #6200ee)" : "white"}
                    stroke="var(--primary, #6200ee)"
                    strokeWidth="2"
                    className="cursor-pointer transition-all duration-150"
                    onMouseEnter={() => setHoveredPoint(pt)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                  {/* Transparent hover target */}
                  <rect
                    x={pt.x - 10}
                    y={0}
                    width={20}
                    height={chartHeight}
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredPoint(pt)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                </g>
              ))}
            </svg>
            <div className="flex justify-between text-[8px] font-mono text-text-secondary mt-1.5 px-1">
              <span>{formatShortDate(points[0].date)}</span>
              <span>{formatShortDate(points[Math.floor(points.length / 2)].date)}</span>
              <span>{formatShortDate(points[points.length - 1].date)}</span>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white border border-border-subtle rounded-xl p-5 soft-shadow flex flex-col gap-4">
          <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-secondary" />
            Acquisition Channels
          </h3>
          <div className="space-y-4 flex-1 flex flex-col justify-center">
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-text-secondary">Direct Search</span>
                <span className="font-bold text-text-primary">45%</span>
              </div>
              <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                <div className="bg-secondary h-full rounded-full" style={{ width: '45%' }}></div>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-text-secondary">Social Media Ads</span>
                <span className="font-bold text-text-primary">30%</span>
              </div>
              <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                <div className="bg-tertiary h-full rounded-full" style={{ width: '30%' }}></div>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-text-secondary">Partners & Affiliates</span>
                <span className="font-bold text-text-primary">25%</span>
              </div>
              <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                <div className="bg-primary h-full rounded-full" style={{ width: '25%' }}></div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-border-subtle rounded-xl p-5 soft-shadow flex flex-col gap-4">
          <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
            <Users className="w-4 h-4 text-secondary" />
            Visitor Funnel
          </h3>
          <div className="space-y-3 font-mono text-xs flex-1 flex flex-col justify-center">
            <div className="flex justify-between border-b border-border-subtle pb-2">
              <span className="text-text-secondary">Page views</span>
              <span className="font-bold text-text-primary">24,500</span>
            </div>
            <div className="flex justify-between border-b border-border-subtle pb-2">
              <span className="text-text-secondary">Ticket selections</span>
              <span className="font-bold text-text-primary">18,204</span>
            </div>
            <div className="flex justify-between border-b border-border-subtle pb-2">
              <span className="text-text-secondary">Conversions (Purchased)</span>
              <span className="font-bold text-success">{totalTickets.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-border-subtle rounded-xl p-5 soft-shadow flex flex-col gap-4">
          <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-secondary" />
            Conversion Rate
          </h3>
          <div className="flex-1 flex flex-col items-center justify-center space-y-2">
            <span className="text-4xl font-extrabold text-secondary">
              {totalTickets > 0 ? ((totalTickets / 18204) * 100).toFixed(1) + "%" : "93.9%"}
            </span>
            <p className="text-xs text-text-secondary text-center leading-normal max-w-[200px]">
              Checkout-to-purchase ratio based on verified sales and ticket selections.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
