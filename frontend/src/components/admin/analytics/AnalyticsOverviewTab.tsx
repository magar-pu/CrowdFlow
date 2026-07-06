"use client";

import React from 'react';
import { Sparkles } from 'lucide-react';

export default function AnalyticsOverviewTab() {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Revenue trends SVG Area Chart */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 shadow-sm lg:col-span-2">
        <div className="flex items-center justify-between border-b border-slate-900 pb-4">
          <div>
            <h2 className="text-base font-bold text-white">Platform Revenue Trends</h2>
            <p className="text-xs text-slate-400">Audited monthly ticket revenue pipelines.</p>
          </div>
          <span className="text-2xs font-mono text-indigo-400 uppercase tracking-widest">Active Fiscal Cycle</span>
        </div>

        {/* Area Chart SVG Layout */}
        <div className="mt-6 relative h-64 bg-slate-900/10 rounded-2xl p-4 flex items-end">
          <svg className="absolute inset-0 h-full w-full p-4 overflow-visible" viewBox="0 0 500 200" preserveAspectRatio="none">
            <defs>
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3"/>
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0"/>
              </linearGradient>
            </defs>
            {/* Horizontal Guide lines */}
            <line x1="0" y1="50" x2="500" y2="50" stroke="#1e293b" strokeWidth="1" strokeDasharray="4 4" />
            <line x1="0" y1="100" x2="500" y2="100" stroke="#1e293b" strokeWidth="1" strokeDasharray="4 4" />
            <line x1="0" y1="150" x2="500" y2="150" stroke="#1e293b" strokeWidth="1" strokeDasharray="4 4" />

            {/* Area Path */}
            <path
              d="M 0,200 L 0,160 L 100,140 L 200,120 L 300,90 L 400,60 L 500,40 L 500,200 Z"
              fill="url(#chartGradient)"
            />
            {/* Line Path */}
            <path
              d="M 0,160 L 100,140 L 200,120 L 300,90 L 400,60 L 500,40"
              fill="none"
              stroke="#6366f1"
              strokeWidth="3"
              strokeLinecap="round"
            />
            {/* Dot markers */}
            <circle cx="0" cy="160" r="5" fill="#6366f1" stroke="#ffffff" strokeWidth="1.5" />
            <circle cx="100" cy="140" r="5" fill="#6366f1" stroke="#ffffff" strokeWidth="1.5" />
            <circle cx="200" cy="120" r="5" fill="#6366f1" stroke="#ffffff" strokeWidth="1.5" />
            <circle cx="300" cy="90" r="5" fill="#6366f1" stroke="#ffffff" strokeWidth="1.5" />
            <circle cx="400" cy="60" r="5" fill="#6366f1" stroke="#ffffff" strokeWidth="1.5" />
            <circle cx="500" cy="40" r="5" fill="#6366f1" stroke="#ffffff" strokeWidth="1.5" />
          </svg>
          
          {/* X Axis labels */}
          <div className="absolute inset-x-0 bottom-1 flex justify-between px-6 text-[9px] font-mono text-slate-500">
            <span>Jan (Launch)</span>
            <span>Feb</span>
            <span>Mar</span>
            <span>Apr</span>
            <span>May</span>
            <span>Jun (Present)</span>
          </div>
        </div>
        
        <div className="mt-4 text-center text-xs text-slate-500 font-medium">
          Gross platform trading is currently scaling at <span className="text-emerald-400 font-bold">142% year-on-year</span> with low volatility.
        </div>
      </div>

      {/* Platform Insights Panel */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 shadow-sm">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Sparkles className="h-4.5 w-4.5 text-indigo-400" />
          <span>Platform Insights</span>
        </h2>
        <p className="text-xs text-slate-400">Machine calculated analytics summaries.</p>

        <div className="mt-5 space-y-4 text-xs leading-relaxed">
          <div className="rounded-xl bg-slate-900/30 border border-slate-900 p-3.5">
            <h4 className="font-bold text-slate-200">Scalp Protection Velocity</h4>
            <p className="mt-1 text-slate-400">Our standard pricing caps restricted ticket reselling inflation by an average of <span className="text-emerald-400 font-semibold">124%</span>, retaining wealth within original consumer groups.</p>
          </div>

          <div className="rounded-xl bg-slate-900/30 border border-slate-900 p-3.5">
            <h4 className="font-bold text-slate-200">Device Scan Sync Latency</h4>
            <p className="mt-1 text-slate-400">Offline database synchronization lag is currently averaging <span className="text-indigo-400 font-semibold">1.4 seconds</span> across active handheld scanner nodes.</p>
          </div>

          <div className="rounded-xl bg-slate-900/30 border border-slate-900 p-3.5">
            <h4 className="font-bold text-slate-200">Payout Settlement Time</h4>
            <p className="mt-1 text-slate-400">Organizer payout settlement averages <span className="text-pink-400 font-semibold">24.5 hours</span> post event-audit compliance verification.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
