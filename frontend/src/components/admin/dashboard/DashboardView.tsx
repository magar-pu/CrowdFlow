"use client";

import React from 'react';
import { RefreshCw, ArrowRight, Check, X } from 'lucide-react';
import { Event, User, Transaction, VerificationApplication, SecurityAlert, Activity } from '@/types/admin';
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
}

export default function DashboardView({
  events,
  users,
  transactions,
  verifications,
  alerts,
  onApproveVerification,
  onRejectVerification,
  onViewChange
}: DashboardViewProps) {
  const handleForceSync = () => {
    alert('Platform data refreshed successfully.');
  };

  const pendingVerificationsList = verifications.filter(v => v.status === 'Pending');

  return (
    <div className="space-y-6">
      {/* Welcome & Status Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-normal text-text-primary md:text-4xl">Admin Dashboard</h1>
          <p className="mt-2 text-sm text-text-secondary">Monitor events, transactions, users, and verification requests across CrowdFlow.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-text-secondary">Updated {new Date().toISOString().slice(0, 10)}</span>
          <button 
            onClick={handleForceSync}
            className="flex min-h-9 items-center gap-2 rounded-lg border border-border-subtle bg-surface-white px-4 py-2 text-xs font-semibold text-text-primary shadow-sm transition-all duration-200 hover:bg-surface cursor-pointer"
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
        <div className="rounded-lg border border-border-subtle bg-surface-white p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-border-subtle pb-4">
            <div>
              <h2 className="text-base font-bold text-text-primary">Organizer Verification</h2>
              <p className="text-xs text-text-secondary">Review organizer applications that need platform approval.</p>
            </div>
            <button 
              onClick={() => onViewChange('users')}
              className="flex items-center gap-1 text-xs font-semibold text-secondary hover:text-primary cursor-pointer"
            >
              <span>View Directory</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="mt-4 space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {pendingVerificationsList.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border-subtle py-10 text-center text-xs text-text-secondary">
                No pending verification requests.
              </div>
            ) : (
              pendingVerificationsList.map((applicant) => (
                <div key={applicant.id} className="flex flex-col gap-4 rounded-lg border border-border-subtle bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border-subtle bg-surface-white text-sm font-bold text-secondary">
                      {applicant.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-text-primary">{applicant.name}</span>
                        <span className="rounded-full border border-secondary/20 bg-secondary/5 px-2 py-0.5 text-[9px] font-medium text-secondary">
                          {applicant.businessType}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[10px] text-text-secondary">{applicant.email}</p>
                      <p className="mt-1 text-[10px] text-text-secondary">Document: <span className="text-text-primary">{applicant.documentType}</span></p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:self-center">
                    <button
                      onClick={() => onApproveVerification(applicant.id)}
                      className="flex h-9 items-center gap-1.5 rounded-lg bg-success px-3 text-[11px] font-semibold text-on-success transition-colors hover:bg-success/90 cursor-pointer"
                    >
                      <Check className="h-3 w-3" />
                      <span>Approve</span>
                    </button>
                    <button
                      onClick={() => onRejectVerification(applicant.id)}
                      className="flex h-9 items-center gap-1.5 rounded-lg border border-border-subtle bg-surface-white px-3 text-[11px] font-semibold text-text-secondary transition-all hover:bg-danger/5 hover:text-danger cursor-pointer"
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
        <div className="rounded-lg border border-border-subtle bg-surface-white p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-border-subtle pb-4">
            <div>
              <h2 className="text-base font-bold text-text-primary">Recent Transactions</h2>
              <p className="text-xs text-text-secondary">Latest purchases, pending payments, and refunds.</p>
            </div>
            <button 
              onClick={() => onViewChange('finance')}
              className="text-xs font-semibold text-secondary hover:text-primary cursor-pointer"
            >
              Finance Ledger
            </button>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs text-text-secondary">
              <thead>
                <tr className="border-b border-border-subtle text-[10px] uppercase tracking-wide text-text-secondary">
                  <th className="py-3 px-2">TXID</th>
                  <th className="py-3 px-2">Customer</th>
                  <th className="py-3 px-2">Event</th>
                  <th className="py-3 px-2">Amount</th>
                  <th className="py-3 px-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {transactions.slice(0, 4).map((tx) => (
                  <tr key={tx.id} className="transition-colors hover:bg-surface">
                    <td className="py-3 px-2 font-semibold text-text-primary">{tx.id}</td>
                    <td className="py-3 px-2 font-semibold text-text-primary">{tx.customerName}</td>
                    <td className="py-3 px-2 text-text-secondary">{tx.eventName}</td>
                    <td className="py-3 px-2 font-bold text-text-primary">${tx.amount}</td>
                    <td className="py-3 px-2 text-right">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold border ${
                        tx.status === 'Success' 
                          ? 'bg-success/5 text-success border-success/20' 
                          : tx.status === 'Pending' 
                          ? 'bg-warning/5 text-warning border-warning/20' 
                          : 'bg-surface text-text-secondary border-border-subtle'
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
