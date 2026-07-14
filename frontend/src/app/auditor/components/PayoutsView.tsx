"use client";

import React, { useState } from 'react';
import { PayoutRequest, PayoutStatus } from '../types';
import {
  Search, ArrowUpDown, Shield, AlertTriangle, FileText, CheckCircle2,
  Users2, Mail, MapPin, CalendarDays, ArrowLeft, Ban, Send, Save, X,
  Activity, RefreshCw, DollarSign, Award, Download, Clock
} from 'lucide-react';

interface PayoutsViewProps {
  payouts: PayoutRequest[];
  onUpdatePayoutStatus: (id: string, status: PayoutStatus, notes: string, financeNotes: string) => void;
  onUpdatePayoutChecklists: (
    id: string,
    financialChecklist: PayoutRequest['financialChecklist'],
    complianceChecklist: PayoutRequest['complianceChecklist']
  ) => void;
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

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? 'text-success' : score >= 50 ? 'text-warning' : 'text-danger';
  const ring = score >= 80 ? 'stroke-success' : score >= 50 ? 'stroke-warning' : 'stroke-danger';
  const r = 20; const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
      <svg className="w-16 h-16 -rotate-90" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r={r} fill="none" stroke="#e5e7eb" strokeWidth="4" />
        <circle cx="24" cy="24" r={r} fill="none" className={ring} strokeWidth="4" strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </svg>
      <span className={`absolute text-sm font-bold ${color}`}>{score}%</span>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-border-subtle rounded-xl p-5 soft-shadow space-y-4">
      <h3 className="text-[10px] font-mono font-bold text-text-secondary uppercase tracking-wider">{title}</h3>
      {children}
    </div>
  );
}

export default function PayoutsView({
  payouts,
  onUpdatePayoutStatus,
  onUpdatePayoutChecklists,
}: PayoutsViewProps) {
  const [selectedPayout, setSelectedPayout] = useState<PayoutRequest | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<PayoutStatus | 'All'>('Pending');
  const [sortKey, setSortKey] = useState<'date' | 'amount' | 'organizer'>('date');

  // Review Form States
  const [notes, setNotes] = useState('');
  const [financeNotes, setFinanceNotes] = useState('');
  const [actionMode, setActionMode] = useState<'view' | 'reject' | 'revision' | 'hold'>('view');
  
  // Revision details form
  const [revDesc, setRevDesc] = useState('');

  const filtered = payouts
    .filter(p => {
      const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
      const q = search.toLowerCase();
      const matchesSearch = !q ||
        p.organizerName.toLowerCase().includes(q) ||
        p.eventName.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    })
    .sort((a, b) => {
      if (sortKey === 'amount') return b.requestedAmount - a.requestedAmount;
      if (sortKey === 'organizer') return a.organizerName.localeCompare(b.organizerName);
      return b.requestDate.localeCompare(a.requestDate); // latest first
    });

  // Summary stats calculations
  const stats = {
    pending: payouts.filter(p => p.status === 'Pending').length,
    approvedToday: payouts.filter(p => p.status === 'Approved').length, // Mock today
    rejected: payouts.filter(p => p.status === 'Rejected').length,
    totalPendingAmount: payouts
      .filter(p => ['Pending', 'Under Review', 'On Hold'].includes(p.status))
      .reduce((sum, p) => sum + p.requestedAmount, 0),
    complianceRate: Math.round(
      (payouts.filter(p => p.status === 'Approved' || p.status === 'Paid').length / (payouts.length || 1)) * 100
    ),
  };

  const handleOpenReview = (payout: PayoutRequest) => {
    setSelectedPayout(payout);
    setNotes(payout.internalNotes || '');
    setFinanceNotes(payout.financeNotes || '');
    setActionMode('view');
  };

  const handleToggleFinancialChecklist = (field: keyof PayoutRequest['financialChecklist']) => {
    if (!selectedPayout) return;
    const updatedFinChecklist = {
      ...selectedPayout.financialChecklist,
      [field]: !selectedPayout.financialChecklist[field]
    };
    onUpdatePayoutChecklists(selectedPayout.id, updatedFinChecklist, selectedPayout.complianceChecklist);
    setSelectedPayout({
      ...selectedPayout,
      financialChecklist: updatedFinChecklist
    });
  };

  const handleToggleComplianceChecklist = (field: keyof PayoutRequest['complianceChecklist']) => {
    if (!selectedPayout) return;
    const updatedCompChecklist = {
      ...selectedPayout.complianceChecklist,
      [field]: !selectedPayout.complianceChecklist[field]
    };
    onUpdatePayoutChecklists(selectedPayout.id, selectedPayout.financialChecklist, updatedCompChecklist);
    setSelectedPayout({
      ...selectedPayout,
      complianceChecklist: updatedCompChecklist
    });
  };

  const handleApprove = () => {
    if (!selectedPayout) return;
    onUpdatePayoutStatus(selectedPayout.id, 'Approved', notes, financeNotes);
    setSelectedPayout(null);
  };

  const handleConfirmReject = () => {
    if (!selectedPayout || !revDesc.trim()) return;
    onUpdatePayoutStatus(selectedPayout.id, 'Rejected', notes, financeNotes + '\n[Rejection] ' + revDesc);
    setSelectedPayout(null);
  };

  const handleConfirmHold = () => {
    if (!selectedPayout || !revDesc.trim()) return;
    onUpdatePayoutStatus(selectedPayout.id, 'On Hold', notes, financeNotes + '\n[Hold] ' + revDesc);
    setSelectedPayout(null);
  };

  const handleConfirmRevision = () => {
    if (!selectedPayout || !revDesc.trim()) return;
    onUpdatePayoutStatus(selectedPayout.id, 'Need Revision', notes, financeNotes + '\n[Revision Requested] ' + revDesc);
    setSelectedPayout(null);
  };

  // ─── LIST VIEW ───
  if (!selectedPayout) {
    return (
      <div className="space-y-6 text-left animate-fade-in font-sans">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Payout Verification</h1>
          <p className="text-sm text-text-secondary mt-0.5">Approve and validation finance transfers to organizers.</p>
        </div>

        {/* Dashboard Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: 'Pending Requests', value: stats.pending, color: 'text-secondary bg-secondary/5 border-secondary/20' },
            { label: 'Approved today', value: stats.approvedToday, color: 'text-success bg-success/5 border-success/20' },
            { label: 'Rejected total', value: stats.rejected, color: 'text-danger bg-danger/5 border-danger/20' },
            { label: 'Total Pending', value: `$${stats.totalPendingAmount.toLocaleString()}`, color: 'text-primary bg-primary/5 border-primary/20', isAmt: true },
            { label: 'Compliance Rate', value: `${stats.complianceRate}%`, color: 'text-slate-700 bg-slate-100 border-slate-200' },
          ].map(s => (
            <div key={s.label} className={`border border-border-subtle rounded-xl p-4 soft-shadow text-center ${s.color}`}>
              <div className="text-xl font-bold">{s.value}</div>
              <div className="text-[10px] text-text-secondary font-mono uppercase mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Search & Filters */}
        <div className="bg-white border border-border-subtle rounded-xl p-4 soft-shadow space-y-3">
          <div className="flex items-center gap-2 border border-border-subtle rounded-lg px-3 py-2 w-full bg-surface-container-low focus-within:bg-white focus-within:border-outline transition-colors">
            <Search className="w-4 h-4 text-on-surface-variant" />
            <input
              type="text"
              placeholder="Search by organizer, event, or Request ID..."
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
            {([['date', 'Request Date'], ['amount', 'Requested Amount'], ['organizer', 'Organizer Name']] as const).map(([k, label]) => (
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
                {['Request ID', 'Organizer', 'Event', 'Gross Rev', 'Net Rev', 'Requested Amount', 'Request Date', 'Status', 'Action'].map(h => (
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
                  <td className="py-3.5 px-3 text-text-secondary font-mono">{p.requestDate}</td>
                  <td className="py-3.5 px-3">
                    <span className={`px-2.5 py-0.5 rounded-full font-mono text-[9px] font-bold border ${statusColors[p.status]}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-3">
                    <button
                      onClick={() => handleOpenReview(p)}
                      className="px-2.5 py-1 bg-secondary/15 hover:bg-secondary text-secondary hover:text-white rounded text-[10px] font-bold border border-secondary/20 transition-all cursor-pointer"
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-xs text-text-secondary">
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

  // ─── FULL REVIEW VIEW ───
  const s = selectedPayout.salesSummary;
  return (
    <div className="flex flex-col min-h-full text-left animate-fade-in font-sans pb-32">
      {/* Breadcrumbs */}
      <div className="flex items-center justify-between pb-4 border-b border-border-subtle mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => setSelectedPayout(null)} className="p-2 border border-border-subtle bg-white hover:bg-surface-container-low text-text-secondary hover:text-text-primary rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold shadow-xs shrink-0">
            <ArrowLeft className="w-4 h-4" /> Back to List
          </button>
          <div className="min-w-0">
            <div className="text-[10px] text-text-secondary font-mono uppercase tracking-wider flex items-center gap-1">
              <span>Auditor Console</span><span>/</span><span>Payout Verification</span><span>/</span>
              <span className="text-text-primary font-bold truncate">{selectedPayout.id}</span>
            </div>
            <h2 className="text-lg font-bold text-text-primary truncate mt-0.5">{selectedPayout.eventName} Payout</h2>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold border ${statusColors[selectedPayout.status]}`}>{selectedPayout.status}</span>
          <span className="font-mono text-[10px] font-bold text-text-secondary bg-surface border border-border-subtle px-2.5 py-1 rounded-lg">Req Date: {selectedPayout.requestDate}</span>
        </div>
      </div>

      {/* Fraud Alert Banner */}
      {selectedPayout.fraudDetection.hasAlert && (
        <div className="mb-6 p-4 bg-danger/5 border border-danger/20 rounded-xl flex items-start gap-3 text-danger text-xs leading-relaxed animate-pulse">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold uppercase tracking-wider text-[10px] font-mono">Fraud Alert Flagged</p>
            <p className="mt-1 font-medium">{selectedPayout.fraudDetection.alertMessage}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Columns: Financial lists */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Sales Summary Grid */}
          <SectionCard title="Sales Summary & Distribution">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: 'Tickets Sold', value: s.ticketsSold.toLocaleString(), sub: 'Seats Checked' },
                { label: 'Gross Revenue', value: `$${s.grossRevenue.toLocaleString()}`, sub: 'Standard Fees' },
                { label: 'Platform Fee (5%)', value: `-$${s.platformFee.toLocaleString()}`, sub: 'CrowdFlow Cut', isNeg: true },
                { label: 'Gateway Fee (2%)', value: `-$${s.paymentGatewayFee.toLocaleString()}`, sub: 'Stripe/Midtrans', isNeg: true },
                { label: 'Entertainment Tax', value: `-$${s.entertainmentTax.toLocaleString()}`, sub: 'Region Tax Deduct', isNeg: true },
                { label: 'VAT / PPN', value: `-$${s.vat.toLocaleString()}`, sub: '11% National Tax', isNeg: true },
                { label: 'Refund Amount', value: `-$${s.refundAmount.toLocaleString()}`, sub: 'Approved Returns', isNeg: true },
                { label: 'Chargeback Deduct', value: `-$${s.chargebackAmount.toLocaleString()}`, sub: 'Disputes Deducted', isNeg: true, isDis: s.chargebackAmount > 0 },
                { label: 'Net Organizer Payout', value: `$${s.netRevenue.toLocaleString()}`, sub: 'Transfer Amount', highlight: true },
              ].map((item, idx) => (
                <div key={idx} className={`bg-white border border-border-subtle rounded-xl p-3.5 soft-shadow ${item.highlight ? 'ring-2 ring-success/20 bg-success/5 border-success/30' : item.isDis ? 'ring-2 ring-danger/20 bg-danger/5 border-danger/30' : ''}`}>
                  <p className="text-[8px] font-mono text-text-secondary uppercase tracking-wider">{item.label}</p>
                  <p className={`text-sm font-bold mt-0.5 ${item.highlight ? 'text-success' : item.isNeg ? 'text-danger' : 'text-text-primary'}`}>{item.value}</p>
                  <p className="text-[8px] text-text-secondary font-mono mt-0.5">{item.sub}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Organizer bank info */}
            <SectionCard title="Organizer Bank Verification">
              <div className="space-y-2 text-xs">
                {[
                  { label: 'Organizer', value: selectedPayout.organizerName },
                  { label: 'Email', value: selectedPayout.organizerEmail },
                  { label: 'Bank Name', value: selectedPayout.bankName },
                  { label: 'Account Number', value: selectedPayout.bankAccountNumber },
                  { label: 'Account Holder', value: selectedPayout.bankAccountHolder },
                ].map(r => (
                  <div key={r.label} className="flex justify-between border-b border-border-subtle pb-1.5">
                    <span className="text-text-secondary">{r.label}</span>
                    <span className="font-semibold text-text-primary text-right">{r.value}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-2">
                  <span className="text-text-secondary">Verification Status</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${selectedPayout.bankVerificationStatus === 'Verified' ? 'bg-success/10 text-success border-success/20' : 'bg-warning/10 text-warning border-warning/20'}`}>
                    {selectedPayout.bankVerificationStatus}
                  </span>
                </div>
              </div>
            </SectionCard>

            {/* Event Completion Info */}
            <SectionCard title="Event Information">
              <div className="space-y-2 text-xs">
                {[
                  { label: 'Event Name', value: selectedPayout.eventName },
                  { label: 'Event Date', value: selectedPayout.eventDate },
                  { label: 'Venue Location', value: selectedPayout.venue },
                  { label: 'Completion Status', value: selectedPayout.completionStatus },
                ].map(r => (
                  <div key={r.label} className="flex justify-between border-b border-border-subtle pb-1.5">
                    <span className="text-text-secondary">{r.label}</span>
                    <span className="font-semibold text-text-primary text-right">{r.value}</span>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>

          {/* Timeline */}
          <SectionCard title="Payout Workflow Timeline">
            <div className="space-y-4 pt-1">
              {selectedPayout.timeline.map((t, idx) => (
                <div key={idx} className="flex gap-2.5 text-xs">
                  <div className="flex flex-col items-center">
                    <div className="w-5 h-5 rounded-full bg-surface-container-low border border-border-subtle flex items-center justify-center shrink-0">
                      <Clock className="w-2.5 h-2.5 text-text-secondary" />
                    </div>
                    {idx < selectedPayout.timeline.length - 1 && <div className="w-px flex-1 bg-border-subtle my-1" />}
                  </div>
                  <div>
                    <p className="font-bold text-text-primary">{t.stage}</p>
                    <p className="text-text-secondary text-[11px] mt-0.5">{t.details}</p>
                    <p className="text-[9px] font-mono text-text-secondary mt-1">{t.timestamp} · by {t.actor}</p>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

        </div>

        {/* Right Column: Checklists & Fraud checks */}
        <div className="space-y-6">
          
          {/* Financial Validation Checklist */}
          <SectionCard title="Financial Validation Checklist">
            <div className="space-y-2">
              {[
                { key: 'revenueMatch' as const, label: 'Revenue Matches Gateways' },
                { key: 'ticketSalesMatch' as const, label: 'Ticket Sales Logs Verified' },
                { key: 'refundCalculated' as const, label: 'Refunds Properly Calculated' },
                { key: 'chargebackApplied' as const, label: 'Chargebacks Accounted/Deducted' },
                { key: 'platformFeeCorrect' as const, label: 'Platform Fees Verified (5%)' },
                { key: 'taxCorrect' as const, label: 'Entertainment/VAT Taxes Match' },
                { key: 'netRevenueCorrect' as const, label: 'Net Revenue Allocation Valid' },
              ].map(item => {
                const done = selectedPayout.financialChecklist[item.key];
                return (
                  <button
                    key={item.key}
                    onClick={() => handleToggleFinancialChecklist(item.key)}
                    className={`w-full flex items-center gap-2.5 text-xs px-3 py-2 rounded-lg border text-left transition-all cursor-pointer ${done ? 'bg-success/5 text-success border-success/15 font-semibold' : 'bg-surface-container-low border-border-subtle text-text-secondary'}`}
                  >
                    <CheckCircle2 className={`w-4 h-4 shrink-0 ${done ? 'text-success' : 'text-slate-300'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </SectionCard>

          {/* Compliance Validation Checklist */}
          <SectionCard title="Compliance Validation">
            <div className="space-y-2">
              {[
                { key: 'eventApproved' as const, label: 'Event approved by Auditor' },
                { key: 'organizerVerified' as const, label: 'Organizer account verified' },
                { key: 'requiredDocumentsComplete' as const, label: 'All Event Permits Complete' },
                { key: 'noActiveInvestigation' as const, label: 'No Active Finance Dispute' },
                { key: 'noPendingRevision' as const, label: 'No Outstanding Event Revision' },
              ].map(item => {
                const done = selectedPayout.complianceChecklist[item.key];
                return (
                  <button
                    key={item.key}
                    onClick={() => handleToggleComplianceChecklist(item.key)}
                    className={`w-full flex items-center gap-2.5 text-xs px-3 py-2 rounded-lg border text-left transition-all cursor-pointer ${done ? 'bg-success/5 text-success border-success/15 font-semibold' : 'bg-surface-container-low border-border-subtle text-text-secondary'}`}
                  >
                    <CheckCircle2 className={`w-4 h-4 shrink-0 ${done ? 'text-success' : 'text-slate-300'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </SectionCard>

          {/* Fraud Detection Checks */}
          <SectionCard title="Fraud Detection Check List">
            <div className="space-y-2.5 text-xs">
              {[
                { label: 'Duplicate Payout Check', status: !selectedPayout.fraudDetection.duplicatePayout },
                { label: 'Suspicious Revenue Check', status: !selectedPayout.fraudDetection.suspiciousRevenue },
                { label: 'Unusual Refund Rate Check', status: !selectedPayout.fraudDetection.unusualRefundRate },
                { label: 'High Chargeback Check', status: !selectedPayout.fraudDetection.highChargeback },
                { label: 'Multiple Bank Changes Check', status: !selectedPayout.fraudDetection.multipleBankChanges },
                { label: 'Abnormal Ticket Sales Check', status: !selectedPayout.fraudDetection.abnormalTicketSales },
              ].map((item, idx) => (
                <div key={idx} className="flex justify-between border-b border-border-subtle pb-1.5">
                  <span className="text-text-secondary">{item.label}</span>
                  <span className={`font-bold ${item.status ? 'text-success' : 'text-danger'}`}>{item.status ? 'CLEAR' : 'WARNING'}</span>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Auditor Notes form */}
          <SectionCard title="Finance Audit Notes">
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[9px] font-mono font-bold text-text-secondary uppercase">Internal Notes</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Notes about this payout request..."
                  className="w-full p-2.5 border border-border-subtle rounded-lg text-xs bg-white outline-none resize-none placeholder:text-text-secondary focus:border-secondary focus:ring-1 focus:ring-secondary/20"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-mono font-bold text-text-secondary uppercase">Finance / Gateway Notes</label>
                <textarea
                  value={financeNotes}
                  onChange={e => setFinanceNotes(e.target.value)}
                  rows={2}
                  placeholder="Notes sent to gateway processor..."
                  className="w-full p-2.5 border border-border-subtle rounded-lg text-xs bg-white outline-none resize-none placeholder:text-text-secondary focus:border-secondary focus:ring-1 focus:ring-secondary/20"
                />
              </div>
            </div>
          </SectionCard>
        </div>
      </div>

      {/* Sticky Action Panel */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-white/95 border-t border-border-subtle backdrop-blur-md px-4 py-3 sm:px-6">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-3 flex-wrap">
          {actionMode === 'reject' ? (
            <>
              <div className="flex-1 min-w-[200px]">
                <input
                  value={revDesc}
                  onChange={e => setRevDesc(e.target.value)}
                  placeholder="Provide rejection reason..."
                  className="w-full px-3 py-2 border border-border-subtle rounded-lg text-xs bg-white outline-none focus:border-danger focus:ring-1 focus:ring-danger/20"
                />
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => setActionMode('view')} className="flex items-center gap-1 px-3 py-2 border border-border-subtle text-text-secondary rounded-lg text-xs font-bold hover:bg-surface-container-low transition-colors cursor-pointer"><X className="w-3.5 h-3.5" /> Cancel</button>
                <button onClick={handleConfirmReject} disabled={!revDesc.trim()} className="flex items-center gap-1.5 px-4 py-2 bg-danger text-white rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"><Ban className="w-3.5 h-3.5" /> Confirm Rejection</button>
              </div>
            </>
          ) : actionMode === 'hold' ? (
            <>
              <div className="flex-1 min-w-[200px]">
                <input
                  value={revDesc}
                  onChange={e => setRevDesc(e.target.value)}
                  placeholder="Provide hold investigation description..."
                  className="w-full px-3 py-2 border border-border-subtle rounded-lg text-xs bg-white outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400/20"
                />
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => setActionMode('view')} className="flex items-center gap-1 px-3 py-2 border border-border-subtle text-text-secondary rounded-lg text-xs font-bold hover:bg-surface-container-low transition-colors cursor-pointer"><X className="w-3.5 h-3.5" /> Cancel</button>
                <button onClick={handleConfirmHold} disabled={!revDesc.trim()} className="flex items-center gap-1.5 px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"><Ban className="w-3.5 h-3.5" /> Confirm Hold</button>
              </div>
            </>
          ) : actionMode === 'revision' ? (
            <>
              <div className="flex-1 min-w-[200px]">
                <input
                  value={revDesc}
                  onChange={e => setRevDesc(e.target.value)}
                  placeholder="Provide details of transaction/invoice revision needed..."
                  className="w-full px-3 py-2 border border-border-subtle rounded-lg text-xs bg-white outline-none focus:border-warning focus:ring-1 focus:ring-warning/20"
                />
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => setActionMode('view')} className="flex items-center gap-1 px-3 py-2 border border-border-subtle text-text-secondary rounded-lg text-xs font-bold hover:bg-surface-container-low transition-colors cursor-pointer"><X className="w-3.5 h-3.5" /> Cancel</button>
                <button onClick={handleConfirmRevision} disabled={!revDesc.trim()} className="flex items-center gap-1.5 px-4 py-2 bg-warning text-white rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"><Send className="w-3.5 h-3.5" /> Request Revision</button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 w-full justify-end flex-wrap">
              <span className="text-[10px] font-mono text-text-secondary mr-auto hidden sm:block">
                Payout Verification audit panel
              </span>
              <button onClick={() => setSelectedPayout(null)} className="flex items-center gap-1.5 px-3 py-2.5 border border-border-subtle text-text-secondary rounded-lg text-xs font-bold hover:bg-surface-container-low transition-colors cursor-pointer">
                <X className="w-3.5 h-3.5" /> Close
              </button>
              <button onClick={() => { onUpdatePayoutStatus(selectedPayout.id, selectedPayout.status, notes, financeNotes); setSelectedPayout(null); }} className="flex items-center gap-1.5 px-3 py-2.5 border border-border-subtle text-text-secondary rounded-lg text-xs font-bold hover:bg-surface-container-low transition-colors cursor-pointer">
                <Save className="w-3.5 h-3.5" /> Save Draft
              </button>
              {['Pending', 'Under Review', 'On Hold'].includes(selectedPayout.status) && (
                <>
                  <button onClick={() => { setActionMode('revision'); setRevDesc(''); }} className="flex items-center gap-1.5 px-4 py-2.5 bg-warning/10 hover:bg-warning text-warning hover:text-white border border-warning/30 rounded-lg text-xs font-bold transition-colors cursor-pointer">
                    <RefreshCw className="w-3.5 h-3.5" /> Request Revision
                  </button>
                  <button onClick={() => setActionMode('reject')} className="flex items-center gap-1.5 px-4 py-2.5 bg-danger/10 hover:bg-danger text-danger hover:text-white border border-danger/30 rounded-lg text-xs font-bold transition-colors cursor-pointer">
                    <Ban className="w-3.5 h-3.5" /> Reject Request
                  </button>
                  <button onClick={() => setActionMode('hold')} className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-200 hover:bg-slate-700 text-slate-700 hover:text-white border border-slate-300 rounded-lg text-xs font-bold transition-colors cursor-pointer">
                    <Ban className="w-3.5 h-3.5" /> Hold Payout
                  </button>
                  <button onClick={handleApprove} className="flex items-center gap-1.5 px-5 py-2.5 bg-success hover:bg-success/90 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-sm shadow-success/20">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Approve Payout
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
