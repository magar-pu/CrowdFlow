"use client";

import React, { useState } from 'react';
import { Download, FileText } from 'lucide-react';
import { Event, User, Transaction } from '../types';
import AnalyticsStatsGrid from './AnalyticsStatsGrid';
import AnalyticsOverviewTab from './AnalyticsOverviewTab';
import AnalyticsMarketplaceTab from './AnalyticsMarketplaceTab';
import AnalyticsRegionsTab from './AnalyticsRegionsTab';

interface AnalyticsViewProps {
  events: Event[];
  users: User[];
  transactions: Transaction[];
}

export default function AnalyticsView({ events, users, transactions }: AnalyticsViewProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'marketplace' | 'regions'>('overview');

  // Mock reports available for download
  const reports = [
    { title: 'Q2 Ticketing Volume Audit', size: '2.4 MB', date: '2026-06-30', format: 'PDF' },
    { title: 'Tax & Ledger Summary FY26', size: '1.8 MB', date: '2026-06-15', format: 'XLSX' },
    { title: 'Secondary Resale Price Caps Log', size: '4.1 MB', date: '2026-07-01', format: 'CSV' },
    { title: 'Anti-Scalping Scanner Audits', size: '940 KB', date: '2026-07-02', format: 'PDF' }
  ];

  const triggerExport = (reportTitle: string) => {
    alert(`Generating security-signed payload for "${reportTitle}"... Saved to downloads.`);
  };

  return (
    <div className="space-y-6">
      {/* Analytics Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">Analytics & Insights</h1>
          <p className="mt-1 text-sm text-slate-400">Deep audit trails, market price ceiling trends, and regional ticket demand vectors.</p>
        </div>
        <div className="flex rounded-xl bg-slate-900 border border-slate-800 p-1">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`rounded-lg px-4 py-2 text-xs font-semibold uppercase transition-all duration-200 cursor-pointer ${
              activeTab === 'overview' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Overview
          </button>
          <button 
            onClick={() => setActiveTab('marketplace')}
            className={`rounded-lg px-4 py-2 text-xs font-semibold uppercase transition-all duration-200 cursor-pointer ${
              activeTab === 'marketplace' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Marketplace Resale
          </button>
          <button 
            onClick={() => setActiveTab('regions')}
            className={`rounded-lg px-4 py-2 text-xs font-semibold uppercase transition-all duration-200 cursor-pointer ${
              activeTab === 'regions' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Regional Demand
          </button>
        </div>
      </div>

      {/* Analytics KPI mini grid */}
      <AnalyticsStatsGrid events={events} />

      {/* Main Tab Content */}
      {activeTab === 'overview' && <AnalyticsOverviewTab />}
      {activeTab === 'marketplace' && <AnalyticsMarketplaceTab />}
      {activeTab === 'regions' && <AnalyticsRegionsTab />}

      {/* Reports Export Library */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-900 pb-4">
          <div>
            <h2 className="text-base font-bold text-white">Audited Reports Library</h2>
            <p className="text-xs text-slate-400">Cryptographically signed document logs for government and tax reporting.</p>
          </div>
          <span className="text-[10px] font-mono text-slate-500">VERIFIED LEDGER: SECURE SHA-256</span>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          {reports.map((report, index) => (
            <div key={index} className="rounded-xl border border-slate-900 bg-slate-900/30 p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between">
                  <div className="rounded-lg bg-indigo-500/10 p-2 text-indigo-400 border border-indigo-500/20">
                    <FileText className="h-5 w-5" />
                  </div>
                  <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[9px] font-mono text-slate-400">
                    {report.format}
                  </span>
                </div>
                <h4 className="mt-3 text-xs font-bold text-slate-200 leading-snug">{report.title}</h4>
                <p className="mt-1 text-[9px] text-slate-500 font-mono">Date: {report.date}</p>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-900 pt-3">
                <span className="text-[9px] text-slate-500 font-mono">{report.size}</span>
                <button
                  onClick={() => triggerExport(report.title)}
                  className="rounded-lg bg-indigo-600/15 border border-indigo-500/20 px-2 py-1 text-[10px] font-bold text-indigo-400 hover:bg-indigo-600 hover:text-white transition-all cursor-pointer flex items-center gap-1"
                >
                  <Download className="h-3 w-3" />
                  <span>Download</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
