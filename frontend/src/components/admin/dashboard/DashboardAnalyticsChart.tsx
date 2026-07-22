"use client";

import React, { useState } from 'react';
import { Event } from '@/types/admin';

interface DashboardAnalyticsChartProps {
  events: Event[];
}

export default function DashboardAnalyticsChart({ events }: DashboardAnalyticsChartProps) {
  const [analyticsTimeframe, setAnalyticsTimeframe] = useState<'7d' | '30d' | '90d'>('30d');
  const [hoveredRevenueCategory, setHoveredRevenueCategory] = useState<string | null>(null);

  const grossRevenue = events.reduce((sum, e) => sum + e.totalRevenue, 0) + 1500000;

  // Mock analytics charts data
  const chartData = {
    '7d': [
      { label: 'Mon', revenue: 120, users: 400, events: 2 },
      { label: 'Tue', revenue: 150, users: 450, events: 1 },
      { label: 'Wed', revenue: 180, users: 500, events: 3 },
      { label: 'Thu', revenue: 220, users: 550, events: 2 },
      { label: 'Fri', revenue: 290, users: 680, events: 4 },
      { label: 'Sat', revenue: 340, users: 720, events: 5 },
      { label: 'Sun', revenue: 310, users: 790, events: 3 },
    ],
    '30d': [
      { label: 'W1', revenue: 1200, users: 2400, events: 12 },
      { label: 'W2', revenue: 1540, users: 3100, events: 14 },
      { label: 'W3', revenue: 1890, users: 4300, events: 15 },
      { label: 'W4', revenue: 2363, users: 5800, events: 17 },
    ],
    '90d': [
      { label: 'Apr', revenue: 4500, users: 11000, events: 32 },
      { label: 'May', revenue: 5200, users: 14500, events: 35 },
      { label: 'Jun', revenue: 6363, users: 24152, events: 41 },
    ]
  };

  const activeChart = chartData[analyticsTimeframe];
  const maxVal = Math.max(...activeChart.map(d => d.revenue));

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Platform Analytics Line/Bar Chart */}
      <div className="rounded-lg border border-border-subtle bg-surface-white p-6 shadow-sm lg:col-span-2">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-text-primary">Platform Analytics</h2>
            <p className="text-xs text-text-secondary">Ticket sales and registration performance.</p>
          </div>
          {/* Chart Timeframe Controls */}
          <div className="flex rounded-lg border border-border-subtle bg-surface p-1">
            {(['7d', '30d', '90d'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setAnalyticsTimeframe(t)}
                className={`rounded-lg px-3.5 py-1 text-xs font-medium uppercase transition-all duration-200 cursor-pointer ${
                  analyticsTimeframe === t 
                    ? 'bg-primary text-on-primary shadow-sm' 
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Interactive Chart Area */}
        <div className="mt-6 flex h-60 items-end gap-3 rounded-lg border border-border-subtle bg-surface p-4">
          {activeChart.map((d, index) => {
            const heightPercentage = Math.max(10, Math.min(100, (d.revenue / maxVal) * 85));
            const secondaryHeight = Math.max(15, Math.min(100, (d.users / Math.max(...activeChart.map(x=>x.users))) * 75));
            return (
              <div key={index} className="flex flex-1 flex-col items-center h-full justify-end group relative">
                {/* Values Tooltip */}
                <div className="absolute z-10 flex -translate-y-24 flex-col gap-0.5 rounded-lg border border-border-subtle bg-primary px-2 py-1 text-[10px] text-on-primary opacity-0 shadow-md transition-all duration-200 pointer-events-none group-hover:opacity-100">
                  <span>Sales: ${d.revenue.toLocaleString()}K</span>
                  <span>Users: {d.users.toLocaleString()}</span>
                </div>

                <div className="flex gap-1.5 w-full items-end justify-center h-[85%]">
                  {/* Primary Bar (Revenue) */}
                  <div 
                    style={{ height: `${heightPercentage}%` }} 
                    className="w-4 rounded-t bg-secondary transition-all duration-500 group-hover:bg-secondary-container"
                  />
                  {/* Secondary Bar (Users) */}
                  <div 
                    style={{ height: `${secondaryHeight}%` }} 
                    className="w-4 rounded-t bg-tertiary transition-all duration-500 group-hover:bg-tertiary/80"
                  />
                </div>
                <span className="mt-2 text-xs font-medium text-text-secondary">{d.label}</span>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex items-center justify-center gap-6 border-t border-border-subtle pt-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded bg-secondary" />
            <span className="font-medium text-text-secondary">Revenue Stream ($K)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded bg-tertiary" />
            <span className="font-medium text-text-secondary">New Registrations</span>
          </div>
        </div>
      </div>

      {/* Revenue Breakdown */}
      <div className="rounded-lg border border-border-subtle bg-surface-white p-6 shadow-sm">
        <h2 className="text-base font-bold text-text-primary">Revenue Breakdown</h2>
        <p className="text-xs text-text-secondary">Total transaction split by category.</p>

        <div className="mt-6 flex flex-col items-center justify-center">
          {/* Interactive Donut Shape */}
          <div className="relative h-44 w-44">
            <svg className="h-full w-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="#1D4ED8"
                strokeWidth="12"
                strokeDasharray="180.95 251.32"
                className="transition-all duration-300 cursor-pointer"
                onMouseEnter={() => setHoveredRevenueCategory('tickets')}
                onMouseLeave={() => setHoveredRevenueCategory(null)}
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="#14B8A6"
                strokeWidth="12"
                strokeDasharray="45.23 251.32"
                strokeDashoffset="-180.95"
                className="transition-all duration-300 cursor-pointer"
                onMouseEnter={() => setHoveredRevenueCategory('fees')}
                onMouseLeave={() => setHoveredRevenueCategory(null)}
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="#22C55E"
                strokeWidth="12"
                strokeDasharray="25.13 251.32"
                strokeDashoffset="-226.18"
                className="transition-all duration-300 cursor-pointer"
                onMouseEnter={() => setHoveredRevenueCategory('resale')}
                onMouseLeave={() => setHoveredRevenueCategory(null)}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              {hoveredRevenueCategory === 'tickets' && (
                <>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-secondary">Tickets</span>
                  <span className="text-lg font-bold text-text-primary">72%</span>
                  <span className="text-[10px] text-text-secondary">${(grossRevenue * 0.72 / 1000).toFixed(0)}K</span>
                </>
              )}
              {hoveredRevenueCategory === 'fees' && (
                <>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-tertiary">Platform Fees</span>
                  <span className="text-lg font-bold text-text-primary">18%</span>
                  <span className="text-[10px] text-text-secondary">${(grossRevenue * 0.18 / 1000).toFixed(0)}K</span>
                </>
              )}
              {hoveredRevenueCategory === 'resale' && (
                <>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-success">Resale Fees</span>
                  <span className="text-lg font-bold text-text-primary">10%</span>
                  <span className="text-[10px] text-text-secondary">${(grossRevenue * 0.10 / 1000).toFixed(0)}K</span>
                </>
              )}
              {!hoveredRevenueCategory && (
                <>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-text-secondary">Total Gross</span>
                  <span className="text-lg font-bold text-text-primary">${(grossRevenue / 1000000).toFixed(2)}M</span>
                  <span className="text-[9px] text-success">100% active</span>
                </>
              )}
            </div>
          </div>

          {/* Legend Labels */}
          <div className="mt-6 w-full space-y-2 text-xs">
            <div 
              className={`flex items-center justify-between rounded-lg p-2 transition-all ${hoveredRevenueCategory === 'tickets' ? 'bg-secondary/5' : ''}`}
              onMouseEnter={() => setHoveredRevenueCategory('tickets')}
              onMouseLeave={() => setHoveredRevenueCategory(null)}
            >
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded bg-secondary" />
                <span className="font-medium text-text-primary">Ticket Sales</span>
              </div>
              <span className="font-semibold text-text-secondary">72%</span>
            </div>
            <div 
              className={`flex items-center justify-between rounded-lg p-2 transition-all ${hoveredRevenueCategory === 'fees' ? 'bg-tertiary/5' : ''}`}
              onMouseEnter={() => setHoveredRevenueCategory('fees')}
              onMouseLeave={() => setHoveredRevenueCategory(null)}
            >
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded bg-tertiary" />
                <span className="font-medium text-text-primary">Platform Service Fees</span>
              </div>
              <span className="font-semibold text-text-secondary">18%</span>
            </div>
            <div 
              className={`flex items-center justify-between rounded-lg p-2 transition-all ${hoveredRevenueCategory === 'resale' ? 'bg-success/5' : ''}`}
              onMouseEnter={() => setHoveredRevenueCategory('resale')}
              onMouseLeave={() => setHoveredRevenueCategory(null)}
            >
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded bg-success" />
                <span className="font-medium text-text-primary">Secondary Resale Fees</span>
              </div>
              <span className="font-semibold text-text-secondary">10%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
