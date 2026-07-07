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
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Platform Analytics</h2>
            <p className="text-xs text-slate-500">Interactive platform performance tracking metrics.</p>
          </div>
          {/* Chart Timeframe Controls */}
          <div className="flex rounded-xl bg-slate-100 border border-slate-200 p-1">
            {(['7d', '30d', '90d'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setAnalyticsTimeframe(t)}
                className={`rounded-lg px-3.5 py-1 text-xs font-medium uppercase transition-all duration-200 cursor-pointer ${
                  analyticsTimeframe === t 
                    ? 'bg-indigo-600 text-white shadow' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Interactive Chart Area */}
        <div className="mt-6 flex h-60 items-end gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
          {activeChart.map((d, index) => {
            const heightPercentage = Math.max(10, Math.min(100, (d.revenue / maxVal) * 85));
            const secondaryHeight = Math.max(15, Math.min(100, (d.users / Math.max(...activeChart.map(x=>x.users))) * 75));
            return (
              <div key={index} className="flex flex-1 flex-col items-center h-full justify-end group relative">
                {/* Values Tooltip */}
                <div className="opacity-0 group-hover:opacity-100 absolute -translate-y-24 bg-slate-900 border border-slate-800 text-white text-[10px] font-mono px-2 py-1 rounded-lg pointer-events-none transition-all duration-200 z-10 flex flex-col gap-0.5">
                  <span>Sales: ${d.revenue.toLocaleString()}K</span>
                  <span>Users: {d.users.toLocaleString()}</span>
                </div>

                <div className="flex gap-1.5 w-full items-end justify-center h-[85%]">
                  {/* Primary Bar (Revenue) */}
                  <div 
                    style={{ height: `${heightPercentage}%` }} 
                    className="w-4 rounded-t bg-indigo-500 transition-all duration-500 group-hover:bg-indigo-400 group-hover:shadow-lg group-hover:shadow-indigo-500/20"
                  />
                  {/* Secondary Bar (Users) */}
                  <div 
                    style={{ height: `${secondaryHeight}%` }} 
                    className="w-4 rounded-t bg-pink-500 transition-all duration-500 group-hover:bg-pink-400 group-hover:shadow-lg group-hover:shadow-pink-500/20"
                  />
                </div>
                <span className="mt-2 text-xs font-medium text-slate-500">{d.label}</span>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex items-center justify-center gap-6 border-t border-slate-100 pt-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded bg-indigo-500" />
            <span className="text-slate-600 font-medium">Revenue Stream ($K)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded bg-pink-500" />
            <span className="text-slate-600 font-medium">New Registrations</span>
          </div>
        </div>
      </div>

      {/* Revenue Breakdown */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-bold text-slate-900">Revenue breakdown</h2>
        <p className="text-xs text-slate-500">Total transaction split categories.</p>

        <div className="mt-6 flex flex-col items-center justify-center">
          {/* Interactive Donut Shape */}
          <div className="relative h-44 w-44">
            <svg className="h-full w-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="#6366f1"
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
                stroke="#ec4899"
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
                stroke="#06b6d4"
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
                  <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-widest">Tickets</span>
                  <span className="text-lg font-bold text-slate-800">72%</span>
                  <span className="text-[10px] text-slate-500 font-mono">${(grossRevenue * 0.72 / 1000).toFixed(0)}K</span>
                </>
              )}
              {hoveredRevenueCategory === 'fees' && (
                <>
                  <span className="text-[9px] font-bold text-pink-600 uppercase tracking-widest">Platform Fees</span>
                  <span className="text-lg font-bold text-slate-800">18%</span>
                  <span className="text-[10px] text-slate-500 font-mono">${(grossRevenue * 0.18 / 1000).toFixed(0)}K</span>
                </>
              )}
              {hoveredRevenueCategory === 'resale' && (
                <>
                  <span className="text-[9px] font-bold text-cyan-600 uppercase tracking-widest">Resale Comms</span>
                  <span className="text-lg font-bold text-slate-800">10%</span>
                  <span className="text-[10px] text-slate-500 font-mono">${(grossRevenue * 0.10 / 1000).toFixed(0)}K</span>
                </>
              )}
              {!hoveredRevenueCategory && (
                <>
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Total Gross</span>
                  <span className="text-lg font-bold text-slate-850">${(grossRevenue / 1000000).toFixed(2)}M</span>
                  <span className="text-[9px] text-emerald-600 font-mono">100% active</span>
                </>
              )}
            </div>
          </div>

          {/* Legend Labels */}
          <div className="mt-6 w-full space-y-2 text-xs">
            <div 
              className={`flex items-center justify-between rounded-xl p-2 transition-all ${hoveredRevenueCategory === 'tickets' ? 'bg-indigo-50' : ''}`}
              onMouseEnter={() => setHoveredRevenueCategory('tickets')}
              onMouseLeave={() => setHoveredRevenueCategory(null)}
            >
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded bg-indigo-500" />
                <span className="text-slate-700 font-medium">Ticket Sales</span>
              </div>
              <span className="text-slate-600 font-semibold">72%</span>
            </div>
            <div 
              className={`flex items-center justify-between rounded-xl p-2 transition-all ${hoveredRevenueCategory === 'fees' ? 'bg-pink-50' : ''}`}
              onMouseEnter={() => setHoveredRevenueCategory('fees')}
              onMouseLeave={() => setHoveredRevenueCategory(null)}
            >
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded bg-pink-500" />
                <span className="text-slate-700 font-medium">Platform Service Fees</span>
              </div>
              <span className="text-slate-600 font-semibold">18%</span>
            </div>
            <div 
              className={`flex items-center justify-between rounded-xl p-2 transition-all ${hoveredRevenueCategory === 'resale' ? 'bg-cyan-50' : ''}`}
              onMouseEnter={() => setHoveredRevenueCategory('resale')}
              onMouseLeave={() => setHoveredRevenueCategory(null)}
            >
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded bg-cyan-500" />
                <span className="text-slate-700 font-medium">Secondary Resale Comms</span>
              </div>
              <span className="text-slate-600 font-semibold">10%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
