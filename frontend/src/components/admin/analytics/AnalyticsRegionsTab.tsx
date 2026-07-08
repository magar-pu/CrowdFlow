"use client";

import React from 'react';
import { MapPin } from 'lucide-react';

export default function AnalyticsRegionsTab() {
  const regions = [
    { name: 'Jakarta (Southeast Asia)', sales: 1867500, percentage: 55, trend: '+14%', color: 'bg-indigo-500' },
    { name: 'San Francisco (North America)', sales: 2060000, percentage: 30, trend: '+8%', color: 'bg-pink-500' },
    { name: 'London (Europe)', sales: 936000, percentage: 10, trend: '+5%', color: 'bg-cyan-500' },
    { name: 'Dubai (Middle East)', sales: 1500000, percentage: 5, trend: '+22%', color: 'bg-amber-500' }
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Regional Sales Vector tables */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 shadow-sm lg:col-span-2">
        <h2 className="text-base font-bold text-white">Regional Sales Distribution</h2>
        <p className="text-xs text-slate-400">Tracking regional revenue demand across different continents.</p>

        <div className="mt-5 space-y-4">
          {regions.map((region, i) => (
            <div key={i} className="flex flex-col gap-2 rounded-xl border border-slate-900 bg-slate-900/10 p-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-200 flex items-center gap-1.5">
                  <MapPin className="h-4.5 w-4.5 text-indigo-400" />
                  {region.name}
                </span>
                <span className="font-mono text-slate-400 font-bold">${region.sales.toLocaleString()}</span>
              </div>
              {/* Dynamic bar */}
              <div className="h-2 w-full rounded bg-slate-900 overflow-hidden">
                <div className={`h-full ${region.color}`} style={{ width: `${region.percentage}%` }} />
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500">
                <span>{region.percentage}% overall trading contribution</span>
                <span className="text-emerald-400 font-bold">Trend {region.trend}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Regional distribution metrics */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 shadow-sm flex flex-col justify-between">
        <div>
          <h2 className="text-base font-bold text-white">Geographic Focus</h2>
          <p className="text-xs text-slate-400">Primary location targeting indicators.</p>
        </div>
        
        <div className="py-6 flex justify-center items-center h-48 border border-dashed border-slate-900 rounded-2xl">
          <div className="text-center">
            <span className="text-3xl font-extrabold text-indigo-500">APAC</span>
            <p className="text-xs text-slate-300 font-semibold mt-1">Leading Regional Market</p>
            <p className="text-[10px] text-slate-500">representing 55% of global sales pipelines</p>
          </div>
        </div>
        <div className="text-[11px] text-slate-500 text-center leading-relaxed">
          Target marketing efforts are optimized for Southeast Asian metropolitan centers.
        </div>
      </div>
    </div>
  );
}
