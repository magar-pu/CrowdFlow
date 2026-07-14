"use client";

import React, { useState } from 'react';
import { EventSubmission, ReviewStage, RiskLevel } from '../types';
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
  onChangeStage: (submissionId: string, stage: ReviewStage) => void;
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
function TabOverview({ sub }: { sub: EventSubmission }) {
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
                <button key={stage} className="flex flex-col items-center gap-1.5 flex-1 text-center group cursor-pointer bg-transparent border-0 outline-none">
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
function TabDocuments({ sub, onVerify, onReject, onView }: {
  sub: EventSubmission;
  onVerify: (name: string) => void;
  onReject: (name: string) => void;
  onView: (doc: { name: string; category: string; status: string }) => void;
}) {
  const [notes, setNotes] = useState('');
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
                <p className="text-[10px] text-text-secondary font-mono uppercase">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </SectionCard>

      {/* Document Repository */}
      <SectionCard title="Document Repository">
        <div className="space-y-2.5">
          {sub.documents.map((doc, i) => (
            <div key={i} className={`flex items-center justify-between gap-3 p-3.5 rounded-lg border transition-colors ${doc.status === 'MISSING' ? 'bg-slate-50 border-dashed border-slate-200 opacity-60' : 'bg-white border-border-subtle hover:border-slate-400 cursor-pointer'}`}>
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-1.5 bg-surface-container-low border border-border-subtle rounded">
                  <FileText className="w-4 h-4 text-on-surface-variant" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-text-primary truncate">{doc.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[9px] font-mono text-text-secondary">{doc.category}</span>
                    {doc.uploadDate && <span className="text-[9px] text-text-secondary">· Uploaded {doc.uploadDate}</span>}
                    {doc.expiredDate && <span className="text-[9px] text-orange-500 font-medium">· Exp. {doc.expiredDate}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {doc.status !== 'MISSING' && (
                  <>
                    <button onClick={() => onView({ name: doc.name, category: doc.category, status: doc.status })} className="p-1.5 text-text-secondary hover:text-primary hover:bg-surface-container-low rounded transition-colors cursor-pointer" title="Preview"><Eye className="w-3.5 h-3.5" /></button>
                    <button className="p-1.5 text-text-secondary hover:text-primary hover:bg-surface-container-low rounded transition-colors cursor-pointer" title="Download"><Download className="w-3.5 h-3.5" /></button>
                  </>
                )}
                {doc.status !== 'VERIFIED' && doc.status !== 'REJECTED' && doc.status !== 'MISSING' ? (
                  <div className="flex gap-1.5">
                    <button onClick={() => onVerify(doc.name)} className="bg-success/10 hover:bg-success hover:text-white border border-success/20 text-success text-[10px] font-bold px-2.5 py-1 rounded transition-all cursor-pointer">Verify</button>
                    <button onClick={() => onReject(doc.name)} className="bg-danger/10 hover:bg-danger hover:text-white border border-danger/20 text-danger text-[10px] font-bold px-2.5 py-1 rounded transition-all cursor-pointer">Reject</button>
                  </div>
                ) : (
                  <span className={`px-2.5 py-0.5 rounded-full font-mono text-[9px] font-bold border ${statusColor(doc.status)}`}>{doc.status}</span>
                )}
              </div>
            </div>
          ))}
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
function TabRevision({ sub }: { sub: EventSubmission }) {
  const [area, setArea] = useState<'Document' | 'Venue' | 'Finance' | 'Organizer' | 'Logistics'>('Document');
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [severity, setSeverity] = useState<'Minor' | 'Medium' | 'Critical'>('Minor');
  const severityColor = (s: string) => s === 'Critical' ? 'bg-danger/10 text-danger border-danger/20' : s === 'Medium' ? 'bg-warning/10 text-warning border-warning/20' : 'bg-success/10 text-success border-success/20';
  const statusColor2 = (s: string) => s === 'Resolved' ? 'bg-success/10 text-success border-success/20' : s === 'In Progress' ? 'bg-secondary/10 text-secondary border-secondary/20' : 'bg-warning/10 text-warning border-warning/20';
  return (
    <div className="space-y-6">
      {/* Existing Revisions */}
      <SectionCard title={`Revision History (${sub.revisions.length})`}>
        {sub.revisions.length === 0 ? (
          <div className="text-center py-6 text-xs text-text-secondary">No revisions requested for this event.</div>
        ) : (
          <div className="space-y-3">
            {sub.revisions.map(r => (
              <div key={r.id} className="p-4 bg-white border border-border-subtle rounded-lg space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${severityColor(r.severity)}`}>{r.severity}</span>
                    <span className="text-xs font-bold text-text-primary">{r.title}</span>
                    <span className="text-[9px] text-text-secondary font-mono px-1.5 py-0.5 bg-surface-container-low rounded border border-border-subtle">{r.area}</span>
                  </div>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${statusColor2(r.status)}`}>{r.status}</span>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">{r.description}</p>
                <div className="flex items-center gap-3 text-[10px] text-text-secondary font-mono">
                  <span>By: {r.requestedBy}</span>
                  <span>·</span>
                  <span>Requested: {r.requestDate}</span>
                  <span>·</span>
                  <span className="text-danger">Deadline: {r.deadline}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* New Revision Form */}
      <SectionCard title="Request New Revision">
        <div className="space-y-4">
          {/* Area selector */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono font-bold text-text-secondary uppercase">Area</label>
            <div className="flex flex-wrap gap-2">
              {(['Document', 'Venue', 'Finance', 'Organizer', 'Logistics'] as const).map(a => (
                <button key={a} onClick={() => setArea(a)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${area === a ? 'bg-secondary text-white border-secondary' : 'bg-white border-border-subtle text-text-secondary hover:border-secondary/50'}`}>{a}</button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-mono font-bold text-text-secondary uppercase">Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Brief revision title..." className="w-full px-3 py-2.5 border border-border-subtle rounded-lg text-xs bg-white outline-none placeholder:text-text-secondary focus:border-secondary focus:ring-1 focus:ring-secondary/20" />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-mono font-bold text-text-secondary uppercase">Description</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} placeholder="Detailed description of what needs to be revised..." className="w-full p-3 border border-border-subtle rounded-lg text-xs bg-white outline-none resize-none placeholder:text-text-secondary focus:border-secondary focus:ring-1 focus:ring-secondary/20" />
          </div>

          {/* Severity */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono font-bold text-text-secondary uppercase">Severity</label>
            <div className="flex gap-2">
              {(['Minor', 'Medium', 'Critical'] as const).map(s => (
                <button key={s} onClick={() => setSeverity(s)} className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${severity === s ? (s === 'Critical' ? 'bg-danger text-white border-danger' : s === 'Medium' ? 'bg-warning text-white border-warning' : 'bg-success text-white border-success') : 'bg-white border-border-subtle text-text-secondary hover:border-slate-400'}`}>{s}</button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 text-[10px] p-3 bg-warning/5 border border-warning/15 rounded-lg text-warning">
            <MessageSquare className="w-3.5 h-3.5 shrink-0" />
            Organizer will be notified to make corrections before resubmission.
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
  onChangeStage,
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
        {activeTab === 'overview' && <TabOverview sub={submission} />}
        {activeTab === 'documents' && (
          <TabDocuments
            sub={submission}
            onVerify={(name) => onVerifyDocument(submission.id, name)}
            onReject={(name) => onRejectDocument(submission.id, name)}
            onView={onViewDocument}
          />
        )}
        {activeTab === 'venue' && <TabVenue sub={submission} />}
        {activeTab === 'logistics' && <TabLogistics sub={submission} />}
        {activeTab === 'finance' && <TabFinance sub={submission} />}
        {activeTab === 'history' && <TabHistory sub={submission} />}
        {activeTab === 'revision' && <TabRevision sub={submission} />}
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
                    onBack();
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
                  <button onClick={() => { onApprove(submission.id); onBack(); }} className="flex items-center gap-1.5 px-5 py-2.5 bg-success hover:bg-success/90 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-sm shadow-success/20">
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
