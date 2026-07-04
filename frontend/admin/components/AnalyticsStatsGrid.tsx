"use client";

import React from 'react';
import { TrendingUp, BarChart3, Ticket, ShieldCheck, ArrowUpRight } from 'lucide-react';
import { Event } from '../types';

interface AnalyticsStatsGridProps {
  events: Event[];
}

export default function AnalyticsStatsGrid({ events }: AnalyticsStatsGridProps) {
  const totalRevenue = events.reduce((sum, e) => sum + e.totalRevenue, 0) + 1500000;
  const platformProfit = totalRevenue * 0.18; // 18% fee calculation
  const totalTickets = events.reduce((sum, e) => sum + e.ticketsSold, 0) + 30470;
  const avgTicketPrice = totalRevenue / totalTickets || 0;

  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-4">
      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Sales Volume</span>
          <TrendingUp className="h-4 w-4 text-indigo-400" />
        </div>
        <p className="mt-2 text-2xl font-bold text-white">${totalRevenue.toLocaleString()}</p>
        <span className="mt-1 block text-3xs text-emerald-400 font-semibold flex items-center gap-0.5">
          <ArrowUpRight className="h-3 w-3" /> +14.2% MoM velocity
        </span>
      </div>
      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Net Platform Fees</span>
          <BarChart3 className="h-4 w-4 text-pink-400" />
        </div>
        <p className="mt-2 text-2xl font-bold text-white">${platformProfit.toLocaleString()}</p>
        <span className="mt-1 block text-3xs text-emerald-400 font-semibold flex items-center gap-0.5">
          <ArrowUpRight className="h-3 w-3" /> +18.0% standard clip
        </span>
      </div>
      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Tickets Processed</span>
          <Ticket className="h-4 w-4 text-cyan-400" />
        </div>
        <p className="mt-2 text-2xl font-bold text-white">{totalTickets.toLocaleString()}</p>
        <span className="mt-1 block text-3xs text-emerald-400 font-semibold flex items-center gap-0.5">
          <ArrowUpRight className="h-3 w-3" /> +5.4% vs last week
        </span>
      </div>
      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Average Face Value</span>
          <ShieldCheck className="h-4 w-4 text-amber-400" />
        </div>
        <p className="mt-2 text-2xl font-bold text-white">${avgTicketPrice.toFixed(2)}</p>
        <span className="mt-1 block text-3xs text-slate-500 font-mono">
          Optimized price equilibrium
        </span>
      </div>
    </div>
  );
}
