"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { formatIDR } from '@/lib/pricing';
import { PayoutRequest, PayoutStatus, PAYOUT_REJECTION_REASONS } from '../types';
import {
  AlertTriangle, CheckCircle2,
  ArrowLeft, Ban, Send, Save, X,
  RefreshCw, Clock, Briefcase,
  Paperclip, History, Eye, Download
} from 'lucide-react';
import Modal from '@/components/ui/Modal';

interface PayoutDetailViewProps {
  payout: PayoutRequest;
  onBack: () => void;
  onUpdatePayoutStatus: (id: string, status: PayoutStatus, notes: string, financeNotes: string) => Promise<{ success: boolean; error?: string }>;
  onUpdatePayoutChecklists: (
    id: string,
    financialChecklist: PayoutRequest['financialChecklist'],
    complianceChecklist: PayoutRequest['complianceChecklist']
  ) => void;
  onVerifyBankAccount: (id: string, accountNumber: string) => Promise<boolean>;
}

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

// events.status is an enum; render it the way the rest of the console does.
const EVENT_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  pending_review: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
  needs_revision: 'Needs Revision',
};

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
  onVerifyBankAccount,
}: PayoutDetailViewProps) {
  const [notes, setNotes] = useState(payout.internalNotes || '');
  const [financeNotes, setFinanceNotes] = useState(payout.financeNotes || '');
  const [actionMode, setActionMode] = useState<'view' | 'reject' | 'revision' | 'hold'>('view');
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [approving, setApproving] = useState(false);
  const [approveError, setApproveError] = useState<string | null>(null);

  const [revDesc, setRevDesc] = useState('');
  const [rejectReason, setRejectReason] = useState<typeof PAYOUT_REJECTION_REASONS[number] | ''>('');
  const [verifyingBank, setVerifyingBank] = useState(false);

  // The checklists live HERE, not in the shared payouts list.
  //
  // They used to be pushed into the context's `payouts` array while this page
  // rendered its own object from getPayout — two different objects, so a click
  // updated something nothing on screen was reading and the box never ticked.
  // The context is still notified so the list view agrees, but this state is
  // what renders.
  const [financialChecklist, setFinancialChecklist] = useState(payout.financialChecklist);
  const [complianceChecklist, setComplianceChecklist] = useState(payout.complianceChecklist);

  const handleToggleFinancialChecklist = (field: keyof PayoutRequest['financialChecklist']) => {
    const updated = { ...financialChecklist, [field]: !financialChecklist[field] };
    setFinancialChecklist(updated);
    onUpdatePayoutChecklists(payout.id, updated, complianceChecklist);
  };

  const handleToggleComplianceChecklist = (field: keyof PayoutRequest['complianceChecklist']) => {
    const updated = { ...complianceChecklist, [field]: !complianceChecklist[field] };
    setComplianceChecklist(updated);
    onUpdatePayoutChecklists(payout.id, financialChecklist, updated);
  };

  const handleVerifyBank = async () => {
    setVerifyingBank(true);
    await onVerifyBankAccount(payout.id, payout.bankAccountNumber);
    setVerifyingBank(false);
  };

  const handleApprove = async () => {
    setApproveError(null);
    setApproving(true);
    const res = await onUpdatePayoutStatus(payout.id, 'Approved', notes, financeNotes);
    setApproving(false);
    if (res.success) {
      setShowApproveConfirm(false);
      onBack();
    } else {
      setApproveError(res.error ?? 'Failed to approve payout. Please try again.');
    }
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
  const allChecklistValues = [...Object.values(financialChecklist), ...Object.values(complianceChecklist)];
  const complianceScore = Math.round((allChecklistValues.filter(Boolean).length / allChecklistValues.length) * 100);

  const bankVerified = payout.bankVerificationStatus === 'Verified';

  // Every proportion here divides by gross revenue, which is legitimately 0
  // before an event sells anything. Unguarded that yields NaN, and NaN in a
  // width produces invalid CSS rather than an empty bar.
  const pctOfGross = (value: number) => (s.grossRevenue > 0 ? (value / s.grossRevenue) * 100 : 0);
  const refundPct = pctOfGross(s.refundAmount);
  const avgTicketPrice = s.ticketsSold ? s.grossRevenue / s.ticketsSold : 0;
  const attendanceRate = payout.ticketCapacity ? (s.ticketsSold / payout.ticketCapacity) * 100 : 0;

  // Only conditions something can actually evaluate. The previous list carried
  // four signals hardcoded to false, which read as four passing checks.
  const riskIndicators = [
    { label: 'Duplicate Payout', flagged: payout.fraudDetection.duplicatePayout },
    { label: 'Request Exceeds Net Revenue', flagged: payout.fraudDetection.suspiciousRevenue },
    { label: 'Bank Account Unverified', flagged: !bankVerified },
    { label: 'Organizer Unverified', flagged: payout.organizerStatus !== 'Verified' },
    { label: 'Prior Rejected Events', flagged: payout.organizerPreviousViolations > 0 },
  ];
  const flaggedCount = riskIndicators.filter(r => r.flagged).length;
  const recommendation = flaggedCount >= 3
    ? 'High Risk'
    : flaggedCount >= 1
    ? 'Needs Manual Review'
    : 'Safe to Approve';
  const recommendationColor = recommendation === 'Safe to Approve' ? 'text-success bg-success/5 border-success/20' : recommendation === 'High Risk' ? 'text-danger bg-danger/5 border-danger/20' : 'text-warning bg-warning/5 border-warning/20';

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
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                    payout.organizerStatus === 'Verified'
                      ? 'bg-success/10 text-success border-success/20'
                      : 'bg-warning/10 text-warning border-warning/20'
                  }`}>{payout.organizerStatus}</span>
                </div>
                {payout.applicationId > 0 && (
                  <Link href={`/auditor/organizers/${payout.applicationId}`} className="w-full flex items-center justify-center gap-1.5 mt-2 px-3 py-2 border border-border-subtle text-text-secondary rounded-lg text-[11px] font-bold hover:bg-surface-container-low transition-colors cursor-pointer">
                    <Briefcase className="w-3.5 h-3.5" /> View Organizer Profile
                  </Link>
                )}
              </div>
            </SectionCard>

            <SectionCard title="Bank Information">
              <div className="space-y-2 text-xs">
                {[
                  { label: 'Bank', value: payout.bankName },
                  { label: 'Account Holder', value: payout.bankAccountHolder },
                  { label: 'Account Number', value: payout.bankAccountNumber },
                ].map(r => (
                  <div key={r.label} className="flex justify-between border-b border-border-subtle pb-1.5">
                    <span className="text-text-secondary">{r.label}</span>
                    <span className={`font-semibold text-right ${isMissing(r.value) ? 'text-text-secondary italic font-normal' : 'text-text-primary'}`}>{fieldValue(r.value)}</span>
                  </div>
                ))}
                {/* One signal, shown once. This used to render as three separate
                    checks all derived from bankVerificationStatus, so they always
                    agreed and read as three independent verifications passing. */}
                <div className="pt-1 space-y-2">
                  <div className={`flex items-center gap-2 text-[11px] px-2.5 py-1.5 rounded-lg ${bankVerified ? 'bg-success/5 text-success' : 'bg-warning/5 text-warning'}`}>
                    <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${bankVerified ? 'text-success' : 'text-warning'}`} />
                    <span>{bankVerified ? 'Account verified by an auditor' : 'Account not yet verified'}</span>
                  </div>

                  {/* Who verified it, and when. Blank on accounts grandfathered
                      in by migration 0022, which were verified by nobody —
                      naming an actor there would fabricate an audit trail. */}
                  {bankVerified && payout.bankVerifiedBy?.trim() && (
                    <p className="text-[10px] text-text-secondary">
                      Verified by {payout.bankVerifiedBy}
                      {payout.bankVerifiedAt?.trim() ? ` on ${payout.bankVerifiedAt}` : ''}
                    </p>
                  )}

                  {/* One-way: an auditor confirms, and only an organizer edit
                      resets it. Withheld when there is no account to confirm. */}
                  {!bankVerified && payout.bankAccountNumber?.trim() && (
                    <button
                      onClick={handleVerifyBank}
                      disabled={verifyingBank}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 border border-success/30 bg-success/10 text-success rounded-lg text-[11px] font-bold hover:bg-success hover:text-white transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {verifyingBank ? 'Verifying...' : 'Mark account verified'}
                    </button>
                  )}
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
                  { label: 'Event Status', value: EVENT_STATUS_LABELS[payout.completionStatus] ?? payout.completionStatus },
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
                {/* The auditor review route is keyed by EVENT id — GetEventReview
                    takes an eventID, and AuditorReviewShell passes its route param
                    straight through. /auditor/events reads no query param, so
                    linking there would look wired without being wired. */}
                {payout.eventId > 0 && (
                  <Link href={`/auditor/reviews/${payout.eventId}`} className="w-full flex items-center justify-center gap-1.5 mt-1 px-3 py-2 border border-border-subtle text-text-secondary rounded-lg text-[11px] font-bold hover:bg-surface-container-low transition-colors cursor-pointer">
                    Open Event Review
                  </Link>
                )}
              </div>
            </div>
          </SectionCard>

          {/* Section 4: Revenue Breakdown */}
          <SectionCard title="Revenue Breakdown">
            <div className="flex h-3 rounded-full overflow-hidden border border-border-subtle">
              <div className="bg-danger/60" style={{ width: `${pctOfGross(s.platformFee)}%` }} title="Platform Fee" />
              <div className="bg-orange-400" style={{ width: `${pctOfGross(s.paymentGatewayFee)}%` }} title="Gateway Fee" />
              <div className="bg-purple-300" style={{ width: `${pctOfGross(s.ppn)}%` }} title="PPN on fees" />
              <div className="bg-warning/70" style={{ width: `${pctOfGross(s.entertainmentTax)}%` }} title="Entertainment Tax" />
              <div className="bg-slate-300" style={{ width: `${pctOfGross(s.refundAmount)}%` }} title="Refunds" />
              <div className="bg-success flex-1" title="Net Revenue" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: 'Gross Revenue', value: formatIDR(s.grossRevenue), sub: 'Paid Orders' },
                { label: 'Platform Fee', value: `-${formatIDR(s.platformFee)}`, sub: 'CrowdFlow Cut', isNeg: true },
                { label: 'Gateway Fee', value: `-${formatIDR(s.paymentGatewayFee)}`, sub: 'Payment Provider', isNeg: true },
                { label: 'VAT / PPN', value: `-${formatIDR(s.ppn)}`, sub: 'PPN Charged On Fees', isNeg: true },
                { label: 'Entertainment Tax', value: `-${formatIDR(s.entertainmentTax)}`, sub: 'Region Tax Deduct', isNeg: true },
                { label: 'Refund Amount', value: `-${formatIDR(s.refundAmount)}`, sub: 'Refunded Orders', isNeg: true },
                { label: 'Net Organizer Payout', value: formatIDR(s.netRevenue), sub: 'Transfer Amount', highlight: true },
              ].map((item, idx) => (
                <div key={idx} className={`bg-white border border-border-subtle rounded-xl p-3.5 soft-shadow ${item.highlight ? 'ring-2 ring-success/20 bg-success/5 border-success/30' : ''}`}>
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
            {/* These are the auditor's own working ticks and are NOT stored yet.
                Saying so beats letting someone tick twelve boxes, navigate away
                and assume the review was recorded. */}
            <p className="text-[10px] text-text-secondary -mt-1">
              Working checklist. Not saved — clears when you leave this page.
            </p>
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
                const done = complianceChecklist[item.key];
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
                { key: 'platformFeeCorrect' as const, label: 'Platform Fees Verified' },
                { key: 'taxCorrect' as const, label: 'Entertainment/VAT Taxes Match' },
                { key: 'netRevenueCorrect' as const, label: 'Net Revenue Allocation Valid' },
              ].map(item => {
                const done = financialChecklist[item.key];
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
      <Modal
        open={showApproveConfirm}
        onClose={approving ? undefined : () => setShowApproveConfirm(false)}
        title="Approve Payout"
        description="Confirm this payout is ready for payment processing."
        contentClassName=""
      >
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
                  { label: 'Revenue verified', done: financialChecklist.revenueMatch },
                  { label: 'Bank verified', done: payout.bankVerificationStatus === 'Verified' },
                  { label: 'Tax verified', done: financialChecklist.taxCorrect },
                  { label: 'Compliance completed', done: complianceScore === 100 },
                ].map(item => (
                  <div key={item.label} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg ${item.done ? 'bg-success/5 text-success' : 'bg-warning/5 text-warning'}`}>
                    <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${item.done ? 'text-success' : 'text-warning'}`} />
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
              {approveError && (
                <div className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-[11px] font-medium text-danger">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{approveError}</span>
                </div>
              )}
            </div>
            <div className="p-5 border-t border-border-subtle flex gap-2.5">
              <button onClick={() => setShowApproveConfirm(false)} disabled={approving} className="flex-1 border border-border-subtle text-text-secondary text-xs font-bold py-2.5 rounded-lg hover:bg-surface-container-low transition-colors cursor-pointer disabled:opacity-50">
                Cancel
              </button>
              <button onClick={handleApprove} disabled={approving} className="flex-1 flex items-center justify-center gap-1.5 bg-success hover:bg-success/90 text-white text-xs font-bold py-2.5 rounded-lg transition-colors cursor-pointer disabled:opacity-60">
                {approving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                Approve
              </button>
            </div>
      </Modal>
    </div>
  );
}
