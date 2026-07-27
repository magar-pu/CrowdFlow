"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { BarChart3, PieChart } from 'lucide-react';
import { formatIDR } from '@/lib/pricing';
import {
  getPlatformAnalytics,
  type AnalyticsRange,
  type PlatformAnalytics,
} from '@/lib/api/admin/dashboardService';

// Every figure on this panel comes from the analytics endpoint, which sums real
// orders/users/events rows. It previously rendered a hardcoded chartData table
// and a fixed 72/18/10 revenue donut, and added a flat 1,500,000 on top of the
// real revenue total — so the one number that WAS live was also the most
// misleading, being neither the true figure nor an obvious placeholder.

const RANGES: AnalyticsRange[] = ['7d', '30d', '90d'];

// The donut's three arcs, in draw order. Ticket face value is what buyers paid
// for admission; the rest is what the platform and the tax authority took on
// top. Together they sum to gross_amount.
const BREAKDOWN_SLICES = [
  { key: 'ticketFaceValue', label: 'Ticket Face Value', stroke: '#1D4ED8', dot: 'bg-secondary', text: 'text-secondary' },
  { key: 'platformFee', label: 'Platform Service Fees', stroke: '#14B8A6', dot: 'bg-tertiary', text: 'text-tertiary' },
  { key: 'gatewayFee', label: 'Payment Gateway Fees', stroke: '#22C55E', dot: 'bg-success', text: 'text-success' },
  { key: 'entertainmentTax', label: 'Entertainment Tax', stroke: '#F59E0B', dot: 'bg-warning', text: 'text-warning' },
] as const;

const CIRCUMFERENCE = 2 * Math.PI * 40; // r=40 in the 100x100 viewBox

export default function DashboardAnalyticsChart() {
  const [range, setRange] = useState<AnalyticsRange>('30d');
  const [data, setData] = useState<PlatformAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await getPlatformAnalytics(range);
    if (res.success && res.data) {
      setData(res.data);
    } else {
      setError(res.error?.message ?? 'Failed to load platform analytics');
      setData(null);
    }
    setLoading(false);
  }, [range]);

  useEffect(() => {
    load();
  }, [load]);

  const series = data?.series ?? [];
  const breakdown = data?.breakdown;

  // Scale off the real maximum. Guarded so an all-zero period (a genuine state
  // on a new platform) divides by 1 rather than producing NaN heights.
  const maxRevenue = Math.max(1, ...series.map(d => d.revenue));
  const maxRegistrations = Math.max(1, ...series.map(d => d.registrations));
  const hasActivity = series.some(d => d.revenue > 0 || d.registrations > 0 || d.events > 0);

  const breakdownTotal = BREAKDOWN_SLICES.reduce(
    (sum, slice) => sum + (breakdown?.[slice.key] ?? 0),
    0
  );

  // Arc lengths are proportional to the real amounts; offsets accumulate so the
  // slices sit end to end.
  let offset = 0;
  const arcs = BREAKDOWN_SLICES.map(slice => {
    const value = breakdown?.[slice.key] ?? 0;
    const fraction = breakdownTotal > 0 ? value / breakdownTotal : 0;
    const length = fraction * CIRCUMFERENCE;
    const arc = { ...slice, value, fraction, length, offset };
    offset += length;
    return arc;
  });

  const rangeControls = (
    <div className="flex rounded-lg border border-border-subtle bg-surface p-1">
      {RANGES.map((t) => (
        <button
          key={t}
          onClick={() => setRange(t)}
          className={`rounded-lg px-3.5 py-1 text-xs font-medium uppercase transition-all duration-200 cursor-pointer ${
            range === t
              ? 'bg-primary text-on-primary shadow-sm'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          {t}
        </button>
      ))}
    </div>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Platform Analytics */}
      <div className="rounded-lg border border-border-subtle bg-surface-white p-6 shadow-sm lg:col-span-2">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-text-primary">Platform Analytics</h2>
            <p className="text-xs text-text-secondary">Gross ticket revenue and new registrations.</p>
          </div>
          {rangeControls}
        </div>

        {loading && <div className="mt-6 h-60 animate-pulse rounded-lg bg-surface-container" />}

        {!loading && error && (
          <div className="mt-6 flex h-60 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-danger/30 bg-danger/5 text-center">
            <p className="text-xs font-bold text-danger">{error}</p>
            <button onClick={load} className="text-xs font-bold text-secondary hover:underline cursor-pointer">
              Retry
            </button>
          </div>
        )}

        {!loading && !error && !hasActivity && (
          <div className="mt-6 flex h-60 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border-subtle bg-surface text-center">
            <BarChart3 className="h-5 w-5 text-on-surface-variant" />
            <p className="text-xs font-bold text-text-primary">No activity in this period</p>
            <p className="text-[11px] text-text-secondary">
              Revenue and registrations will appear here once orders are paid.
            </p>
          </div>
        )}

        {!loading && !error && hasActivity && (
          <>
            <div className="mt-6 flex h-60 items-end gap-3 overflow-x-auto rounded-lg border border-border-subtle bg-surface p-4">
              {series.map((d, index) => {
                const revenueHeight = (d.revenue / maxRevenue) * 85;
                const registrationHeight = (d.registrations / maxRegistrations) * 75;
                return (
                  <div key={`${d.label}-${index}`} className="group relative flex h-full min-w-10 flex-1 flex-col items-center justify-end">
                    <div className="pointer-events-none absolute z-10 flex -translate-y-24 flex-col gap-0.5 rounded-lg border border-border-subtle bg-primary px-2 py-1 text-[10px] text-on-primary opacity-0 shadow-md transition-all duration-200 group-hover:opacity-100">
                      <span>Revenue: {formatIDR(d.revenue)}</span>
                      <span>Registrations: {d.registrations.toLocaleString()}</span>
                      <span>Tickets: {d.ticketsSold.toLocaleString()}</span>
                    </div>

                    <div className="flex h-[85%] w-full items-end justify-center gap-1.5">
                      <div
                        style={{ height: `${revenueHeight}%` }}
                        className="w-4 rounded-t bg-secondary transition-all duration-500 group-hover:bg-secondary-container"
                      />
                      <div
                        style={{ height: `${registrationHeight}%` }}
                        className="w-4 rounded-t bg-tertiary transition-all duration-500 group-hover:bg-tertiary/80"
                      />
                    </div>
                    <span className="mt-2 whitespace-nowrap text-xs font-medium text-text-secondary">{d.label}</span>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-6 border-t border-border-subtle pt-4 text-xs">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded bg-secondary" />
                <span className="font-medium text-text-secondary">Gross Revenue (IDR)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded bg-tertiary" />
                <span className="font-medium text-text-secondary">New Registrations</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Revenue Breakdown */}
      <div className="rounded-lg border border-border-subtle bg-surface-white p-6 shadow-sm">
        <h2 className="text-base font-bold text-text-primary">Revenue Breakdown</h2>
        <p className="text-xs text-text-secondary">Paid orders split by component.</p>

        {loading && <div className="mt-6 h-44 animate-pulse rounded-lg bg-surface-container" />}

        {!loading && breakdownTotal === 0 && (
          <div className="mt-6 flex h-44 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border-subtle bg-surface text-center">
            <PieChart className="h-5 w-5 text-on-surface-variant" />
            <p className="text-xs font-bold text-text-primary">No paid orders yet</p>
            <p className="text-[11px] text-text-secondary">There is no revenue to break down for this period.</p>
          </div>
        )}

        {!loading && breakdownTotal > 0 && (
          <div className="mt-6 flex flex-col items-center justify-center">
            <div className="relative h-44 w-44">
              <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
                {arcs.map(arc => (
                  <circle
                    key={arc.key}
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke={arc.stroke}
                    strokeWidth="12"
                    strokeDasharray={`${arc.length} ${CIRCUMFERENCE}`}
                    strokeDashoffset={-arc.offset}
                    className="cursor-pointer transition-all duration-300"
                    onMouseEnter={() => setHovered(arc.key)}
                    onMouseLeave={() => setHovered(null)}
                  />
                ))}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                {(() => {
                  const active = arcs.find(a => a.key === hovered);
                  if (active) {
                    return (
                      <>
                        <span className={`text-[9px] font-bold uppercase tracking-widest ${active.text}`}>
                          {active.label}
                        </span>
                        <span className="text-lg font-bold text-text-primary">
                          {Math.round(active.fraction * 100)}%
                        </span>
                        <span className="text-[10px] text-text-secondary">{formatIDR(active.value)}</span>
                      </>
                    );
                  }
                  return (
                    <>
                      <span className="text-[9px] font-bold uppercase tracking-widest text-text-secondary">
                        Total Gross
                      </span>
                      <span className="text-base font-bold text-text-primary">{formatIDR(breakdownTotal)}</span>
                    </>
                  );
                })()}
              </div>
            </div>

            <div className="mt-6 w-full space-y-2 text-xs">
              {arcs.map(arc => (
                <div
                  key={arc.key}
                  className={`flex items-center justify-between rounded-lg p-2 transition-all ${hovered === arc.key ? 'bg-surface-container-low' : ''}`}
                  onMouseEnter={() => setHovered(arc.key)}
                  onMouseLeave={() => setHovered(null)}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded ${arc.dot}`} />
                    <span className="truncate font-medium text-text-primary">{arc.label}</span>
                  </div>
                  <span className="shrink-0 font-semibold text-text-secondary">
                    {Math.round(arc.fraction * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
