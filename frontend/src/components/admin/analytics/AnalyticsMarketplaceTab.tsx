"use client";

import React from 'react';
import { BarChart3 } from 'lucide-react';

export default function AnalyticsMarketplaceTab() {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Marketplace Cap violators */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 shadow-sm lg:col-span-2">
        <div className="flex items-center justify-between border-b border-slate-900 pb-4">
          <div>
            <h2 className="text-base font-bold text-white">Resale price cap constraints</h2>
            <p className="text-xs text-slate-400">Protecting event attendees from astronomical secondary inflation.</p>
          </div>
          <span className="rounded bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 text-[10px] font-mono text-rose-400 font-bold uppercase animate-pulse">
            Price Cap: 120%
          </span>
        </div>

        <div className="mt-5 space-y-4">
          <div className="rounded-xl border border-slate-900 bg-slate-900/20 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200">Neon Nights VIP All-Access</span>
              <span className="font-mono text-xs text-slate-400">Cap Limit: $420</span>
            </div>
            <div className="mt-2.5 h-2 w-full rounded bg-slate-800 overflow-hidden relative">
              <div className="absolute left-0 top-0 h-full bg-emerald-500" style={{ width: '80%' }} />
              <div className="absolute right-0 top-0 h-full bg-rose-500" style={{ width: '20%' }} />
            </div>
            <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
              <span>80% transactions at or below Cap</span>
              <span className="text-rose-450 font-bold">20% violations intercepted</span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-900 bg-slate-900/20 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200">Tech Summit 2024 - Elite Pass</span>
              <span className="font-mono text-xs text-slate-400">Cap Limit: $600</span>
            </div>
            <div className="mt-2.5 h-2 w-full rounded bg-slate-800 overflow-hidden relative">
              <div className="absolute left-0 top-0 h-full bg-emerald-500" style={{ width: '95%' }} />
              <div className="absolute right-0 top-0 h-full bg-rose-500" style={{ width: '5%' }} />
            </div>
            <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
              <span>95% compliant transactions</span>
              <span className="text-rose-450 font-bold">5% violations intercepted</span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-900 bg-slate-900/20 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200">Pro Tennis Open - Court Side A</span>
              <span className="font-mono text-xs text-slate-400">Cap Limit: $144</span>
            </div>
            <div className="mt-2.5 h-2 w-full rounded bg-slate-800 overflow-hidden relative">
              <div className="absolute left-0 top-0 h-full bg-emerald-500" style={{ width: '91%' }} />
              <div className="absolute right-0 top-0 h-full bg-rose-500" style={{ width: '9%' }} />
            </div>
            <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
              <span>91% compliant transactions</span>
              <span className="text-rose-455 font-bold">9% violations intercepted</span>
            </div>
          </div>
        </div>
      </div>

      {/* Reseller volume stats */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 shadow-sm">
        <h2 className="text-base font-bold text-white">Resale Comms Splits</h2>
        <p className="text-xs text-slate-400">Volume and profit analytics on resale commission flows.</p>

        <div className="mt-6 flex flex-col justify-center h-48 border border-dashed border-slate-900 rounded-2xl items-center p-4">
          <BarChart3 className="h-8 w-8 text-indigo-400 animate-pulse mb-2" />
          <p className="text-xs text-slate-300 font-semibold">Total Marketplace Resell Volume</p>
          <p className="text-xl font-bold text-white mt-1">$412,800</p>
          <p className="text-[10px] text-slate-500 mt-0.5">10% commission harvested: $41,280</p>
        </div>
      </div>
    </div>
  );
}
