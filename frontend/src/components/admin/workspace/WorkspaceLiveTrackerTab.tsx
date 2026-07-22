"use client";

import React from 'react';
import { Event, Transaction, Scanner } from '@/types/admin';

interface WorkspaceLiveTrackerTabProps {
  event: Event;
  scanners: Scanner[];
  transactions: Transaction[];
}

export default function WorkspaceLiveTrackerTab({ event, scanners, transactions }: WorkspaceLiveTrackerTabProps) {
  const activeScannersCount = scanners.filter(s => s.status !== 'Offline').length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
        <div className="rounded-lg border border-border-subtle bg-surface-white p-5 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wide text-text-secondary">Total Sales</span>
          <p className="mt-1 text-lg font-bold text-text-primary">${event.totalRevenue.toLocaleString()}</p>
          <span className="text-[10px] text-text-secondary">Gross event revenue</span>
        </div>
        <div className="rounded-lg border border-border-subtle bg-surface-white p-5 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wide text-text-secondary">Capacity Sold</span>
          <p className="mt-1 text-lg font-bold text-text-primary">{Math.round((event.ticketsSold / event.capacity) * 100)}%</p>
          <span className="text-[10px] text-secondary">{event.ticketsSold} seats claimed</span>
        </div>
        <div className="rounded-lg border border-border-subtle bg-surface-white p-5 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wide text-text-secondary">Connected Scanners</span>
          <p className="mt-1 text-lg font-bold text-text-primary">{activeScannersCount} Devices</p>
          <span className="text-[10px] text-success">Operational</span>
        </div>
        <div className="rounded-lg border border-border-subtle bg-surface-white p-5 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wide text-text-secondary">Average Validation</span>
          <p className="mt-1 text-lg font-bold text-text-primary">1.2 Seconds</p>
          <span className="text-[10px] text-text-secondary">Ticket scan speed</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Sales Velocity Chart */}
        <div className="rounded-lg border border-border-subtle bg-surface-white p-6 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border-subtle pb-4">
            <h3 className="text-sm font-bold text-text-primary">Event Registration Trajectory</h3>
            <span className="text-[10px] text-text-secondary">Tickets claimed over time</span>
          </div>
          {/* Draw a neat mock ticket sales line */}
          <div className="relative mt-5 flex h-48 items-end rounded-lg border border-border-subtle bg-surface p-4">
            <svg className="absolute inset-0 h-full w-full p-4 overflow-visible" viewBox="0 0 400 150" preserveAspectRatio="none">
              <path 
                d="M 0,150 Q 100,140 200,90 T 400,20" 
                fill="none" 
                stroke="#1D4ED8" 
                strokeWidth="3.5" 
                strokeLinecap="round" 
              />
              <line x1="0" y1="150" x2="400" y2="150" stroke="#E2E8F0" />
            </svg>
            <div className="absolute inset-x-0 bottom-1 flex justify-between px-6 text-[9px] text-text-secondary">
              <span>Presale Launch</span>
              <span>General Sale</span>
              <span>Present Hour (Peak)</span>
            </div>
          </div>
        </div>

        {/* Live activity logs specific to event */}
        <div className="rounded-lg border border-border-subtle bg-surface-white p-6 shadow-sm">
          <h3 className="border-b border-border-subtle pb-3 text-sm font-bold text-text-primary">Recent Activity</h3>
          <div className="mt-4 space-y-3 max-h-[220px] overflow-y-auto pr-1">
            {transactions.length === 0 ? (
              <p className="py-10 text-center text-xs text-text-secondary">No recent transactions recorded.</p>
            ) : (
              transactions.slice(0, 4).map((tx, idx) => (
                <div key={idx} className="flex flex-col gap-1 rounded-lg border border-border-subtle bg-surface p-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-text-primary">{tx.customerName}</span>
                    <span className="text-[10px] text-text-secondary">{tx.id}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-text-secondary">
                    <span>Purchased Event Ticket</span>
                    <span className="font-bold text-success">${tx.amount}</span>
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
