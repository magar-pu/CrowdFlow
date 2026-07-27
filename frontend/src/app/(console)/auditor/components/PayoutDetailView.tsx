"use client";

import React, { useState } from 'react';
import { formatIDR } from '@/lib/pricing';
import { PayoutRequest, PayoutStatus, PAYOUT_REJECTION_REASONS } from '../types';
import {
  AlertTriangle, CheckCircle2,
  ArrowLeft, Ban, Send, Save, X,
  RefreshCw, Clock, Briefcase,
  Paperclip, History, Eye, Download
} from 'lucide-react';

interface PayoutDetailViewProps {
  payout: PayoutRequest;
  onBack: () => void;
  onUpdatePayoutStatus: (id: string, status: PayoutStatus, notes: string, financeNotes: string) => void;
  onUpdatePayoutChecklists: (
    id: string,
    financialChecklist: PayoutRequest['financialChecklist'],
    complianceChecklist: PayoutRequest['complianceChecklist']
  ) => void;
}

const PAYOUT_STAGES = ['Request Submitted', 'Finance Validation', 'Automatic Compliance Check', 'Auditor Review', 'Final Decision', 'Payment Processing', 'Completed'];

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

function stageIndexFor(status: PayoutStatus) {
  switch (status) {
    case 'Pending': return 2;
    case 'Under Review':
    case 'Need Revision':
    case 'On Hold': return 3;
    case 'Approved':
    case 'Rejected': return 4;
    case 'Processing': return 5;
    case 'Paid': return 6;
    default: return 0;
  }
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-border-subtle rounded-xl p-5 soft-shadow space-y-4">
      <h3 className="text-[10px] font-mono font-bold text-text-secondary uppercase tracking-wider">{title}</h3>
      {children}
    </div>
  );
}

export default function PayoutDetailView({
  payout,
  onBack,
  onUpdatePayoutStatus,
  onUpdatePayoutChecklists,
}: PayoutDetailViewProps) {
  const [notes, setNotes] = useState(payout.internalNotes || '');
  const [financeNotes, setFinanceNotes] = useState(payout.financeNotes || '');
  const [actionMode, setActionMode] = useState<'view' | 'reject' | 'revision' | 'hold'>('view');
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);

  const [revDesc, setRevDesc] = useState('');
  const [rejectReason, setRejectReason] = useState<typeof PAYOUT_REJECTION_REASONS[number] | ''>('');

  const handleToggleFinancialChecklist = (field: keyof PayoutRequest['financialChecklist']) => {
    const updatedFinChecklist = {
      ...payout.financialChecklist,
      [field]: !payout.financialChecklist[field]
    };
    onUpdatePayoutChecklists(payout.id, updatedFinChecklist, payout.complianceChecklist);
  };

  const handleToggleComplianceChecklist = (field: keyof PayoutRequest['complianceChecklist']) => {
    const updatedCompChecklist = {
      ...payout.complianceChecklist,
      [field]: !payout.complianceChecklist[field]
    };
    onUpdatePayoutChecklists(payout.id, payout.financialChecklist, updatedCompChecklist);
  };

  const handleApprove = () => {
    onUpdatePayoutStatus(payout.id, 'Approved', notes, financeNotes);
    setShowApproveConfirm(false);
    onBack();
  };

  const handleConfirmReject = () => {
    if (!rejectReason) return;
    const detail = revDesc.trim() ? `${rejectReason}: ${revDesc.trim()}` : rejectReason;
    onUpdatePayoutStatus(payout.id, 'Rejected', notes, financeNotes + '\n[Rejection] ' + detail);
    onBack();
  };

  const handleConfirmHold = () => {
    if (!revDesc.trim()) return;
    onUpdatePayoutStatus(payout.id, 'On Hold', notes, financeNotes + '\n[Hold] ' + revDesc);
    onBack();
  };

  const handleConfirmRevision = () => {
    if (!revDesc.trim()) return;
    onUpdatePayoutStatus(payout.id, 'Need Revision', notes, financeNotes + '\n[Revision Requested] ' + revDesc);
    onBack();
  };

  const s = payout.salesSummary;

  // An absent value must read as absent. Rendering "" leaves a blank cell that
  // is easily taken for a value the reader simply cannot see, which on a
  // money-release screen is the same failure as inventing one.
  const NOT_PROVIDED = 'Not provided';
  const fieldValue = (value: string) => value?.trim() ? value : NOT_PROVIDED;
  const isMissing = (value: string) => !value?.trim();
  const allChecklistValues = [...Object.values(payout.financialChecklist), ...Object.values(payout.complianceChecklist)];
  const complianceScore = Math.round((allChecklistValues.filter(Boolean).length / allChecklistValues.length) * 100);

  const bankChecklist = {
    verified: payout.bankVerificationStatus === 'Verified',
    accountMatch: payout.bankVerificationStatus !== 'Unverified',
    accountActive: payout.bankVerificationStatus !== 'Unverified',
  };

  const refundPct = s.grossRevenue ? (s.refundAmount / s.grossRevenue) * 100 : 0;
  const chargebackPct = s.grossRevenue ? (s.chargebackAmount / s.grossRevenue) * 100 : 0;
  const avgTicketPrice = s.ticketsSold ? s.grossRevenue / s.ticketsSold : 0;
  const attendanceRate = payout.ticketCapacity ? (s.ticketsSold / payout.ticketCapacity) * 100 : 0;

  const riskIndicators = [
    { label: 'High Refund Rate', flagged: payout.fraudDetection.unusualRefundRate },
    { label: 'Chargeback Above Threshold', flagged: payout.fraudDetection.highChargeback },
    { label: 'Revenue Mismatch', flagged: payout.fraudDetection.suspiciousRevenue },
    { label: 'Duplicate Payout', flagged: payout.fraudDetection.duplicatePayout },
    { label: 'Multiple Bank Changes', flagged: payout.fraudDetection.multipleBankChanges },
    { label: 'Suspicious Organizer', flagged: payout.organizerStatus !== 'Verified' || payout.organizerPreviousViolations > 0 },
  ];
  const flaggedCount = riskIndicators.filter(r => r.flagged).length;
  const recommendation = flaggedCount >= 3
    ? 'High Risk'
    : flaggedCount >= 1
    ? 'Needs Manual Review'
    : 'Safe to Approve';
  const recommendationColor = recommendation === 'Safe to Approve' ? 'text-success bg-success/5 border-success/20' : recommendation === 'High Risk' ? 'text-danger bg-danger/5 border-danger/20' : 'text-warning bg-warning/5 border-warning/20';

  const fraudChecks = [
    { label: 'Duplicate Request', flagged: payout.fraudDetection.duplicatePayout },
    { label: 'Revenue Manipulation', flagged: payout.fraudDetection.suspiciousRevenue },
    { label: 'Abnormal Sales Spike', flagged: payout.fraudDetection.abnormalTicketSales },
    { label: 'Refund Abuse', flagged: payout.fraudDetection.unusualRefundRate },
    { label: 'Chargeback Abuse', flagged: payout.fraudDetection.highChargeback },
    { label: 'Multiple Bank Changes', flagged: payout.fraudDetection.multipleBankChanges },
  ];

  const stageIndex = stageIndexFor(payout.status);
  const canAct = ['Pending', 'Under Review', 'On Hold'].includes(payout.status);

  return (
    <div className="flex flex-col min-h-full text-left animate-fade-in font-sans pb-32">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border-subtle mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onBack} className="p-2 border border-border-subtle bg-white hover:bg-surface-container-low text-text-secondary hover:text-text-primary rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold shadow-xs shrink-0">
            <ArrowLeft className="w-4 h-4" /> Back to List
          </button>
          <div className="min-w-0">
            <div className="text-[10px] text-text-secondary font-mono uppercase tracking-wider flex items-center gap-1">
              <span>Auditor Console</span><span>/</span><span>Payout Verification</span><span>/</span>
              <span className="text-text-primary font-bold truncate">{payout.id}</span>
            </div>
            <h2 className="text-lg font-bold text-text-primary truncate mt-0.5">{payout.eventName} Payout</h2>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <span className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold border ${statusColors[payout.status]}`}>{payout.status}</span>
          <span className="font-mono text-[10px] font-bold text-text-secondary bg-surface border border-border-subtle px-2.5 py-1 rounded-lg">Created: {payout.requestDate}</span>
          <span className="font-mono text-[10px] font-bold text-text-secondary bg-surface border border-border-subtle px-2.5 py-1 rounded-lg">Auditor: {payout.currentAuditor?.trim() || 'Unassigned'}</span>
        </div>
      </div>

      {/* Fraud Alert Banner */}
      {payout.fraudDetection.hasAlert && (
        <div className="mb-6 p-4 bg-danger/5 border border-danger/20 rounded-xl flex items-start gap-3 text-danger text-xs leading-relaxed animate-pulse">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold uppercase tracking-wider text-[10px] font-mono">Fraud Alert Flagged</p>
            <p className="mt-1 font-medium">{payout.fraudDetection.alertMessage}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Columns */}
        <div className="lg:col-span-2 space-y-6">

          {/* Section 1 & 2: Organizer Information + Bank Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <SectionCard title="Organizer Information">
              <div className="space-y-2 text-xs">
                {[
                  { label: 'Organizer', value: payout.organizerName },
                  { label: 'Company', value: payout.organizerCompany },
                  { label: 'Email', value: payout.organizerEmail },
                  { label: 'Phone', value: payout.organizerPhone },
                  { label: 'Business License', value: payout.organizerBusinessLicense },
                  { label: 'Previous Violations', value: String(payout.organizerPreviousViolations) },
                ].map(r => (
                  <div key={r.label} className="flex justify-between border-b border-border-subtle pb-1.5">
                    <span className="text-text-secondary">{r.label}</span>
                    <span className={`font-semibold text-right ${isMissing(r.value) ? 'text-text-secondary italic font-normal' : 'text-text-primary'}`}>{fieldValue(r.value)}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-1">
                  <span className="text-text-secondary">Organizer Status</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold border bg-success/10 text-success border-success/20">{payout.organizerStatus}</span>
                </div>
                <button onClick={() => alert(`Opening full organizer profile for ${payout.organizerName}...`)} className="w-full flex items-center justify-center gap-1.5 mt-2 px-3 py-2 border border-border-subtle text-text-secondary rounded-lg text-[11px] font-bold hover:bg-surface-container-low transition-colors cursor-pointer">
                  <Briefcase className="w-3.5 h-3.5" /> View Organizer Profile
                </button>
              </div>
            </SectionCard>

            <SectionCard title="Bank Information">
              <div className="space-y-2 text-xs">
                {[
                  { label: 'Bank', value: payout.bankName },
                  { label: 'Account Holder', value: payout.bankAccountHolder },
                  { label: 'Account Number', value: payout.bankAccountNumber },
                  { label: 'SWIFT Code', value: payout.swiftCode },
                ].map(r => (
                  <div key={r.label} className="flex justify-between border-b border-border-subtle pb-1.5">
                    <span className="text-text-secondary">{r.label}</span>
                    <span className={`font-semibold text-right ${isMissing(r.value) ? 'text-text-secondary italic font-normal' : 'text-text-primary'}`}>{fieldValue(r.value)}</span>
                  </div>
                ))}
                <div className="space-y-1.5 pt-1">
                  {[
                    { label: 'Bank Verified', done: bankChecklist.verified },
                    { label: 'Account Match', done: bankChecklist.accountMatch },
                    { label: 'Account Active', done: bankChecklist.accountActive },
                  ].map(item => (
                    <div key={item.label} className={`flex items-center gap-2 text-[11px] px-2.5 py-1.5 rounded-lg ${item.done ? 'bg-success/5 text-success' : 'bg-surface-container-low text-text-secondary'}`}>
                      <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${item.done ? 'text-success' : 'text-slate-300'}`} />
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </SectionCard>
          </div>

          {/* Section 3: Event Information */}
          <SectionCard title="Event Information">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 text-xs">
                {[
                  { label: 'Event Name', value: payout.eventName },
                  { label: 'Venue', value: payout.venue },
                  { label: 'Event Date', value: payout.eventDate },
                  { label: 'Event Status', value: payout.completionStatus },
                ].map(r => (
                  <div key={r.label} className="flex justify-between border-b border-border-subtle pb-1.5">
                    <span className="text-text-secondary">{r.label}</span>
                    <span className={`font-semibold text-right ${isMissing(r.value) ? 'text-text-secondary italic font-normal' : 'text-text-primary'}`}>{fieldValue(r.value)}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-2 text-xs">
                {[
                  { label: 'Ticket Capacity', value: payout.ticketCapacity ? payout.ticketCapacity.toLocaleString() : '' },
                  { label: 'Tickets Sold', value: s.ticketsSold.toLocaleString() },
                ].map(r => (
                  <div key={r.label} className="flex justify-between border-b border-border-subtle pb-1.5">
                    <span className="text-text-secondary">{r.label}</span>
                    <span className={`font-semibold text-right ${isMissing(r.value) ? 'text-text-secondary italic font-normal' : 'text-text-primary'}`}>{fieldValue(r.value)}</span>
                  </div>
                ))}
                <button onClick={() => alert(`Opening event detail for "${payout.eventName}"...`)} className="w-full flex items-center justify-center gap-1.5 mt-1 px-3 py-2 border border-border-subtle text-text-secondary rounded-lg text-[11px] font-bold hover:bg-surface-container-low transition-colors cursor-pointer">
                  Open Event Detail
                </button>
              </div>
            </div>
          </SectionCard>

          {/* Section 4: Revenue Breakdown */}
          <SectionCard title="Revenue Breakdown">
            <div className="flex h-3 rounded-full overflow-hidden border border-border-subtle">
              <div className="bg-danger/60" style={{ width: `${(s.platformFee / s.grossRevenue) * 100}%` }} title="Platform Fee" />
              <div className="bg-orange-400" style={{ width: `${(s.paymentGatewayFee / s.grossRevenue) * 100}%` }} title="Gateway Fee" />
              <div className="bg-warning/70" style={{ width: `${(s.entertainmentTax / s.grossRevenue) * 100}%` }} title="Entertainment Tax" />
              <div className="bg-purple-300" style={{ width: `${(s.vat / s.grossRevenue) * 100}%` }} title="VAT" />
              <div className="bg-slate-300" style={{ width: `${((s.refundAmount + s.chargebackAmount) / s.grossRevenue) * 100}%` }} title="Refund + Chargeback" />
              <div className="bg-success flex-1" title="Net Revenue" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: 'Gross Revenue', value: formatIDR(s.grossRevenue), sub: 'Standard Fees' },
                { label: 'Platform Fee', value: `-${formatIDR(s.platformFee)}`, sub: 'CrowdFlow Cut', isNeg: true },
                { label: 'Gateway Fee', value: `-${formatIDR(s.paymentGatewayFee)}`, sub: 'Stripe/Midtrans', isNeg: true },
                { label: 'Entertainment Tax', value: `-${formatIDR(s.entertainmentTax)}`, sub: 'Region Tax Deduct', isNeg: true },
                { label: 'VAT / PPN', value: `-${formatIDR(s.vat)}`, sub: '11% National Tax', isNeg: true },
                { label: 'Refund Amount', value: `-${formatIDR(s.refundAmount)}`, sub: 'Approved Returns', isNeg: true },
                { label: 'Chargeback Deduct', value: `-${formatIDR(s.chargebackAmount)}`, sub: 'Disputes Deducted', isNeg: true, isDis: s.chargebackAmount > 0 },
                { label: 'Other Adjustments', value: `-${formatIDR(s.otherAdjustments)}`, sub: 'Manual Corrections', isNeg: true },
                { label: 'Net Organizer Payout', value: formatIDR(s.netRevenue), sub: 'Transfer Amount', highlight: true },
              ].map((item, idx) => (
                <div key={idx} className={`bg-white border border-border-subtle rounded-xl p-3.5 soft-shadow ${item.highlight ? 'ring-2 ring-success/20 bg-success/5 border-success/30' : item.isDis ? 'ring-2 ring-danger/20 bg-danger/5 border-danger/30' : ''}`}>
                  <p className="text-[8px] font-mono text-text-secondary uppercase tracking-wider">{item.label}</p>
                  <p className={`text-sm font-bold mt-0.5 ${item.highlight ? 'text-success' : item.isNeg ? 'text-danger' : 'text-text-primary'}`}>{item.value}</p>
                  <p className="text-[8px] text-text-secondary font-mono mt-0.5">{item.sub}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Section 5: Sales Summary */}
          <SectionCard title="Sales Summary">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: 'Tickets Sold', value: s.ticketsSold.toLocaleString() },
                { label: 'Gross Revenue', value: formatIDR(s.grossRevenue) },
                { label: 'Refund %', value: `${refundPct.toFixed(1)}%` },
                { label: 'Chargeback %', value: `${chargebackPct.toFixed(1)}%` },
                { label: 'Avg. Ticket Price', value: formatIDR(avgTicketPrice) },
                { label: 'Attendance Rate', value: `${attendanceRate.toFixed(0)}%` },
              ].map((item, idx) => (
                <div key={idx} className="bg-surface-container-low border border-border-subtle rounded-xl p-3 text-center">
                  <p className="text-sm font-bold text-text-primary">{item.value}</p>
                  <p className="text-[8px] font-mono text-text-secondary uppercase tracking-wider mt-0.5">{item.label}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Section 9: Timeline */}
          <SectionCard title="Payout Timeline">
            <div className="relative flex justify-between items-start gap-1 overflow-x-auto pb-1">
              <div className="absolute left-4 right-4 top-4 h-0.5 bg-surface-container -z-10"></div>
              {PAYOUT_STAGES.map((stage, idx) => {
                const isCompleted = idx < stageIndex || payout.status === 'Paid';
                const isCurrent = idx === stageIndex && payout.status !== 'Paid';
                return (
                  <div key={stage} className="flex flex-col items-center gap-1.5 flex-1 text-center min-w-[70px]">
                    <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-[10px] font-bold shrink-0 ${
                      isCompleted ? 'bg-secondary border-secondary text-white' :
                      isCurrent ? 'bg-primary border-primary text-on-primary' :
                      'bg-white border-border-subtle text-on-surface-variant'
                    }`}>
                      {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
                    </div>
                    <span className={`text-[9px] font-bold leading-tight ${isCurrent ? 'text-text-primary' : 'text-on-surface-variant'}`}>{stage}</span>
                  </div>
                );
              })}
            </div>
          </SectionCard>

          {/* Section 10: Activity Log */}
          <SectionCard title="Activity Log">
            <div id="activity-log-section" className="space-y-4 pt-1 scroll-mt-6">
              {payout.timeline.map((t, idx) => (
                <div key={idx} className="flex gap-2.5 text-xs">
                  <div className="flex flex-col items-center">
                    <div className="w-5 h-5 rounded-full bg-surface-container-low border border-border-subtle flex items-center justify-center shrink-0">
                      <Clock className="w-2.5 h-2.5 text-text-secondary" />
                    </div>
                    {idx < payout.timeline.length - 1 && <div className="w-px flex-1 bg-border-subtle my-1" />}
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

          {/* Section 11: Revision History */}
          {payout.revisionHistory.length > 0 && (
            <SectionCard title="Revision History">
              <div className="space-y-2.5">
                {payout.revisionHistory.map((rev, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-3 text-xs border border-border-subtle rounded-lg p-3 bg-surface-container-low">
                    <div className="min-w-0">
                      <p className="font-bold text-text-primary truncate">{rev.reason}</p>
                      <p className="text-[10px] text-text-secondary font-mono mt-0.5">{rev.date} · {rev.status} · Resolved by {rev.resolvedBy}</p>
                    </div>
                    <button onClick={() => alert(`Revision detail:\n${rev.reason}\nStatus: ${rev.status}`)} className="flex items-center gap-1 px-2.5 py-1 border border-border-subtle bg-white rounded text-[10px] font-bold text-text-secondary hover:bg-surface-container-low transition-colors cursor-pointer shrink-0">
                      <History className="w-3 h-3" /> View Detail
                    </button>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Section 13: Attachments */}
          <SectionCard title="Attachments">
            <div className="space-y-2">
              {payout.attachments.length === 0 && (
                <div className="flex flex-col items-center gap-1.5 rounded-lg border border-dashed border-border-subtle py-6 text-center">
                  <Paperclip className="w-4 h-4 text-on-surface-variant" />
                  <p className="text-xs font-bold text-text-primary">No attachments</p>
                  <p className="text-[11px] text-text-secondary">Supporting files for this payout have not been uploaded.</p>
                </div>
              )}
              {payout.attachments.map((att, idx) => (
                <div key={idx} className="flex items-center justify-between gap-3 text-xs border border-border-subtle rounded-lg p-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Paperclip className="w-3.5 h-3.5 text-on-surface-variant shrink-0" />
                    <div className="min-w-0">
                      <p className="font-bold text-text-primary truncate">{att.name}</p>
                      <p className="text-[9px] text-text-secondary font-mono">{att.type}</p>
                    </div>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => alert(`Previewing ${att.name}...`)} className="p-1.5 border border-border-subtle rounded hover:bg-surface-container-low transition-colors cursor-pointer" title="Preview">
                      <Eye className="w-3.5 h-3.5 text-text-secondary" />
                    </button>
                    <button onClick={() => alert(`Downloading ${att.name}...`)} className="p-1.5 border border-border-subtle rounded hover:bg-surface-container-low transition-colors cursor-pointer" title="Download">
                      <Download className="w-3.5 h-3.5 text-text-secondary" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

        </div>

        {/* Right Column: Checklists & Risk */}
        <div className="space-y-6">

          {/* Section 6: Compliance Checklist */}
          <SectionCard title="Compliance Checklist">
            <div className="flex items-center justify-between pb-1">
              <span className="text-xs text-text-secondary">Compliance Score</span>
              <span className={`text-sm font-bold ${complianceScore >= 80 ? 'text-success' : complianceScore >= 50 ? 'text-warning' : 'text-danger'}`}>{complianceScore}%</span>
            </div>
            <div className="space-y-2">
              {[
                { key: 'eventApproved' as const, label: 'Event Approved' },
                { key: 'organizerVerified' as const, label: 'Organizer Verified' },
                { key: 'requiredDocumentsComplete' as const, label: 'Required Documents Complete' },
                { key: 'noActiveInvestigation' as const, label: 'No Active Investigation' },
                { key: 'noPendingRevision' as const, label: 'No Pending Revision' },
              ].map(item => {
                const done = payout.complianceChecklist[item.key];
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

          {/* Section 7: Fraud indicators */}
          <SectionCard title="Fraud Indicators">
            <div className="space-y-2 text-xs">
              {riskIndicators.map((item, idx) => (
                <div key={idx} className="flex justify-between border-b border-border-subtle pb-1.5">
                  <span className="text-text-secondary">{item.label}</span>
                  <span className={`font-bold ${item.flagged ? 'text-danger' : 'text-success'}`}>{item.flagged ? 'FLAGGED' : 'CLEAR'}</span>
                </div>
              ))}
            </div>
            <div className={`p-2.5 rounded-lg border text-center text-xs font-bold ${recommendationColor}`}>
              System Recommendation: {recommendation}
            </div>
          </SectionCard>

          {/* Financial Validation Checklist */}
          <SectionCard title="Financial Validation Checklist">
            <div className="space-y-2">
              {[
                { key: 'revenueMatch' as const, label: 'Revenue Matches Gateways' },
                { key: 'ticketSalesMatch' as const, label: 'Ticket Sales Logs Verified' },
                { key: 'refundCalculated' as const, label: 'Refunds Properly Calculated' },
                { key: 'chargebackApplied' as const, label: 'Chargebacks Accounted/Deducted' },
                { key: 'platformFeeCorrect' as const, label: 'Platform Fees Verified' },
                { key: 'taxCorrect' as const, label: 'Entertainment/VAT Taxes Match' },
                { key: 'netRevenueCorrect' as const, label: 'Net Revenue Allocation Valid' },
              ].map(item => {
                const done = payout.financialChecklist[item.key];
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

          {/* Section 8: Fraud Detection */}
          <SectionCard title="Fraud Detection">
            <div className="space-y-2 text-xs">
              {fraudChecks.map((item, idx) => {
                const label = item.flagged ? (payout.fraudDetection.hasAlert ? 'CRITICAL' : 'WARNING') : 'PASSED';
                const color = item.flagged ? (payout.fraudDetection.hasAlert ? 'text-danger' : 'text-warning') : 'text-success';
                return (
                  <div key={idx} className="flex justify-between border-b border-border-subtle pb-1.5">
                    <span className="text-text-secondary">{item.label}</span>
                    <span className={`font-bold ${color}`}>{label}</span>
                  </div>
                );
              })}
            </div>
          </SectionCard>

          {/* Section 12: Auditor Notes */}
          <SectionCard title="Auditor Notes">
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[9px] font-mono font-bold text-text-secondary uppercase">Internal Notes (not visible to organizer)</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Notes about this payout request..."
                  className="w-full p-2.5 border border-border-subtle rounded-lg text-xs bg-white outline-none resize-none placeholder:text-text-secondary focus:border-secondary focus:ring-1 focus:ring-secondary/20"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-mono font-bold text-text-secondary uppercase">Organizer Notes (sent to organizer)</label>
                <textarea
                  value={financeNotes}
                  onChange={e => setFinanceNotes(e.target.value)}
                  rows={2}
                  placeholder="Notes sent to the organizer..."
                  className="w-full p-2.5 border border-border-subtle rounded-lg text-xs bg-white outline-none resize-none placeholder:text-text-secondary focus:border-secondary focus:ring-1 focus:ring-secondary/20"
                />
              </div>
            </div>
          </SectionCard>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-white/95 border-t border-border-subtle backdrop-blur-md px-4 py-3 sm:px-6">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-3 flex-wrap">
          {actionMode === 'reject' ? (
            <>
              <div className="flex-1 min-w-[260px] space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {PAYOUT_REJECTION_REASONS.map(reason => (
                    <button
                      key={reason}
                      onClick={() => setRejectReason(reason)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer ${rejectReason === reason ? 'bg-danger text-white border-danger' : 'border-border-subtle text-text-secondary hover:bg-surface-container-low'}`}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
                <input
                  value={revDesc}
                  onChange={e => setRevDesc(e.target.value)}
                  placeholder="Additional comment (optional)..."
                  className="w-full px-3 py-2 border border-border-subtle rounded-lg text-xs bg-white outline-none focus:border-danger focus:ring-1 focus:ring-danger/20"
                />
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => { setActionMode('view'); setRejectReason(''); }} className="flex items-center gap-1 px-3 py-2 border border-border-subtle text-text-secondary rounded-lg text-xs font-bold hover:bg-surface-container-low transition-colors cursor-pointer"><X className="w-3.5 h-3.5" /> Cancel</button>
                <button onClick={handleConfirmReject} disabled={!rejectReason} className="flex items-center gap-1.5 px-4 py-2 bg-danger text-white rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"><Ban className="w-3.5 h-3.5" /> Confirm Rejection</button>
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
              <button onClick={onBack} className="flex items-center gap-1.5 px-3 py-2.5 border border-border-subtle text-text-secondary rounded-lg text-xs font-bold hover:bg-surface-container-low transition-colors cursor-pointer">
                <X className="w-3.5 h-3.5" /> Back
              </button>
              <button onClick={() => { onUpdatePayoutStatus(payout.id, payout.status, notes, financeNotes); onBack(); }} className="flex items-center gap-1.5 px-3 py-2.5 border border-border-subtle text-text-secondary rounded-lg text-xs font-bold hover:bg-surface-container-low transition-colors cursor-pointer">
                <Save className="w-3.5 h-3.5" /> Save Draft
              </button>
              {canAct && (
                <>
                  <button onClick={() => { setActionMode('revision'); setRevDesc(''); }} className="flex items-center gap-1.5 px-4 py-2.5 bg-warning/10 hover:bg-warning text-warning hover:text-white border border-warning/30 rounded-lg text-xs font-bold transition-colors cursor-pointer">
                    <RefreshCw className="w-3.5 h-3.5" /> Request Revision
                  </button>
                  <button onClick={() => { setActionMode('reject'); setRejectReason(''); setRevDesc(''); }} className="flex items-center gap-1.5 px-4 py-2.5 bg-danger/10 hover:bg-danger text-danger hover:text-white border border-danger/30 rounded-lg text-xs font-bold transition-colors cursor-pointer">
                    <Ban className="w-3.5 h-3.5" /> Reject Request
                  </button>
                  <button onClick={() => { setActionMode('hold'); setRevDesc(''); }} className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-200 hover:bg-slate-700 text-slate-700 hover:text-white border border-slate-300 rounded-lg text-xs font-bold transition-colors cursor-pointer">
                    <Ban className="w-3.5 h-3.5" /> Hold Payout
                  </button>
                  <button onClick={() => setShowApproveConfirm(true)} className="flex items-center gap-1.5 px-5 py-2.5 bg-success hover:bg-success/90 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-sm shadow-success/20">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Approve Payout
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Approval Confirmation Modal */}
      {showApproveConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-border-subtle shadow-2xl w-full max-w-md animate-fade-in">
            <div className="p-5 border-b border-border-subtle">
              <h3 className="text-base font-bold text-text-primary">Approve Payout</h3>
              <p className="text-xs text-text-secondary mt-0.5">Confirm this payout is ready for payment processing.</p>
            </div>
            <div className="p-5 space-y-3 text-xs">
              {[
                { label: 'Organizer', value: payout.organizerName },
                { label: 'Event', value: payout.eventName },
                { label: 'Requested Amount', value: formatIDR(payout.requestedAmount) },
                { label: 'Net Revenue', value: formatIDR(payout.netRevenue) },
              ].map(r => (
                <div key={r.label} className="flex justify-between border-b border-border-subtle pb-1.5">
                  <span className="text-text-secondary">{r.label}</span>
                  <span className="font-bold text-text-primary">{r.value}</span>
                </div>
              ))}
              <div className="space-y-1.5 pt-2">
                {[
                  { label: 'Revenue verified', done: payout.financialChecklist.revenueMatch },
                  { label: 'Bank verified', done: payout.bankVerificationStatus === 'Verified' },
                  { label: 'Tax verified', done: payout.financialChecklist.taxCorrect },
                  { label: 'Compliance completed', done: complianceScore === 100 },
                ].map(item => (
                  <div key={item.label} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg ${item.done ? 'bg-success/5 text-success' : 'bg-warning/5 text-warning'}`}>
                    <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${item.done ? 'text-success' : 'text-warning'}`} />
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-5 border-t border-border-subtle flex gap-2.5">
              <button onClick={() => setShowApproveConfirm(false)} className="flex-1 border border-border-subtle text-text-secondary text-xs font-bold py-2.5 rounded-lg hover:bg-surface-container-low transition-colors cursor-pointer">
                Cancel
              </button>
              <button onClick={handleApprove} className="flex-1 bg-success hover:bg-success/90 text-white text-xs font-bold py-2.5 rounded-lg transition-colors cursor-pointer">
                Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
