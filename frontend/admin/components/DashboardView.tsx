"use client";

import React from 'react';
import { RefreshCw, ArrowRight, Check, X } from 'lucide-react';
import { Event, User, Transaction, VerificationApplication, SecurityAlert, Activity } from '../types';
import DashboardStatsGrid from './DashboardStatsGrid';
import DashboardAnalyticsChart from './DashboardAnalyticsChart';
import DashboardAlertsAndCalendar from './DashboardAlertsAndCalendar';

interface DashboardViewProps {
  events: Event[];
  users: User[];
  transactions: Transaction[];
  verifications: VerificationApplication[];
  alerts: SecurityAlert[];
  activities: Activity[];
  onApproveVerification: (id: string) => void;
  onRejectVerification: (id: string) => void;
  onViewChange: (view: 'dashboard' | 'analytics' | 'events' | 'users' | 'finance' | 'settings' | 'workspace') => void;
  onSelectEvent: (id: string) => void;
}

export default function DashboardView({
  events,
  users,
  transactions,
  verifications,
  alerts,
  onApproveVerification,
  onRejectVerification,
  onViewChange,
  onSelectEvent
}: DashboardViewProps) {
  const handleForceSync = () => {
    alert('Platform nodes updated. DB instances synced successfully.');
  };

  const pendingVerificationsList = verifications.filter(v => v.status === 'Pending');

  return (
    <div className="space-y-6">
      {/* Welcome & Status Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">Good Morning, Richie 👋</h1>
          <p className="mt-1 text-sm text-slate-600">Here is the real-time activity blueprint across all ticketing and verification nodes.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 font-mono">UTC TIME: {new Date().toISOString().slice(0, 10)}</span>
          <button 
            onClick={handleForceSync}
            className="flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition-all duration-200 cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Force Sync DB</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <DashboardStatsGrid events={events} users={users} verifications={verifications} />

      {/* Analytics Donut & Bar Charts */}
      <DashboardAnalyticsChart events={events} />

      {/* Organizer Verifications & Transactions */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Organizer Verification Queue */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Organizer Verification</h2>
              <p className="text-xs text-slate-500">Assess applications from organizers requesting platform credentials.</p>
            </div>
            <button 
              onClick={() => onViewChange('users')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
            >
              <span>View Directory</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="mt-4 space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {pendingVerificationsList.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-xl">
                No pending verification requests in database queue.
              </div>
            ) : (
              pendingVerificationsList.map((applicant) => (
                <div key={applicant.id} className="flex flex-col gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-indigo-600 border border-slate-200">
                      {applicant.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800">{applicant.name}</span>
                        <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[9px] font-medium text-indigo-600 border border-indigo-100">
                          {applicant.businessType}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">{applicant.email}</p>
                      <p className="text-[10px] text-slate-500 mt-1">Doc: <span className="font-mono text-slate-700">{applicant.documentType}</span></p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:self-center">
                    <button
                      onClick={() => onApproveVerification(applicant.id)}
                      className="flex h-8 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-[11px] font-semibold text-white hover:bg-emerald-500 transition-colors cursor-pointer"
                    >
                      <Check className="h-3 w-3" />
                      <span>Approve</span>
                    </button>
                    <button
                      onClick={() => onRejectVerification(applicant.id)}
                      className="flex h-8 items-center gap-1.5 rounded-lg bg-white border border-slate-200 px-3 text-[11px] font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                      <span>Decline</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Transactions list */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Recent Transactions</h2>
              <p className="text-xs text-slate-500">Real-time purchase and refund operations ledger.</p>
            </div>
            <button 
              onClick={() => onViewChange('finance')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
            >
              Finance Ledger
            </button>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-500 border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 text-[10px] uppercase tracking-wider">
                  <th className="py-3 px-2">TXID</th>
                  <th className="py-3 px-2">Customer</th>
                  <th className="py-3 px-2">Event</th>
                  <th className="py-3 px-2">Amount</th>
                  <th className="py-3 px-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.slice(0, 4).map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-2 font-mono text-slate-700 font-bold">{tx.id}</td>
                    <td className="py-3 px-2 text-slate-800 font-semibold">{tx.customerName}</td>
                    <td className="py-3 px-2 text-slate-650">{tx.eventName}</td>
                    <td className="py-3 px-2 text-slate-800 font-bold font-mono">${tx.amount}</td>
                    <td className="py-3 px-2 text-right">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold border ${
                        tx.status === 'Success' 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                          : tx.status === 'Pending' 
                          ? 'bg-amber-50 text-amber-700 border-amber-100' 
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        <span className={`h-1 w-1 rounded-full ${
                          tx.status === 'Success' ? 'bg-emerald-500' : tx.status === 'Pending' ? 'bg-amber-500' : 'bg-slate-400'
                        }`} />
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Security Alerts and Operations Calendar */}
      <DashboardAlertsAndCalendar alerts={alerts} />
    </div>
  );
}
