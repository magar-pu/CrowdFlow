"use client";

import React, { useState } from 'react';
import { formatIDR } from '@/lib/pricing';
import { PayoutRequest, PayoutStatus } from '../types';
import {
  Search, ArrowUpDown, Shield, CheckCircle2,
  Ban, RefreshCw, DollarSign, Clock, Eye, ShieldAlert
} from 'lucide-react';

interface PayoutsViewProps {
  payouts: PayoutRequest[];
  onSelectPayout: (payout: PayoutRequest) => void;
  onViewPayoutHistory: (payout: PayoutRequest) => void;
}

const STATUS_FILTERS: (PayoutStatus | 'All')[] = ['All', 'Pending', 'Under Review', 'Need Revision', 'Approved', 'Processing', 'Paid', 'Rejected', 'On Hold'];

const statusColors: Record<PayoutStatus, string> = {
  Pending: 'bg-secondary/10 text-secondary border-secondary/20',
  'Under Review': 'bg-primary/10 text-primary border-primary/20',
  'Need Revision': 'bg-warning/10 text-warning border-warning/20',
  Approved: 'bg-success/10 text-success border-success/20',
  Processing: 'bg-purple-100 text-purple-600 border-purple-200',
  Paid: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Rejected: 'bg-danger/10 text-danger border-danger/20',
  'On Hold': 'bg-amber-100 text-amber-700 border-amber-200',
};

export default function PayoutsView({
  payouts,
  onSelectPayout,
  onViewPayoutHistory,
}: PayoutsViewProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<PayoutStatus | 'All'>('Pending');
  const [sortKey, setSortKey] = useState<'date' | 'amount' | 'gross' | 'net' | 'risk' | 'organizer'>('date');


  const filtered = payouts
    .filter(p => {
      const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
      const q = search.toLowerCase();
      const matchesSearch = !q ||
        p.organizerName.toLowerCase().includes(q) ||
        p.eventName.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.bankAccountNumber.toLowerCase().includes(q) ||
        p.invoiceNumber.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    })
    .sort((a, b) => {
      if (sortKey === 'amount') return b.requestedAmount - a.requestedAmount;
      if (sortKey === 'gross') return b.revenue - a.revenue;
      if (sortKey === 'net') return b.netRevenue - a.netRevenue;
      if (sortKey === 'organizer') return a.organizerName.localeCompare(b.organizerName);
      return b.requestDate.localeCompare(a.requestDate); // latest first
    });

  // Summary stats calculations
  const stats = {
    pending: payouts.filter(p => p.status === 'Pending').length,
    underReview: payouts.filter(p => p.status === 'Under Review').length,
    approvedToday: payouts.filter(p => p.status === 'Approved').length,
    rejected: payouts.filter(p => p.status === 'Rejected').length,
    totalPendingAmount: payouts
      .filter(p => ['Pending', 'Under Review', 'On Hold'].includes(p.status))
      .reduce((sum, p) => sum + p.requestedAmount, 0),
    totalPaidToday: payouts.filter(p => p.status === 'Paid').reduce((sum, p) => sum + p.requestedAmount, 0),
    complianceRate: Math.round(
      (payouts.filter(p => p.status === 'Approved' || p.status === 'Paid').length / (payouts.length || 1)) * 100
    ),
    fraudAlerts: payouts.filter(p => p.fraudDetection.hasAlert).length,
  };

  const statCards = [
    { title: 'Pending Requests', value: stats.pending, icon: Clock, accent: 'text-secondary bg-secondary/10 border-secondary/20' },
    { title: 'Under Review', value: stats.underReview, icon: Eye, accent: 'text-primary bg-primary/10 border-primary/20' },
    { title: 'Approved Today', value: stats.approvedToday, icon: CheckCircle2, accent: 'text-success bg-success/10 border-success/20' },
    { title: 'Rejected Requests', value: stats.rejected, icon: Ban, accent: 'text-danger bg-danger/10 border-danger/20' },
    { title: 'Total Pending Amount', value: formatIDR(stats.totalPendingAmount), icon: DollarSign, accent: 'text-primary bg-primary/10 border-primary/20' },
    { title: 'Total Paid Today', value: formatIDR(stats.totalPaidToday), icon: DollarSign, accent: 'text-success bg-success/10 border-success/20' },
    { title: 'Compliance Rate', value: `${stats.complianceRate}%`, icon: Shield, accent: 'text-tertiary bg-tertiary/10 border-tertiary/20' },
    { title: 'Fraud Alerts', value: stats.fraudAlerts, icon: ShieldAlert, accent: 'text-danger bg-danger/10 border-danger/20' },
  ];

  return (
    <div className="space-y-6 text-left animate-fade-in font-sans">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">Payout Verification</h1>
        <p className="text-sm text-text-secondary mt-0.5">Approve and validation finance transfers to organizers.</p>
      </div>

      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.title} className="bg-white rounded-xl p-5 border border-border-subtle soft-shadow flex flex-col gap-2 hover:-translate-y-0.5 transition-all duration-200">
              <div className="flex justify-between items-center">
                <span className="font-mono text-[10px] font-bold text-text-secondary uppercase tracking-wider">{kpi.title}</span>
                <div className={`p-1.5 rounded-lg border ${kpi.accent}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <span className="font-sans text-2xl font-bold text-text-primary">{kpi.value}</span>
            </div>
          );
        })}
      </div>

      {/* Search & Filters */}
      <div className="bg-white border border-border-subtle rounded-xl p-4 soft-shadow space-y-3">
        <div className="flex items-center gap-2 border border-border-subtle rounded-lg px-3 py-2 w-full bg-surface-container-low focus-within:bg-white focus-within:border-outline transition-colors">
          <Search className="w-4 h-4 text-on-surface-variant" />
          <input
            type="text"
            placeholder="Search by Request ID, event, organizer, bank account, or invoice number..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-transparent text-xs text-text-primary outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${statusFilter === f ? 'bg-primary text-white border-primary shadow-xs' : 'border-border-subtle text-text-secondary hover:bg-surface-container-low'}`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap pt-1">
          <span className="text-[10px] font-mono text-text-secondary flex items-center gap-1"><ArrowUpDown className="w-3 h-3" /> Sort by:</span>
          {([['date', 'Request Date'], ['amount', 'Requested Amount'], ['gross', 'Gross Revenue'], ['net', 'Net Revenue'], ['organizer', 'Organizer']] as const).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setSortKey(k)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors cursor-pointer ${sortKey === k ? 'bg-secondary/10 text-secondary border-secondary/20 font-bold' : 'border-border-subtle text-text-secondary hover:bg-surface-container-low'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Payouts Table */}
      <div className="bg-white border border-border-subtle rounded-xl p-5 soft-shadow overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-border-subtle">
              {['Request ID', 'Organizer', 'Event', 'Gross Rev', 'Net Rev', 'Requested Amount', 'Status', 'Request Date', 'Action'].map(h => (
                <th key={h} className="text-left py-3 px-3 font-mono text-[10px] text-text-secondary uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {filtered.map(p => (
              <tr key={p.id} className="hover:bg-surface-container-low transition-colors">
                <td className="py-3.5 px-3 font-mono font-bold text-text-primary">{p.id}</td>
                <td className="py-3.5 px-3 font-semibold text-text-primary">{p.organizerName}</td>
                <td className="py-3.5 px-3 text-text-secondary">{p.eventName}</td>
                <td className="py-3.5 px-3 text-text-secondary font-mono">${p.revenue.toLocaleString()}</td>
                <td className="py-3.5 px-3 text-text-secondary font-mono">${p.netRevenue.toLocaleString()}</td>
                <td className="py-3.5 px-3 font-bold text-text-primary font-mono">${p.requestedAmount.toLocaleString()}</td>
                <td className="py-3.5 px-3">
                  <span className={`px-2.5 py-0.5 rounded-full font-mono text-[9px] font-bold border ${statusColors[p.status]}`}>
                    {p.status}
                  </span>
                </td>
                <td className="py-3.5 px-3 text-text-secondary font-mono">{p.requestDate}</td>
                <td className="py-3.5 px-3">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onSelectPayout(p)}
                      className="px-2.5 py-1 bg-secondary/15 hover:bg-secondary text-secondary hover:text-white rounded text-[10px] font-bold border border-secondary/20 transition-all cursor-pointer"
                    >
                      Review
                    </button>
                    <button
                      onClick={() => onViewPayoutHistory(p)}
                      className="px-2.5 py-1 bg-surface-container-low hover:bg-slate-700 text-text-secondary hover:text-white rounded text-[10px] font-bold border border-border-subtle transition-all cursor-pointer"
                    >
                      History
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={10} className="py-8 text-center text-xs text-text-secondary">
                  No payouts found matching this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
