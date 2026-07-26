"use client";

import React, { useState, useRef } from 'react';
import { updateRevisionStatus } from '@/lib/api/auditor';
import { EventSubmission, ReviewStage, RiskLevel, RevisionEntry, ReviewDocument, docKey } from '../types';
import {
  ArrowLeft, CheckCircle2, FileText, MapPin, CalendarDays, Users2,
  Send, AlertTriangle, Ban, Building2, Truck, DollarSign, Clock,
  RefreshCw, Shield, ExternalLink, Download, Eye, ChevronRight,
  Activity, GitBranch, MessageSquare, Star, TrendingUp, TrendingDown,
  Phone, Mail, Globe, Package, Zap, Archive, Save, X
} from 'lucide-react';

type Tab = 'overview' | 'documents' | 'venue' | 'logistics' | 'finance' | 'history' | 'revision';

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'overview', label: 'Overview', icon: <Star className="w-3.5 h-3.5" /> },
  { key: 'documents', label: 'Documents', icon: <FileText className="w-3.5 h-3.5" /> },
  { key: 'venue', label: 'Venue', icon: <Building2 className="w-3.5 h-3.5" /> },
  { key: 'logistics', label: 'Logistics', icon: <Truck className="w-3.5 h-3.5" /> },
  { key: 'finance', label: 'Finance', icon: <DollarSign className="w-3.5 h-3.5" /> },
  { key: 'history', label: 'History', icon: <Clock className="w-3.5 h-3.5" /> },
  { key: 'revision', label: 'Revision', icon: <RefreshCw className="w-3.5 h-3.5" /> },
];

const TIMELINE_STAGES: ReviewStage[] = ['Submitted', 'Document Verification', 'Event Validation', 'Final Approval'];

const riskColors: Record<RiskLevel, string> = {
  Low: 'bg-success/10 text-success border-success/20',
  Medium: 'bg-warning/10 text-warning border-warning/20',
  High: 'bg-orange-100 text-orange-600 border-orange-200',
  Critical: 'bg-danger/10 text-danger border-danger/20',
};

const statusColor = (s: string) => {
  if (s === 'VERIFIED') return 'bg-success/10 text-success border-success/20';
  if (s === 'REJECTED') return 'bg-danger/10 text-danger border-danger/20';
  if (s === 'MISSING') return 'bg-slate-100 text-slate-400 border-slate-200';
  if (s === 'WAITING REVIEW') return 'bg-warning/10 text-warning border-warning/20';
  return 'bg-secondary/10 text-secondary border-secondary/20';
};

interface Props {
  submission: EventSubmission;
  onBack: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
  onRequestChanges: (id: string, notes: string) => void;
  onVerifyDocument: (submissionId: string, docName: string) => void;
  onRejectDocument: (submissionId: string, docName: string) => void;
  onViewDocument: (doc: { name: string; category: string; status: string }) => void;
  /** Mints a signed link and opens the real file. */
  onOpenDocumentFile: (doc: ReviewDocument) => void;
  onChangeStage: (submissionId: string, stage: ReviewStage) => void;
  onAddRevision: (submissionId: string, revision: RevisionEntry) => void;
  onRefresh?: () => void;
}

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

function ChecklistRow({ label, done }: { label: string; done: boolean }) {
  return (
    <div className={`flex items-center gap-2.5 text-xs px-3 py-2 rounded-lg ${done ? 'bg-success/5 text-success border border-success/10' : 'bg-surface-container-low border border-border-subtle text-text-secondary'}`}>
      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
      <span className="font-medium">{label}</span>
    </div>
  );
}

// ─── TAB: OVERVIEW ────────────────────────────────────────────────────────────
function TabOverview({ sub, onChangeStage }: { sub: EventSubmission; onChangeStage?: (stage: ReviewStage) => void }) {
  const stageIndex = TIMELINE_STAGES.indexOf(sub.stage);
  const isResolved = sub.status !== 'Pending';

  return (
    <div className="space-y-6">
      {/* Event Banner + Key Stats */}
      {sub.bannerUrl && (
        <div className="relative h-40 rounded-xl overflow-hidden soft-shadow">
          <img src={sub.bannerUrl} alt={sub.eventName} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          <div className="absolute bottom-4 left-5 flex items-end gap-4 text-white">
            <div>
              <p className="text-xs font-mono opacity-70">{sub.category}</p>
              <h3 className="text-xl font-bold">{sub.eventName}</h3>
            </div>
          </div>
          <div className="absolute top-3 right-3 flex gap-2">
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${riskColors[sub.riskLevel]}`}>{sub.riskLevel} Risk</span>
          </div>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Capacity', value: sub.capacity.toLocaleString(), icon: <Users2 className="w-4 h-4" /> },
          { label: 'Tickets Sold', value: sub.ticketSold.toLocaleString(), icon: <TrendingUp className="w-4 h-4" /> },
          { label: 'Compliance', value: `${sub.complianceScore}%`, icon: <Shield className="w-4 h-4" /> },
          { label: 'Missing Docs', value: sub.missingDocs.toString(), icon: <AlertTriangle className="w-4 h-4" /> },
        ].map(s => (
          <div key={s.label} className="bg-white border border-border-subtle rounded-xl p-4 soft-shadow text-center">
            <div className="flex justify-center mb-1 text-text-secondary">{s.icon}</div>
            <div className="text-lg font-bold text-text-primary">{s.value}</div>
            <div className="text-[10px] text-text-secondary font-mono uppercase">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Event Info */}
        <SectionCard title="Event Information">
          <div className="space-y-2.5 text-xs text-text-secondary">
            {[
              { icon: <CalendarDays className="w-3.5 h-3.5" />, label: 'Date', value: sub.date },
              { icon: <MapPin className="w-3.5 h-3.5" />, label: 'Venue', value: sub.venue },
              { icon: <Users2 className="w-3.5 h-3.5" />, label: 'Category', value: sub.category },
              { icon: <Shield className="w-3.5 h-3.5" />, label: 'Assigned Auditor', value: sub.assignedAuditor },
              { icon: <Clock className="w-3.5 h-3.5" />, label: 'Last Updated', value: sub.lastUpdated },
            ].map(r => (
              <div key={r.label} className="flex items-center gap-2">
                <span className="text-on-surface-variant shrink-0">{r.icon}</span>
                <span className="text-text-secondary">{r.label}:</span>
                <span className="text-text-primary font-medium">{r.value}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Organizer Info */}
        <SectionCard title="Organizer Information">
          <div className="flex items-center gap-3 mb-3">
            <img src={sub.organizerAvatar} alt={sub.organizerName} className="w-10 h-10 rounded-full object-cover border border-border-subtle" />
            <div>
              <p className="text-sm font-bold text-text-primary">{sub.organizerDetail.companyName}</p>
              <p className="text-[10px] text-text-secondary font-mono">{sub.organizerDetail.businessLicense}</p>
            </div>
          </div>
          <div className="space-y-2 text-xs text-text-secondary">
            {[
              { icon: <Users2 className="w-3.5 h-3.5" />, value: `PIC: ${sub.organizerDetail.pic}` },
              { icon: <Mail className="w-3.5 h-3.5" />, value: sub.organizerDetail.email },
              { icon: <Phone className="w-3.5 h-3.5" />, value: sub.organizerDetail.phone },
              { icon: <MapPin className="w-3.5 h-3.5" />, value: sub.organizerDetail.address },
            ].map((r, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-on-surface-variant shrink-0">{r.icon}</span>
                <span className="text-text-primary">{r.value}</span>
              </div>
            ))}
          </div>
          <button className="mt-3 flex items-center gap-1 text-xs font-semibold text-secondary hover:underline cursor-pointer">
            <ExternalLink className="w-3 h-3" /> View Profile
          </button>
        </SectionCard>

        {/* Verification Timeline */}
        <SectionCard title="Verification Stage — Click to Change">
          <div className="relative flex justify-between items-start gap-1 pt-1">
            <div className="absolute left-4 right-4 top-5 h-0.5 bg-surface-container -z-10" />
            {TIMELINE_STAGES.map((stage, idx) => {
              const done = isResolved || idx < stageIndex;
              const current = !isResolved && idx === stageIndex;
              return (
                <button key={stage} onClick={() => !isResolved && onChangeStage?.(stage as ReviewStage)} className="flex flex-col items-center gap-1.5 flex-1 text-center group cursor-pointer bg-transparent border-0 outline-none">
                  <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all group-hover:scale-110 ${done ? 'bg-secondary border-secondary text-white' : current ? 'bg-primary border-primary text-white' : 'bg-white border-border-subtle text-text-secondary hover:border-text-secondary'}`}>
                    {done ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                  </div>
                  <span className={`text-[9px] font-bold ${current ? 'text-text-primary' : 'text-text-secondary'} leading-tight text-center`}>{stage}</span>
                </button>
              );
            })}
          </div>
        </SectionCard>

        {/* Compliance History */}
        <SectionCard title="Organizer Compliance History">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Previous Audits', value: sub.complianceHistory.previousAudits, icon: <Archive className="w-4 h-4" /> },
              { label: 'Violations', value: sub.complianceHistory.previousViolations, icon: <AlertTriangle className="w-4 h-4" /> },
              { label: 'Revisions', value: sub.complianceHistory.previousRevisions, icon: <RefreshCw className="w-4 h-4" /> },
              { label: 'Approved Events', value: sub.complianceHistory.previousApprovedEvents, icon: <CheckCircle2 className="w-4 h-4" /> },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-2.5 bg-surface-container-low p-3 rounded-lg border border-border-subtle">
                <span className="text-text-secondary">{s.icon}</span>
                <div>
                  <p className="text-sm font-bold text-text-primary">{s.value}</p>
                  <p className="text-[9px] font-mono text-text-secondary uppercase">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* Verification Checklist */}
      <SectionCard title="Verification Checklist">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {sub.checklist.map(c => <ChecklistRow key={c.label} label={c.label} done={c.done} />)}
        </div>
      </SectionCard>
    </div>
  );
}

// ─── TAB: DOCUMENTS ───────────────────────────────────────────────────────────
function TabDocuments({ sub, onVerify, onReject, onView, onOpenFile, onAddRevision }: {
  sub: EventSubmission;
  onVerify: (docKey: string) => void;
  onReject: (docKey: string) => void;
  onView: (doc: { name: string; category: string; status: string }) => void;
  onOpenFile: (doc: ReviewDocument) => void;
  onAddRevision: (submissionId: string, revision: RevisionEntry) => void;
}) {
  const [notes, setNotes] = useState('');
  const [revisingDocName, setRevisingDocName] = useState<string | null>(null);
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [customReason, setCustomReason] = useState('');
  const [priority, setPriority] = useState<RevisionPriority>('High');
  const [deadline, setDeadline] = useState('');

  const toggleReason = (reason: string) => {
    setSelectedReasons(prev => prev.includes(reason) ? prev.filter(r => r !== reason) : [...prev, reason]);
  };

  const handleSendDocRevision = (doc: any) => {
    if (selectedReasons.length === 0 && !customReason.trim()) return;

    const reasonsText = selectedReasons
      .map(r => r === 'Lainnya' ? `Lainnya: ${customReason}` : r)
      .join(', ');

    const newRevision: RevisionEntry = {
      id: `REV-DOC-${Math.floor(1000 + Math.random() * 9000)}`,
      category: 'Documents' as const,
      affectedSection: doc.category,
      priority: priority,
      status: 'Sent' as const,
      requestedBy: 'Priya Nair',
      requestDate: new Date().toISOString().split('T')[0],
      deadline: deadline || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      title: `Revision requested: ${doc.name}`,
      description: `Issues identified with document: ${reasonsText}`,
      requiredAction: `Please upload a corrected version of the document "${doc.name}" matching compliance guidelines. Specific issues: ${reasonsText}`,
      severity: priority === 'Critical' || priority === 'High' ? ('Critical' as const) : ('Medium' as const),
      area: 'Document' as const,
      revisionTimeline: [
        {
          id: `rt-${Math.random()}`,
          actor: 'Priya Nair',
          role: 'Auditor',
          action: 'Revision Created',
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
        }
      ]
    };

    onAddRevision(sub.id, newRevision);
    onReject(String(doc.id || doc.name)); // Updates document status to REJECTED

    // Reset Form
    setRevisingDocName(null);
    setSelectedReasons([]);
    setCustomReason('');
    setDeadline('');
  };

  const verified = sub.documents.filter(d => d.status === 'VERIFIED').length;
  const needReview = sub.documents.filter(d => d.status === 'WAITING REVIEW' || d.status === 'READY').length;
  const rejected = sub.documents.filter(d => d.status === 'REJECTED').length;
  const missing = sub.documents.filter(d => d.status === 'MISSING').length;
  const score = Math.round((verified / sub.documents.length) * 100);

  return (
    <div className="space-y-6">
      {/* Compliance Score */}
      <SectionCard title="Document Compliance Score">
        <div className="flex items-center gap-6">
          <ScoreBadge score={score} />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1">
            {[
              { label: 'Total', value: sub.documents.length, color: 'text-text-primary' },
              { label: 'Verified', value: verified, color: 'text-success' },
              { label: 'Need Review', value: needReview, color: 'text-warning' },
              { label: 'Rejected', value: rejected, color: 'text-danger' },
              { label: 'Missing', value: missing, color: 'text-slate-400' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[10px] text-text-secondary font-mono uppercase mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </SectionCard>

      {/* Document Repository */}
      <SectionCard title="Document Repository">
        <div className="space-y-2.5">
          {sub.documents.map((doc, i) => {
            const isRevising = revisingDocName === doc.name;
            const hasActiveRevision = sub.revisions.some(
              r => r.category === 'Documents' && r.affectedSection === doc.category && r.status !== 'Resolved' && r.status !== 'Rejected'
            );

            return (
              <div key={i} className="border border-border-subtle rounded-xl overflow-hidden bg-white">
                <div className={`flex items-center justify-between gap-3 p-3.5 transition-colors ${doc.status === 'MISSING' ? 'bg-slate-50 border-dashed opacity-60' : 'bg-white'}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-1.5 bg-surface-container-low border border-border-subtle rounded shrink-0">
                      <FileText className="w-4 h-4 text-on-surface-variant" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-text-primary truncate">{doc.name}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {/* Which paperwork this is: submitted for THIS event, or
                            account-level and reused across all of them. An auditor
                            judging an event needs to tell those apart. */}
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border ${
                          doc.source === 'event'
                            ? 'bg-secondary/10 text-secondary border-secondary/20'
                            : 'bg-surface-container text-text-secondary border-border-subtle'
                        }`}>
                          {doc.source === 'event' ? 'This event' : 'Organizer account'}
                        </span>
                        <span className="text-[9px] font-mono text-text-secondary">{doc.category}</span>
                        {doc.uploadDate && doc.status !== 'MISSING' && <span className="text-[9px] text-text-secondary">· Uploaded {doc.uploadDate}</span>}
                        {doc.expiredDate && <span className="text-[9px] text-orange-500 font-medium">· Exp. {doc.expiredDate}</span>}
                        {doc.status === 'MISSING' && (
                          <span className="text-[9px] text-danger font-bold">· Never uploaded</span>
                        )}
                        {hasActiveRevision && (
                          <span className="bg-warning/10 text-warning border border-warning/20 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider">
                            Revision Requested
                          </span>
                        )}
                      </div>
                      {/* The reason travels back to the organizer's Documents tab,
                          so it is worth showing what was already said. */}
                      {doc.status === 'REJECTED' && doc.reviewNotes && (
                        <p className="mt-1 text-[10px] font-semibold text-danger">
                          Rejected: {doc.reviewNotes}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {doc.status !== 'MISSING' && (
                      <>
                        <button onClick={() => onView({ name: doc.name, category: doc.category, status: doc.status })} className="p-1.5 text-text-secondary hover:text-primary hover:bg-surface-container-low rounded transition-colors cursor-pointer" title="Preview"><Eye className="w-3.5 h-3.5" /></button>
                        <button onClick={() => onOpenFile(doc)} className="p-1.5 text-text-secondary hover:text-primary hover:bg-surface-container-low rounded transition-colors cursor-pointer" title="Open file"><Download className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setRevisingDocName(isRevising ? null : doc.name)} className={`p-1.5 rounded transition-colors cursor-pointer ${isRevising ? 'bg-warning text-white' : 'text-text-secondary hover:text-warning hover:bg-surface-container-low'}`} title="Request Revision"><RefreshCw className="w-3.5 h-3.5" /></button>
                      </>
                    )}
                    {doc.status !== 'VERIFIED' && doc.status !== 'REJECTED' && doc.status !== 'MISSING' ? (
                      <div className="flex gap-1.5">
                        <button onClick={() => onVerify(docKey(doc))} className="bg-success/10 hover:bg-success hover:text-white border border-success/20 text-success text-[10px] font-bold px-2.5 py-1 rounded transition-all cursor-pointer">Verify</button>
                        <button onClick={() => onReject(docKey(doc))} className="bg-danger/10 hover:bg-danger hover:text-white border border-danger/20 text-danger text-[10px] font-bold px-2.5 py-1 rounded transition-all cursor-pointer">Reject</button>
                      </div>
                    ) : (
                      <span className={`px-2.5 py-0.5 rounded-full font-mono text-[9px] font-bold border ${statusColor(doc.status)}`}>{doc.status}</span>
                    )}
                  </div>
                </div>

                {/* Inline Document Revision Request Form */}
                {isRevising && (
                  <div className="border-t border-border-subtle bg-surface-container-low/40 p-4 space-y-4">
                    <p className="text-xs font-bold text-text-primary">Configure Revision Request for "{doc.name}"</p>

                    {/* Rejection reasons checklist */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-mono font-bold text-text-secondary uppercase">Select Compliance Issues</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {DOCUMENT_REJECTION_REASONS.map(reason => (
                          <button
                            key={reason}
                            onClick={() => toggleReason(reason)}
                            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-xs text-left transition-colors cursor-pointer ${selectedReasons.includes(reason) ? 'bg-secondary/10 border-secondary/30 text-secondary font-semibold' : 'bg-white border-border-subtle text-text-secondary hover:border-slate-400'}`}
                          >
                            <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${selectedReasons.includes(reason) ? 'bg-secondary border-secondary' : 'border-slate-300'}`}>
                              {selectedReasons.includes(reason) && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
                            </div>
                            {reason}
                          </button>
                        ))}
                      </div>
                      {selectedReasons.includes('Lainnya') && (
                        <input
                          value={customReason}
                          onChange={e => setCustomReason(e.target.value)}
                          placeholder="Describe other custom reason..."
                          className="w-full mt-2 px-3 py-2 border border-border-subtle rounded-lg text-xs bg-white outline-none placeholder:text-text-secondary focus:border-secondary focus:ring-1 focus:ring-secondary/20"
                        />
                      )}
                    </div>

                    {/* Priority & SLA */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-mono font-bold text-text-secondary uppercase">Priority & SLA</label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {(['Low', 'Medium', 'High', 'Critical'] as RevisionPriority[]).map(p => (
                          <button
                            key={p}
                            onClick={() => setPriority(p)}
                            className={`flex flex-col items-center py-2 px-3 rounded-lg border text-xs font-bold transition-all cursor-pointer ${priority === p ? (p === 'Critical' ? 'bg-danger text-white border-danger' : p === 'High' ? 'bg-orange-500 text-white border-orange-500' : p === 'Medium' ? 'bg-warning text-white border-warning' : 'bg-success text-white border-success') : 'bg-white border-border-subtle text-text-secondary hover:border-slate-400'}`}
                          >
                            <span>{p}</span>
                            <span className={`text-[9px] mt-0.5 font-mono ${priority === p ? 'opacity-80' : 'text-text-secondary'}`}>{REVISION_SLA[p]}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Deadline */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono font-bold text-text-secondary uppercase">Deadline</label>
                      <input
                        type="date"
                        value={deadline}
                        onChange={e => setDeadline(e.target.value)}
                        className="w-full px-3 py-2 border border-border-subtle rounded-lg text-xs bg-white outline-none focus:border-secondary focus:ring-1 focus:ring-secondary/20"
                      />
                    </div>

                    {/* Form Buttons */}
                    <div className="flex gap-2 justify-end pt-2">
                      <button
                        onClick={() => {
                          setRevisingDocName(null);
                          setSelectedReasons([]);
                          setCustomReason('');
                        }}
                        className="px-3 py-1.5 border border-border-subtle text-text-secondary rounded-lg text-xs font-bold hover:bg-surface-container-low transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        disabled={selectedReasons.length === 0 && !customReason.trim()}
                        onClick={() => handleSendDocRevision(doc)}
                        className="px-4 py-1.5 bg-secondary hover:bg-secondary/90 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                      >
                        Send Revision Request
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* Internal Auditor Notes */}
      <SectionCard title="Internal Auditor Notes">
        <div className="space-y-3">
          {[
            { label: 'Notes', placeholder: 'Add internal notes about this event...' },
            { label: 'Recommendation', placeholder: 'Your recommendation for this submission...' },
            { label: 'Follow Up', placeholder: 'Any follow-up actions required...' },
          ].map(f => (
            <div key={f.label} className="space-y-1">
              <label className="text-[10px] font-mono font-bold text-text-secondary uppercase">{f.label}</label>
              <textarea rows={2} placeholder={f.placeholder} className="w-full p-3 border border-border-subtle rounded-lg text-xs bg-white outline-none resize-none placeholder:text-text-secondary focus:border-secondary focus:ring-1 focus:ring-secondary/20" />
            </div>
          ))}
          <button className="flex items-center gap-1.5 px-4 py-2 bg-secondary/10 hover:bg-secondary hover:text-white text-secondary border border-secondary/20 rounded-lg text-xs font-bold transition-all cursor-pointer">
            <Save className="w-3.5 h-3.5" /> Save Notes
          </button>
        </div>
      </SectionCard>
    </div>
  );
}

// ─── TAB: VENUE ───────────────────────────────────────────────────────────────
function TabVenue({ sub }: { sub: EventSubmission }) {
  const v = sub.venueDetail;
  const done = v.checklist.filter(c => c.done).length;
  return (
    <div className="space-y-6">
      {/* Venue Summary */}
      <SectionCard title="Venue Summary">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-text-primary">{v.name}</h3>
            <p className="text-xs text-text-secondary mt-0.5">Capacity: {v.capacity.toLocaleString()}</p>
          </div>
          <ScoreBadge score={v.complianceScore} />
        </div>
        <div className="text-xs text-text-secondary bg-surface-container-low rounded-lg p-3 border border-border-subtle">
          Validation Progress: <strong className="text-text-primary">{done}/{v.checklist.length}</strong> items passed
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Venue Validation */}
        <SectionCard title="Venue Validation Checklist">
          <div className="space-y-2">
            {v.checklist.map(c => <ChecklistRow key={c.label} label={c.label} done={c.done} />)}
          </div>
        </SectionCard>

        {/* Venue Information */}
        <SectionCard title="Venue Information">
          <div className="space-y-3 text-xs">
            {[
              { icon: <MapPin className="w-3.5 h-3.5" />, label: 'Address', value: v.address },
              { icon: <Users2 className="w-3.5 h-3.5" />, label: 'Manager', value: v.manager },
              { icon: <Phone className="w-3.5 h-3.5" />, label: 'Contact', value: v.contact },
              { icon: <Globe className="w-3.5 h-3.5" />, label: 'Website', value: v.website },
            ].map(r => (
              <div key={r.label} className="flex items-start gap-2">
                <span className="text-on-surface-variant mt-0.5 shrink-0">{r.icon}</span>
                <div>
                  <span className="text-text-secondary">{r.label}: </span>
                  <span className="text-text-primary font-medium">{r.value}</span>
                </div>
              </div>
            ))}
            <a href={v.googleMaps} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 mt-2 px-3 py-2 bg-surface-container-low hover:bg-surface-container border border-border-subtle rounded-lg text-xs font-semibold text-secondary transition-colors cursor-pointer">
              <ExternalLink className="w-3.5 h-3.5" /> Open in Google Maps
            </a>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

// ─── TAB: LOGISTICS ───────────────────────────────────────────────────────────
function TabLogistics({ sub }: { sub: EventSubmission }) {
  const lg = sub.logistics;
  const vendorStatusColor = (s: string) => s === 'Verified' ? 'bg-success/10 text-success border-success/20' : s === 'Rejected' ? 'bg-danger/10 text-danger border-danger/20' : 'bg-warning/10 text-warning border-warning/20';
  return (
    <div className="space-y-6">
      {/* Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Vendors', value: lg.vendorCount, icon: <Package className="w-4 h-4" /> },
          { label: 'Security', value: lg.securityCount, icon: <Shield className="w-4 h-4" /> },
          { label: 'Medical', value: lg.medicalTeam, icon: <Activity className="w-4 h-4" /> },
          { label: 'Emergency', value: lg.emergencyTeam, icon: <Zap className="w-4 h-4" /> },
        ].map(s => (
          <div key={s.label} className="bg-white border border-border-subtle rounded-xl p-4 soft-shadow text-center">
            <div className="flex justify-center mb-1 text-text-secondary">{s.icon}</div>
            <div className="text-xl font-bold text-text-primary">{s.value}</div>
            <div className="text-[10px] text-text-secondary font-mono uppercase">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Vendor Table */}
      <SectionCard title="Vendor Verification">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-border-subtle">
                {['Vendor Name', 'Category', 'Contact', 'Status'].map(h => (
                  <th key={h} className="text-left py-2 px-3 font-mono text-[10px] text-text-secondary uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {lg.vendors.map((v, i) => (
                <tr key={i} className="hover:bg-surface-container-low transition-colors">
                  <td className="py-2.5 px-3 font-medium text-text-primary">{v.name}</td>
                  <td className="py-2.5 px-3 text-text-secondary">{v.category}</td>
                  <td className="py-2.5 px-3 text-text-secondary font-mono">{v.contact}</td>
                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${vendorStatusColor(v.status)}`}>{v.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Emergency Plan */}
      <SectionCard title="Emergency Plan Checklist">
        <div className="space-y-2">
          {lg.emergencyPlan.map(c => <ChecklistRow key={c.label} label={c.label} done={c.done} />)}
        </div>
      </SectionCard>
    </div>
  );
}

// ─── TAB: FINANCE ─────────────────────────────────────────────────────────────
function TabFinance({ sub }: { sub: EventSubmission }) {
  const f = sub.finance;
  const fmt = (n: number) => `$${n.toLocaleString()}`;
  return (
    <div className="space-y-6">
      {/* Financial Summary */}
      <SectionCard title="Financial Summary">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: 'Projected Revenue', value: fmt(f.projectedRevenue), up: true },
            { label: 'Platform Fee (5%)', value: fmt(f.platformFee), up: false },
            { label: 'Gateway Fee (2%)', value: fmt(f.gatewayFee), up: false },
            { label: 'Tax Amount', value: fmt(f.taxAmount), up: false },
            { label: 'Net Organizer Payout', value: fmt(f.netPayout), up: true },
          ].map(s => (
            <div key={s.label} className="bg-white border border-border-subtle rounded-xl p-4 soft-shadow">
              <div className={`flex items-center gap-1 text-xs mb-1 ${s.up ? 'text-success' : 'text-danger'}`}>
                {s.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                <span className="font-mono uppercase text-[9px]">{s.label}</span>
              </div>
              <p className="text-base font-bold text-text-primary">{s.value}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Revenue bar chart (visual) */}
      <SectionCard title="Revenue Distribution">
        <div className="space-y-2.5">
          {[
            { label: 'Gross Revenue', value: f.projectedRevenue, color: 'bg-primary' },
            { label: 'Platform Fee', value: f.platformFee, color: 'bg-secondary' },
            { label: 'Gateway Fee', value: f.gatewayFee, color: 'bg-warning' },
            { label: 'Tax', value: f.taxAmount, color: 'bg-danger' },
            { label: 'Net Payout', value: f.netPayout, color: 'bg-success' },
          ].map(b => (
            <div key={b.label} className="flex items-center gap-3">
              <span className="text-[10px] font-mono text-text-secondary w-28 shrink-0">{b.label}</span>
              <div className="flex-1 bg-surface-container rounded-full h-2.5">
                <div className={`${b.color} h-2.5 rounded-full transition-all`} style={{ width: `${Math.max(2, (b.value / f.projectedRevenue) * 100)}%` }} />
              </div>
              <span className="text-xs font-bold text-text-primary w-24 text-right">${b.value.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ticket Pricing */}
        <SectionCard title="Ticket Pricing">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-border-subtle">
                {['Category', 'Price', 'Seats', 'Status'].map(h => (
                  <th key={h} className="text-left py-2 font-mono text-[10px] text-text-secondary uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {f.ticketTiers.map((t, i) => (
                <tr key={i}>
                  <td className="py-2.5 font-bold text-text-primary">{t.category}</td>
                  <td className="py-2.5 text-text-primary">${t.price.toLocaleString()}</td>
                  <td className="py-2.5 text-text-secondary">{t.seats.toLocaleString()}</td>
                  <td className="py-2.5">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${t.status === 'Sold Out' ? 'bg-success/10 text-success border-success/20' : t.status === 'Pending' ? 'bg-warning/10 text-warning border-warning/20' : 'bg-secondary/10 text-secondary border-secondary/20'}`}>{t.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>

        {/* Tax Configuration */}
        <SectionCard title="Tax Configuration">
          <div className="space-y-2 text-xs mb-4">
            {[
              { label: 'Entertainment Tax', value: `${f.taxConfig.entertainmentTax}%` },
              { label: 'PPN', value: `${f.taxConfig.ppn}%` },
              { label: 'Region', value: f.taxConfig.region },
              { label: 'Total Tax %', value: `${f.taxConfig.taxPercentage}%` },
            ].map(r => (
              <div key={r.label} className="flex justify-between border-b border-border-subtle pb-1.5">
                <span className="text-text-secondary">{r.label}</span>
                <span className="font-bold text-text-primary">{r.value}</span>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            {[
              { label: 'Region Match', done: f.taxConfig.regionMatch },
              { label: 'Tax Applied', done: f.taxConfig.taxApplied },
              { label: 'PPN Applied', done: f.taxConfig.ppnApplied },
            ].map(c => <ChecklistRow key={c.label} label={c.label} done={c.done} />)}
          </div>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Organizer Payout */}
        <SectionCard title="Organizer Payout">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-text-secondary">Account Verification</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${f.payout.verified ? 'bg-success/10 text-success border-success/20' : 'bg-danger/10 text-danger border-danger/20'}`}>{f.payout.verified ? 'VERIFIED' : 'UNVERIFIED'}</span>
          </div>
          <div className="space-y-2 text-xs">
            {[
              { label: 'Bank', value: f.payout.bank },
              { label: 'Account Name', value: f.payout.accountName },
              { label: 'Account Number', value: f.payout.accountNumber },
              { label: 'Estimated Payout', value: fmt(f.payout.estimatedPayout) },
            ].map(r => (
              <div key={r.label} className="flex justify-between border-b border-border-subtle pb-1.5">
                <span className="text-text-secondary">{r.label}</span>
                <span className="font-bold text-text-primary">{r.value}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Compliance Score */}
        <SectionCard title="Finance Compliance">
          <div className="space-y-2">
            {f.complianceChecklist.map(c => <ChecklistRow key={c.label} label={c.label} done={c.done} />)}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

// ─── TAB: HISTORY ─────────────────────────────────────────────────────────────
function TabHistory({ sub }: { sub: EventSubmission }) {
  const h = sub.history;
  const [showVersions, setShowVersions] = useState(false);
  const approvalStages = ['Draft', 'Submitted', 'Verified', 'Final Approval'];
  const stageIdx = TIMELINE_STAGES.indexOf(sub.stage);
  return (
    <div className="space-y-6">
      {/* Approval Progress */}
      <SectionCard title="Approval Progress">
        <div className="flex flex-col gap-0">
          {approvalStages.map((s, i) => {
            const done = sub.status === 'Approved' ? true : i <= stageIdx;
            return (
              <div key={s} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0 ${done ? 'bg-secondary border-secondary text-white' : 'bg-white border-border-subtle text-text-secondary'}`}>
                    {done ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                  </div>
                  {i < approvalStages.length - 1 && <div className={`w-0.5 h-8 mt-1 ${done ? 'bg-secondary' : 'bg-border-subtle'}`} />}
                </div>
                <div className="pt-1.5 pb-6">
                  <p className={`text-xs font-bold ${done ? 'text-text-primary' : 'text-text-secondary'}`}>{s}</p>
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* Activity Timeline */}
      <SectionCard title="Activity Timeline">
        <div className="space-y-4">
          {h.activityTimeline.map((a, i) => (
            <div key={a.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="w-7 h-7 rounded-full bg-surface-container-low border border-border-subtle flex items-center justify-center shrink-0">
                  <Activity className="w-3 h-3 text-text-secondary" />
                </div>
                {i < h.activityTimeline.length - 1 && <div className="w-0.5 flex-1 bg-border-subtle mt-1" />}
              </div>
              <div className="pb-4 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-text-primary">{a.user}</span>
                  <span className="text-[9px] font-mono text-text-secondary px-1.5 py-0.5 bg-surface-container-low rounded border border-border-subtle">{a.role}</span>
                  <span className="text-xs font-semibold text-secondary">{a.action}</span>
                </div>
                <p className="text-xs text-text-secondary mt-0.5">{a.detail}</p>
                <p className="text-[9px] text-text-secondary font-mono mt-1">{a.timestamp}</p>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Version History */}
      <SectionCard title="Version History">
        <button onClick={() => setShowVersions(!showVersions)} className="flex items-center gap-2 text-xs font-semibold text-secondary hover:underline cursor-pointer mb-3">
          <GitBranch className="w-3.5 h-3.5" />
          {showVersions ? 'Hide' : 'Show'} {h.versions.length} versions
        </button>
        {showVersions && (
          <div className="space-y-2.5">
            {[...h.versions].reverse().map(v => (
              <div key={v.version} className="flex items-start justify-between gap-3 p-3 bg-surface-container-low border border-border-subtle rounded-lg hover:border-slate-400 cursor-pointer transition-colors">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-secondary/10 border border-secondary/20 flex items-center justify-center text-[10px] font-bold text-secondary shrink-0">v{v.version}</div>
                  <div>
                    <p className="text-xs font-medium text-text-primary">{v.summary}</p>
                    <p className="text-[10px] text-text-secondary font-mono mt-0.5">by {v.changedBy} · {v.timestamp}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-text-secondary shrink-0 mt-0.5" />
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

// ─── TAB: REVISION ────────────────────────────────────────────────────────────
import {
  REVISION_SLA, DOCUMENT_SECTIONS, VENUE_SECTIONS, ORGANIZER_SECTIONS,
  FINANCE_SECTIONS, LOGISTICS_SECTIONS, DOCUMENT_REJECTION_REASONS,
  RevisionCategory, RevisionPriority, RevisionStatus
} from '../types';

type SectionOptions = readonly string[];

const CATEGORY_SECTIONS: Record<RevisionCategory, SectionOptions> = {
  Documents: DOCUMENT_SECTIONS,
  Venue: VENUE_SECTIONS,
  Organizer: ORGANIZER_SECTIONS,
  Finance: FINANCE_SECTIONS,
  Logistics: LOGISTICS_SECTIONS,
  Other: ['Custom Revision'],
};

const PRIORITY_COLORS: Record<RevisionPriority, string> = {
  Low: 'bg-success/10 text-success border-success/20',
  Medium: 'bg-warning/10 text-warning border-warning/20',
  High: 'bg-orange-100 text-orange-600 border-orange-200',
  Critical: 'bg-danger/10 text-danger border-danger/20',
};

const STATUS_COLORS: Record<RevisionStatus, string> = {
  Draft: 'bg-slate-100 text-slate-500 border-slate-200',
  Sent: 'bg-secondary/10 text-secondary border-secondary/20',
  Viewed: 'bg-sky-100 text-sky-600 border-sky-200',
  'In Progress': 'bg-warning/10 text-warning border-warning/20',
  Resubmitted: 'bg-purple-100 text-purple-600 border-purple-200',
  Verified: 'bg-teal-100 text-teal-600 border-teal-200',
  Resolved: 'bg-success/10 text-success border-success/20',
  Rejected: 'bg-danger/10 text-danger border-danger/20',
  Expired: 'bg-slate-200 text-slate-500 border-slate-300',
};

function TabRevision({
  sub,
  onAddRevision,
  onRefresh,
}: {
  sub: EventSubmission;
  onAddRevision?: (submissionId: string, revision: RevisionEntry) => void;
  onRefresh?: () => void;
}) {
  const revisions = sub.revisions;
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Dashboard stats
  const stats = {
    total: revisions.length,
    open: revisions.filter(r => ['Sent', 'Viewed', 'In Progress', 'Draft'].includes(r.status)).length,
    inProgress: revisions.filter(r => r.status === 'In Progress').length,
    resolved: revisions.filter(r => r.status === 'Resolved').length,
    rejected: revisions.filter(r => r.status === 'Rejected').length,
    critical: revisions.filter(r => r.priority === 'Critical').length,
  };

  // Add revision form state
  const [category, setCategory] = useState<RevisionCategory>('Documents');
  const [affectedSection, setAffectedSection] = useState('');
  const [priority, setPriority] = useState<RevisionPriority>('High');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [requiredAction, setRequiredAction] = useState('');
  const [deadline, setDeadline] = useState('');
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [customReason, setCustomReason] = useState('');
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [expandedRevision, setExpandedRevision] = useState<string | null>(null);

  const [revToast, setRevToast] = useState<{ message: string; type: 'success' | 'warning' | 'error' } | null>(null);

  const handleVerifyRevisionItem = async (revId: number | string, newStatus: 'Resolved' | 'Sent' | 'Rejected') => {
    const numericId = typeof revId === 'number' ? revId : parseInt(String(revId).replace(/\D/g, '')) || 0;
    try {
      const res = await updateRevisionStatus(numericId, newStatus);
      if (res.success) {
        const msg =
          newStatus === 'Resolved'
            ? '✅ Revisi berhasil disetujui (Accepted)!'
            : newStatus === 'Sent'
            ? '⚠️ Perubahan tambahan diminta! Poin revisi dikembalikan ke EO.'
            : '❌ Revisi telah ditolak!';
        setRevToast({ message: msg, type: newStatus === 'Resolved' ? 'success' : newStatus === 'Sent' ? 'warning' : 'error' });
        setTimeout(() => setRevToast(null), 4000);
        if (onRefresh) {
          await onRefresh();
        }
      } else {
        setRevToast({ message: 'Gagal memperbarui status revisi: ' + (res.error?.message || 'Terjadi kesalahan'), type: 'error' });
        setTimeout(() => setRevToast(null), 4000);
      }
    } catch (err) {
      console.error("Failed to update revision status:", err);
      setRevToast({ message: 'Error memperbarui status revisi ke server.', type: 'error' });
      setTimeout(() => setRevToast(null), 4000);
    }
  };

  const sectionOptions = CATEGORY_SECTIONS[category];

  const toggleReason = (r: string) => {
    setSelectedReasons(prev => {
      const next = prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r];
      if (next.length > 0) {
        const text = next.join(", ");
        if (!title || title.startsWith("Revisi Dokumen:")) {
          setTitle(`Revisi Dokumen: ${text}`);
        }
        if (!description || description.startsWith("Alasan penolakan dokumen:")) {
          setDescription(`Alasan penolakan dokumen: ${text}. ${customReason ? `Catatan: ${customReason}` : ''}`);
        }
        if (!requiredAction || requiredAction.startsWith("Harap mengunggah kembali")) {
          setRequiredAction("Harap mengunggah kembali dokumen pendukung yang valid dan sesuai dengan persyaratan audit.");
        }
        if (!affectedSection) {
          setAffectedSection(sectionOptions[0] || "Dokumen Legal");
        }
        if (!deadline) {
          const defaultDeadline = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];
          setDeadline(defaultDeadline);
        }
      }
      return next;
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAttachmentFile(e.target.files[0]);
    }
  };

  const handleSaveRevision = (status: 'Draft' | 'Sent') => {
    const finalTitle = title.trim() || (selectedReasons.length > 0 ? `Revisi Dokumen: ${selectedReasons.join(', ')}` : 'Permintaan Revisi Auditor');
    const finalSection = affectedSection || sectionOptions[0] || 'General';
    const finalDescription = description.trim() || (selectedReasons.length > 0 ? `Dokumen bermasalah: ${selectedReasons.join(', ')}` : 'Perlu penyesuaian data event');
    const finalAction = requiredAction.trim() || 'Silakan unggah ulang atau perbaiki dokumen/data yang diperlukan.';
    const finalDeadline = deadline || new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];

    const newRevision: RevisionEntry = {
      id: `REV-${Math.floor(1000 + Math.random() * 9000)}`,
      category,
      affectedSection: finalSection,
      priority,
      status,
      requestedBy: 'Auditor Portal',
      requestDate: new Date().toISOString().split('T')[0],
      deadline: finalDeadline,
      title: finalTitle,
      description: finalDescription,
      requiredAction: finalAction,
      severity: priority === 'Critical' || priority === 'High' ? 'Critical' : 'Medium',
      area: category === 'Documents' ? 'Document' : (category as any),
      revisionTimeline: [
        {
          id: `rt-${Math.random()}`,
          actor: 'Auditor Portal',
          role: 'Auditor',
          action: status === 'Draft' ? 'Draft Saved' : 'Revision Sent to Organizer',
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
        }
      ]
    };

    if (onAddRevision) {
      onAddRevision(sub.id, newRevision);
    }

    // Reset Form
    setTitle('');
    setDescription('');
    setRequiredAction('');
    setSelectedReasons([]);
    setCustomReason('');
    setAttachmentFile(null);
  };

  return (
    <div className="space-y-6">
      {revToast && (
        <div className={`p-3.5 rounded-xl border text-xs font-bold flex items-center justify-between transition-all ${
          revToast.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
          revToast.type === 'warning' ? 'bg-amber-50 text-amber-800 border-amber-200' :
          'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          <span>{revToast.message}</span>
          <button onClick={() => setRevToast(null)} className="text-slate-400 hover:text-slate-600 font-normal text-xs ml-2 cursor-pointer">✕</button>
        </div>
      )}

      {/* ── Revision Dashboard ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'text-text-primary' },
          { label: 'Open', value: stats.open, color: 'text-secondary' },
          { label: 'In Progress', value: stats.inProgress, color: 'text-warning' },
          { label: 'Resolved', value: stats.resolved, color: 'text-success' },
          { label: 'Rejected', value: stats.rejected, color: 'text-danger' },
          { label: 'Critical', value: stats.critical, color: 'text-danger' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-border-subtle rounded-xl p-3 soft-shadow text-center">
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[9px] font-mono text-text-secondary uppercase mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Existing Revision Items ── */}
      <SectionCard title={`Revision Items (${revisions.length})`}>
        {revisions.length === 0 ? (
          <div className="text-center py-8 text-xs text-text-secondary">
            <RefreshCw className="w-8 h-8 mx-auto mb-2 text-border-subtle" />
            No revision items yet for this event.
          </div>
        ) : (
          <div className="space-y-3">
            {revisions.map(r => (
              <div key={r.id} className="border border-border-subtle rounded-xl overflow-hidden">
                {/* Revision Item Header */}
                <button
                  onClick={() => setExpandedRevision(expandedRevision === r.id ? null : r.id)}
                  className="w-full flex items-start justify-between gap-3 p-4 hover:bg-surface-container-low transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${PRIORITY_COLORS[r.priority]}`}>{r.priority}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${STATUS_COLORS[r.status]}`}>{r.status}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="text-xs font-bold text-text-primary">{r.title}</span>
                        <span className="text-[9px] font-mono text-text-secondary px-1.5 py-0.5 bg-surface-container-low rounded border border-border-subtle">{r.category}</span>
                        <span className="text-[9px] font-mono text-text-secondary">· {r.affectedSection}</span>
                      </div>
                      <p className="text-[10px] text-text-secondary font-mono">
                        {r.id} · By {r.requestedBy} · {r.requestDate}
                        <span className="text-danger ml-2">SLA: {REVISION_SLA[r.priority]} · Deadline: {r.deadline}</span>
                      </p>
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-text-secondary shrink-0 transition-transform mt-0.5 ${expandedRevision === r.id ? 'rotate-90' : ''}`} />
                </button>

                {/* Expanded Detail */}
                {expandedRevision === r.id && (
                  <div className="border-t border-border-subtle bg-surface-container-low/40 p-4 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-[9px] font-mono font-bold text-text-secondary uppercase">Issue Description</p>
                        <p className="text-xs text-text-primary leading-relaxed">{r.description}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-mono font-bold text-text-secondary uppercase">Required Action</p>
                        <p className="text-xs text-text-primary leading-relaxed">{r.requiredAction}</p>
                      </div>
                    </div>

                    {/* Organizer Response */}
                    {r.organizerResponse && (
                      <div className="bg-secondary/5 border border-secondary/15 rounded-lg p-3 space-y-2">
                        <p className="text-[9px] font-mono font-bold text-secondary uppercase">Organizer Response</p>
                        <p className="text-xs text-text-primary">{r.organizerResponse.comment}</p>
                        {r.organizerResponse.uploadedFiles.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {r.organizerResponse.uploadedFiles.map(f => (
                              <span key={f} className="flex items-center gap-1 text-[10px] text-secondary bg-secondary/10 px-2 py-0.5 rounded border border-secondary/20">
                                <FileText className="w-3 h-3" />{f}
                              </span>
                            ))}
                          </div>
                        )}
                        <p className="text-[9px] font-mono text-text-secondary">Responded: {r.organizerResponse.respondedAt}</p>
                      </div>
                    )}

                    {/* Revision Timeline */}
                    <div>
                      <p className="text-[9px] font-mono font-bold text-text-secondary uppercase mb-2">Revision Timeline</p>
                      <div className="space-y-2">
                        {r.revisionTimeline.map((t, i) => (
                          <div key={t.id} className="flex gap-2.5 items-start">
                            <div className="flex flex-col items-center">
                              <div className="w-5 h-5 rounded-full bg-white border-2 border-border-subtle flex items-center justify-center shrink-0">
                                <div className="w-1.5 h-1.5 rounded-full bg-secondary" />
                              </div>
                              {i < r.revisionTimeline.length - 1 && <div className="w-px h-4 bg-border-subtle" />}
                            </div>
                            <div className="pb-1">
                              <p className="text-[10px] font-semibold text-text-primary">{t.action}</p>
                              <p className="text-[9px] text-text-secondary font-mono">{t.actor} · {t.role} · {t.timestamp}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Auditor Verification Actions */}
                    {['Resubmitted', 'Viewed', 'In Progress', 'Sent', 'Draft'].includes(r.status) && (
                      <div className="flex gap-2 flex-wrap pt-3 border-t border-border-subtle">
                        <p className="w-full text-[9px] font-mono font-bold text-text-secondary uppercase">Auditor Verification Actions</p>
                        <button
                          onClick={() => handleVerifyRevisionItem(r.id, 'Resolved')}
                          className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Accept Revision
                        </button>
                        <button
                          onClick={() => handleVerifyRevisionItem(r.id, 'Sent')}
                          className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
                        >
                          <RefreshCw className="w-3.5 h-3.5" /> Request Additional Changes
                        </button>
                        <button
                          onClick={() => handleVerifyRevisionItem(r.id, 'Rejected')}
                          className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
                        >
                          <Ban className="w-3.5 h-3.5" /> Reject Revision
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* ── Add Revision Item Form ── */}
      <SectionCard title="Add Revision Item">
        <div className="space-y-5">

          {/* Category */}
          <div className="space-y-2">
            <label className="text-[10px] font-mono font-bold text-text-secondary uppercase">Category</label>
            <div className="flex flex-wrap gap-1.5">
              {(['Documents', 'Venue', 'Organizer', 'Finance', 'Logistics', 'Other'] as RevisionCategory[]).map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => { setCategory(c); setAffectedSection(''); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${category === c ? 'bg-primary text-white border-primary' : 'bg-white border-border-subtle text-text-secondary hover:border-primary/50'}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Affected Section */}
          <div className="space-y-2">
            <label className="text-[10px] font-mono font-bold text-text-secondary uppercase">Affected Section</label>
            <div className="flex flex-wrap gap-1.5">
              {sectionOptions.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setAffectedSection(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${affectedSection === s ? 'bg-secondary text-white border-secondary' : 'bg-white border-border-subtle text-text-secondary hover:border-secondary/50'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Priority with SLA */}
          <div className="space-y-2">
            <label className="text-[10px] font-mono font-bold text-text-secondary uppercase">Priority & SLA</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['Low', 'Medium', 'High', 'Critical'] as RevisionPriority[]).map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`flex flex-col items-center py-2.5 px-3 rounded-lg border text-xs font-bold transition-all cursor-pointer ${priority === p ? (p === 'Critical' ? 'bg-danger text-white border-danger' : p === 'High' ? 'bg-orange-500 text-white border-orange-500' : p === 'Medium' ? 'bg-warning text-white border-warning' : 'bg-success text-white border-success') : 'bg-white border-border-subtle text-text-secondary hover:border-slate-400'}`}
                >
                  <span>{p}</span>
                  <span className={`text-[9px] mt-0.5 font-mono ${priority === p ? 'opacity-80' : 'text-text-secondary'}`}>{REVISION_SLA[p]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono font-bold text-text-secondary uppercase">Title</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Brief revision title..."
              className="w-full px-3 py-2.5 border border-border-subtle rounded-lg text-xs bg-white outline-none placeholder:text-text-secondary focus:border-secondary focus:ring-1 focus:ring-secondary/20"
            />
          </div>

          {/* Issue Description */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono font-bold text-text-secondary uppercase">Issue Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="Describe the issue found in detail..."
              className="w-full p-3 border border-border-subtle rounded-lg text-xs bg-white outline-none resize-none placeholder:text-text-secondary focus:border-secondary focus:ring-1 focus:ring-secondary/20"
            />
          </div>

          {/* Required Action */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono font-bold text-text-secondary uppercase">Required Action</label>
            <textarea
              value={requiredAction}
              onChange={e => setRequiredAction(e.target.value)}
              rows={2}
              placeholder="What steps must the organizer take to resolve this..."
              className="w-full p-3 border border-border-subtle rounded-lg text-xs bg-white outline-none resize-none placeholder:text-text-secondary focus:border-secondary focus:ring-1 focus:ring-secondary/20"
            />
          </div>

          {/* Document Rejection Reasons — only for Documents category */}
          {category === 'Documents' && (
            <div className="space-y-2">
              <label className="text-[10px] font-mono font-bold text-text-secondary uppercase">Document Rejection Reasons</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {DOCUMENT_REJECTION_REASONS.map(reason => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => toggleReason(reason)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-xs text-left transition-colors cursor-pointer ${selectedReasons.includes(reason) ? 'bg-secondary/10 border-secondary/30 text-secondary font-semibold' : 'bg-white border-border-subtle text-text-secondary hover:border-slate-400'}`}
                  >
                    <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${selectedReasons.includes(reason) ? 'bg-secondary border-secondary' : 'border-slate-300'}`}>
                      {selectedReasons.includes(reason) && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
                    </div>
                    {reason}
                  </button>
                ))}
              </div>
              {selectedReasons.includes('Lainnya') && (
                <input
                  value={customReason}
                  onChange={e => setCustomReason(e.target.value)}
                  placeholder="Tuliskan alasan lainnya..."
                  className="w-full mt-2 px-3 py-2.5 border border-border-subtle rounded-lg text-xs bg-white outline-none placeholder:text-text-secondary focus:border-secondary focus:ring-1 focus:ring-secondary/20"
                />
              )}
            </div>
          )}

          {/* Deadline */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono font-bold text-text-secondary uppercase">
              Deadline <span className="text-text-secondary normal-case font-normal">(SLA for {priority}: {REVISION_SLA[priority]})</span>
            </label>
            <input
              type="date"
              value={deadline}
              onChange={e => setDeadline(e.target.value)}
              className="w-full px-3 py-2.5 border border-border-subtle rounded-lg text-xs bg-white outline-none focus:border-secondary focus:ring-1 focus:ring-secondary/20"
            />
          </div>

          {/* Attachment (Interactive Upload) */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono font-bold text-text-secondary uppercase">Attachment (Optional)</label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*,.pdf"
              className="hidden"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border-subtle rounded-lg p-4 text-center hover:border-secondary/50 transition-colors cursor-pointer bg-white"
            >
              {attachmentFile ? (
                <div className="flex items-center justify-between p-2 bg-surface-container rounded-lg border border-border-subtle text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="w-4 h-4 text-secondary shrink-0" />
                    <span className="font-bold text-text-primary truncate">{attachmentFile.name}</span>
                    <span className="text-[10px] text-text-secondary font-mono">({Math.round(attachmentFile.size / 1024)} KB)</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAttachmentFile(null);
                    }}
                    className="p-1 hover:bg-surface-container-high rounded text-text-secondary hover:text-danger cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <>
                  <FileText className="w-5 h-5 text-text-secondary mx-auto mb-1" />
                  <p className="text-xs text-text-secondary">Click to upload screenshot or supporting evidence</p>
                  <p className="text-[9px] text-text-secondary font-mono mt-0.5">PNG, JPG, PDF up to 10MB</p>
                </>
              )}
            </div>
          </div>

          {/* Notification info */}
          <div className="flex items-start gap-2 text-[10px] p-3 bg-warning/5 border border-warning/15 rounded-lg text-warning">
            <MessageSquare className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>Organizer will receive an automatic notification when this revision is sent. Deadline reminders will be sent automatically based on SLA.</span>
          </div>

          {/* Actions */}
          <div className="flex gap-2 flex-wrap pt-1">
            <button
              type="button"
              onClick={() => handleSaveRevision('Draft')}
              className="flex items-center gap-1.5 px-4 py-2.5 border border-border-subtle text-text-secondary rounded-lg text-xs font-bold hover:bg-surface-container-low transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" /> Save Draft
            </button>
            <button
              type="button"
              onClick={() => handleSaveRevision('Sent')}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-secondary hover:bg-secondary/90 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-sm"
            >
              <Send className="w-3.5 h-3.5" /> Send Revision
            </button>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}


// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function ReviewDetailView({
  submission,
  onBack,
  onApprove,
  onReject,
  onRequestChanges,
  onVerifyDocument,
  onRejectDocument,
  onViewDocument,
  onOpenDocumentFile,
  onChangeStage,
  onAddRevision,
  onRefresh,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [mode, setMode] = useState<'view' | 'reject' | 'changes'>('view');
  const [reason, setReason] = useState('');
  const isResolved = submission.status !== 'Pending';

  return (
    <div className="flex flex-col min-h-full text-left animate-fade-in font-sans pb-32">
      {/* ── Breadcrumb + Title ── */}
      <div className="flex items-center justify-between pb-4 border-b border-border-subtle mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onBack} className="p-2 border border-border-subtle bg-white hover:bg-surface-container-low text-text-secondary hover:text-text-primary rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold shadow-xs shrink-0">
            <ArrowLeft className="w-4 h-4" /> Back to Reviews
          </button>
          <div className="min-w-0">
            <div className="text-[10px] text-text-secondary font-mono uppercase tracking-wider flex items-center gap-1 flex-wrap">
              <span>Auditor Console</span><span>/</span><span>Event Reviews</span><span>/</span>
              <span className="text-text-primary font-bold truncate max-w-[120px] sm:max-w-xs">{submission.eventName}</span>
            </div>
            <h2 className="text-lg font-bold text-text-primary truncate mt-0.5">{submission.eventName}</h2>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${riskColors[submission.riskLevel]}`}>{submission.riskLevel} Risk</span>
          <span className="font-mono text-[10px] font-bold text-text-secondary bg-surface border border-border-subtle px-2.5 py-1 rounded-lg">{submission.id}</span>
        </div>
      </div>

      {/* ── Tab Bar ── */}
      <div className="flex gap-1 overflow-x-auto pb-1 mb-6 border-b border-border-subtle">
        {TABS.map(t => {
          const isRevision = t.key === 'revision' && submission.revisions.length > 0;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-t-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer border-b-2 relative ${activeTab === t.key ? 'text-primary border-primary bg-white' : 'text-text-secondary border-transparent hover:text-text-primary hover:bg-surface-container-low'}`}
            >
              {t.icon}{t.label}
              {isRevision && <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[9px] font-bold text-white">{submission.revisions.length}</span>}
            </button>
          );
        })}
      </div>

      {/* ── Tab Content ── */}
      <div className="flex-1">
        {activeTab === 'overview' && <TabOverview sub={submission} onChangeStage={(stage) => onChangeStage(submission.id, stage)} />}
        {activeTab === 'documents' && (
          <TabDocuments
            sub={submission}
            onVerify={(name) => onVerifyDocument(submission.id, name)}
            onReject={(name) => onRejectDocument(submission.id, name)}
            onView={onViewDocument}
            onOpenFile={onOpenDocumentFile}
            onAddRevision={onAddRevision}
          />
        )}
        {activeTab === 'venue' && <TabVenue sub={submission} />}
        {activeTab === 'logistics' && <TabLogistics sub={submission} />}
        {activeTab === 'finance' && <TabFinance sub={submission} />}
        {activeTab === 'history' && <TabHistory sub={submission} />}
        {activeTab === 'revision' && <TabRevision sub={submission} onAddRevision={onAddRevision} onRefresh={onRefresh} />}
      </div>

      {/* ── Sticky Action Panel (always visible at bottom) ── */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-white/95 border-t border-border-subtle backdrop-blur-md px-4 py-3 sm:px-6">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-3 flex-wrap">
          {mode !== 'view' ? (
            <>
              <div className="flex-1 min-w-[200px]">
                <textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  rows={1}
                  placeholder={mode === 'reject' ? 'Reason for rejection...' : 'Describe changes needed...'}
                  className="w-full px-3 py-2 border border-border-subtle rounded-lg text-xs bg-white outline-none resize-none placeholder:text-text-secondary focus:border-secondary focus:ring-1 focus:ring-secondary/20"
                />
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => { setMode('view'); setReason(''); }} className="flex items-center gap-1.5 px-4 py-2.5 border border-border-subtle text-text-secondary rounded-lg text-xs font-bold hover:bg-surface-container-low transition-colors cursor-pointer">
                  <X className="w-3.5 h-3.5" /> Cancel
                </button>
                <button
                  onClick={() => {
                    if (!reason.trim()) return;
                    mode === 'reject' ? onReject(submission.id, reason) : onRequestChanges(submission.id, reason);
                    setMode('view');
                    setReason('');
                  }}
                  disabled={!reason.trim()}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-bold text-white transition-colors cursor-pointer disabled:opacity-50 ${mode === 'reject' ? 'bg-danger hover:bg-danger/90' : 'bg-warning hover:bg-warning/90'}`}
                >
                  {mode === 'reject' ? <Ban className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                  {mode === 'reject' ? 'Confirm Rejection' : 'Send Revision Request'}
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 w-full justify-end flex-wrap">
              <span className="text-[10px] font-mono text-text-secondary mr-auto hidden sm:block">
                Auditor Action Panel · {submission.eventName}
              </span>
              <button onClick={onBack} className="flex items-center gap-1.5 px-3 py-2.5 border border-border-subtle text-text-secondary rounded-lg text-xs font-bold hover:bg-surface-container-low transition-colors cursor-pointer">
                <X className="w-3.5 h-3.5" /> Close
              </button>
              <button className="flex items-center gap-1.5 px-3 py-2.5 border border-border-subtle text-text-secondary rounded-lg text-xs font-bold hover:bg-surface-container-low transition-colors cursor-pointer">
                <Save className="w-3.5 h-3.5" /> Save Draft
              </button>
              {!isResolved && (
                <>
                  <button onClick={() => setMode('changes')} className="flex items-center gap-1.5 px-4 py-2.5 bg-warning/10 hover:bg-warning text-warning hover:text-white border border-warning/30 rounded-lg text-xs font-bold transition-colors cursor-pointer">
                    <RefreshCw className="w-3.5 h-3.5" /> Request Revision
                  </button>
                  <button onClick={() => setMode('reject')} className="flex items-center gap-1.5 px-4 py-2.5 bg-danger/10 hover:bg-danger text-danger hover:text-white border border-danger/30 rounded-lg text-xs font-bold transition-colors cursor-pointer">
                    <Ban className="w-3.5 h-3.5" /> Reject Event
                  </button>
                  <button onClick={() => { onApprove(submission.id); }} className="flex items-center gap-1.5 px-5 py-2.5 bg-success hover:bg-success/90 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-sm shadow-success/20">
                    <Send className="w-3.5 h-3.5" /> Approve Event
                  </button>
                </>
              )}
              {isResolved && (
                <span className="px-4 py-2.5 bg-surface-container-low border border-border-subtle rounded-lg text-xs text-text-secondary font-medium">
                  Event audited & resolved · Status: {submission.status}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
