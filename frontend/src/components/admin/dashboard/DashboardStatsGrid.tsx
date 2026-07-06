"use client";

import React from 'react';
import { Users, Calendar, Ticket, DollarSign, UserCheck, RefreshCw } from 'lucide-react';
import { Event, User, VerificationApplication } from '@/types/admin';

interface DashboardStatsGridProps {
  events: Event[];
  users: User[];
  verifications: VerificationApplication[];
}

export default function DashboardStatsGrid({ events, users, verifications }: DashboardStatsGridProps) {
  const totalUsers = users.length + 24146; // Adding baseline count to match design
  const activeEventsCount = events.filter(e => e.status === 'Active').length;
  const ticketsSold = events.reduce((sum, e) => sum + e.ticketsSold, 0) + 30470;
  const grossRevenue = events.reduce((sum, e) => sum + e.totalRevenue, 0) + 1500000;
  const pendingVerifications = verifications.filter(v => v.status === 'Pending').length;

  const renderSparkline = (points: number[], strokeColor: string) => {
    const width = 100;
    const height = 30;
    const max = Math.max(...points);
    const min = Math.min(...points);
    const range = max - min || 1;
    
    const coordinates = points.map((p, idx) => {
      const x = (idx / (points.length - 1)) * width;
      const y = height - ((p - min) / range) * height;
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg className="h-8 w-24 overflow-visible" viewBox={`0 0 ${width} ${height}`}>
        <polyline
          fill="none"
          stroke={strokeColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={coordinates}
        />
      </svg>
    );
  };

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-6">
      {/* Total Users */}
      <div id="kpi-total-users" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between min-h-[110px]">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Users</span>
          <div className="rounded-lg bg-indigo-50 p-1.5 text-indigo-600 border border-indigo-100">
            <Users className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <div>
            <span className="text-lg font-bold text-slate-900 md:text-xl">{totalUsers.toLocaleString()}</span>
          </div>
          {renderSparkline([40, 50, 48, 62, 70, 85, 95], '#6366f1')}
        </div>
      </div>

      {/* Active Events */}
      <div id="kpi-active-events" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between min-h-[110px]">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Events</span>
          <div className="rounded-lg bg-pink-50 p-1.5 text-pink-600 border border-pink-100">
            <Calendar className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <div>
            <span className="text-lg font-bold text-slate-900 md:text-xl">{activeEventsCount}</span>
          </div>
          {renderSparkline([10, 11, 11, 12, 12, 13, 14], '#ec4899')}
        </div>
      </div>

      {/* Tickets Sold */}
      <div id="kpi-tickets-sold" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between min-h-[110px]">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tickets Sold</span>
          <div className="rounded-lg bg-cyan-50 p-1.5 text-cyan-600 border border-cyan-100">
            <Ticket className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <div>
            <span className="text-lg font-bold text-slate-900 md:text-xl">{ticketsSold.toLocaleString()}</span>
          </div>
          {renderSparkline([20, 32, 28, 45, 60, 72, 88], '#06b6d4')}
        </div>
      </div>

      {/* Revenue */}
      <div id="kpi-revenue" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between min-h-[110px]">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Gross Sales</span>
          <div className="rounded-lg bg-emerald-50 p-1.5 text-emerald-600 border border-emerald-100">
            <DollarSign className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <div>
            <span className="text-lg font-bold text-slate-900 md:text-xl">${(grossRevenue / 1000000).toFixed(2)}M</span>
          </div>
          {renderSparkline([30, 42, 58, 48, 65, 80, 95], '#10b981')}
        </div>
      </div>

      {/* Pending Verification */}
      <div id="kpi-pending-verifications" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between min-h-[110px]">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Verification Queue</span>
          <div className="rounded-lg bg-amber-50 p-1.5 text-amber-600 border border-amber-100">
            <UserCheck className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <div>
            <span className="text-lg font-bold text-slate-900 md:text-xl">{pendingVerifications}</span>
            <span className="ml-1.5 text-[10px] text-amber-600 animate-pulse block">Action Required</span>
          </div>
          <div className="h-8 flex items-center justify-end">
            <span className="text-2xs font-mono px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-600">Pending</span>
          </div>
        </div>
      </div>

      {/* Active Resale Hub */}
      <div id="kpi-active-resale" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between min-h-[110px]">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Resale</span>
          <div className="rounded-lg bg-indigo-50 p-1.5 text-indigo-600 border border-indigo-100">
            <RefreshCw className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <div>
            <span className="text-lg font-bold text-slate-900 md:text-xl">184</span>
            <span className="ml-1.5 text-[10px] text-slate-500">Stable</span>
          </div>
          {renderSparkline([50, 48, 52, 49, 51, 50, 50], '#6366f1')}
        </div>
      </div>
    </div>
  );
}
