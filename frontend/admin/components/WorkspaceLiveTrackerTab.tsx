"use client";

import React from 'react';
import { Activity } from 'lucide-react';
import { Event, Transaction, Scanner } from '../types';

interface WorkspaceLiveTrackerTabProps {
  event: Event;
  scanners: Scanner[];
  transactions: Transaction[];
}

export default function WorkspaceLiveTrackerTab({ event, scanners, transactions }: WorkspaceLiveTrackerTabProps) {
  const activeScannersCount = scanners.filter(s => s.status !== 'Offline').length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Sales Volume</span>
          <p className="mt-1 text-lg font-bold text-white">${event.totalRevenue.toLocaleString()}</p>
          <span className="text-[10px] text-slate-500">All prices face value locked</span>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Attendance Ratio</span>
          <p className="mt-1 text-lg font-bold text-white">{Math.round((event.ticketsSold / event.capacity) * 100)}%</p>
          <span className="text-[10px] text-indigo-400 font-mono">{event.ticketsSold} seats claimed</span>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Connected Scanners</span>
          <p className="mt-1 text-lg font-bold text-white">{activeScannersCount} Devices</p>
          <span className="text-[10px] text-emerald-400">All nodes operational</span>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Average Validation Lag</span>
          <p className="mt-1 text-lg font-bold text-white">1.2 Seconds</p>
          <span className="text-[10px] text-slate-500">Cryptographic verification speed</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Sales Velocity Chart */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-900 pb-4">
            <h3 className="text-sm font-bold text-white">Event Registration Trajectory</h3>
            <span className="text-[10px] font-mono text-slate-500">TICKETS CLAIMED OVER TIME</span>
          </div>
          {/* Draw a neat mock ticket sales line */}
          <div className="mt-5 relative h-48 flex items-end bg-slate-900/10 p-4 rounded-xl">
            <svg className="absolute inset-0 h-full w-full p-4 overflow-visible" viewBox="0 0 400 150" preserveAspectRatio="none">
              <path 
                d="M 0,150 Q 100,140 200,90 T 400,20" 
                fill="none" 
                stroke="#06b6d4" 
                strokeWidth="3.5" 
                strokeLinecap="round" 
              />
              <line x1="0" y1="150" x2="400" y2="150" stroke="#1e293b" />
            </svg>
            <div className="absolute inset-x-0 bottom-1 flex justify-between px-6 text-[9px] font-mono text-slate-500">
              <span>Presale Launch</span>
              <span>General Sale</span>
              <span>Present Hour (Peak)</span>
            </div>
          </div>
        </div>

        {/* Live activity logs specific to event */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
          <h3 className="text-sm font-bold text-white border-b border-slate-900 pb-3">Node Entry Logs</h3>
          <div className="mt-4 space-y-3 max-h-[220px] overflow-y-auto pr-1">
            {transactions.length === 0 ? (
              <p className="text-3xs text-slate-500 text-center py-10">No recent transactions recorded.</p>
            ) : (
              transactions.slice(0, 4).map((tx, idx) => (
                <div key={idx} className="rounded-lg bg-slate-900/30 border border-slate-900 p-2.5 text-2xs flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200">{tx.customerName}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{tx.id}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>Purchased Event Ticket</span>
                    <span className="font-bold text-emerald-400">${tx.amount}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
