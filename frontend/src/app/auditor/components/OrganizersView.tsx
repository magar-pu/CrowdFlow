"use client";

import React, { useState } from 'react';
import { OrganizerVerification, OrganizerStatus } from '../types';
import {
  Search, ArrowUpDown, Shield, FileText, CheckCircle2,
  Users2, Mail, Phone, MapPin, CalendarDays,
  Clock, ArrowLeft, Ban, Send, Save, X, Activity, RefreshCw
} from 'lucide-react';

interface OrganizersViewProps {
  organizers: OrganizerVerification[];
  onUpdateOrganizerStatus: (id: string, status: OrganizerStatus, notes: string, feedback: string) => void;
  onUpdateOrganizerChecklist: (id: string, checklist: OrganizerVerification['checklist']) => void;
}

const STATUS_FILTERS: (OrganizerStatus | 'All')[] = ['All', 'Pending', 'Verified', 'Need Revision', 'Rejected', 'Suspended'];
const BUSINESS_FILTERS = ['All Types', 'PT / Limited Liability', 'CV / Partnership', 'Individual'];

const statusColors: Record<OrganizerStatus, string> = {
  Pending: 'bg-secondary/10 text-secondary border-secondary/20',
  Verified: 'bg-success/10 text-success border-success/20',
  'Need Revision': 'bg-warning/10 text-warning border-warning/20',
  Rejected: 'bg-danger/10 text-danger border-danger/20',
  Suspended: 'bg-slate-200 text-slate-700 border-slate-300',
};

const riskColors = {
  Low: 'bg-success/10 text-success border-success/20',
  Medium: 'bg-warning/10 text-warning border-warning/20',
  High: 'bg-orange-100 text-orange-600 border-orange-200',
  Critical: 'bg-danger/10 text-danger border-danger/20',
};

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? 'text-danger' : score >= 50 ? 'text-warning' : 'text-success';
  const ring = score >= 80 ? 'stroke-danger' : score >= 50 ? 'stroke-warning' : 'stroke-success';
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

export default function OrganizersView({
  organizers,
  onUpdateOrganizerStatus,
  onUpdateOrganizerChecklist,
}: OrganizersViewProps) {
  const [selectedOrg, setSelectedOrg] = useState<OrganizerVerification | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrganizerStatus | 'All'>('Pending');
  const [businessFilter, setBusinessFilter] = useState('All Types');
  const [sortKey, setSortKey] = useState<'date' | 'risk' | 'name'>('date');

  // Detail/Review Form States
  const [notes, setNotes] = useState('');
  const [feedback, setFeedback] = useState('');
  const [actionMode, setActionMode] = useState<'view' | 'reject' | 'revision' | 'suspend'>('view');
  
  // Revision details form
  const [revTitle, setRevTitle] = useState('');
  const [revDesc, setRevDesc] = useState('');
  const [revDeadline, setRevDeadline] = useState('');

  const filtered = organizers
    .filter(org => {
      const matchesStatus = statusFilter === 'All' || org.status === statusFilter;
      const matchesBusiness = businessFilter === 'All Types' || org.businessType === businessFilter;
      const q = search.toLowerCase();
      const matchesSearch = !q ||
        org.name.toLowerCase().includes(q) ||
        org.companyName.toLowerCase().includes(q) ||
        org.picEmail.toLowerCase().includes(q) ||
        org.id.toLowerCase().includes(q);
      return matchesStatus && matchesBusiness && matchesSearch;
    })
    .sort((a, b) => {
      if (sortKey === 'risk') return b.riskScore - a.riskScore;
      if (sortKey === 'name') return a.companyName.localeCompare(b.companyName);
      return b.registrationDate.localeCompare(a.registrationDate); // latest first
    });

  // Summary counts
  const stats = {
    pending: organizers.filter(o => o.status === 'Pending').length,
    verified: organizers.filter(o => o.status === 'Verified').length,
    revision: organizers.filter(o => o.status === 'Need Revision').length,
    rejected: organizers.filter(o => o.status === 'Rejected').length,
    suspended: organizers.filter(o => o.status === 'Suspended').length,
  };

  const handleOpenReview = (org: OrganizerVerification) => {
    setSelectedOrg(org);
    setNotes(org.internalNotes || '');
    setFeedback(org.organizerFeedback || '');
    setActionMode('view');
  };

  const handleToggleChecklist = (field: keyof OrganizerVerification['checklist']) => {
    if (!selectedOrg) return;
    const updatedChecklist = {
      ...selectedOrg.checklist,
      [field]: !selectedOrg.checklist[field]
    };
    onUpdateOrganizerChecklist(selectedOrg.id, updatedChecklist);
    setSelectedOrg({
      ...selectedOrg,
      checklist: updatedChecklist
    });
  };

  const handleVerify = () => {
    if (!selectedOrg) return;
    onUpdateOrganizerStatus(selectedOrg.id, 'Verified', notes, 'Account verification approved.');
    setSelectedOrg(null);
  };

  const handleConfirmReject = () => {
    if (!selectedOrg || !feedback.trim()) return;
    onUpdateOrganizerStatus(selectedOrg.id, 'Rejected', notes, feedback);
    setSelectedOrg(null);
  };

  const handleConfirmSuspend = () => {
    if (!selectedOrg || !feedback.trim()) return;
    onUpdateOrganizerStatus(selectedOrg.id, 'Suspended', notes, feedback);
    setSelectedOrg(null);
  };

  const handleSendRevision = () => {
    if (!selectedOrg || !revTitle.trim() || !revDesc.trim()) return;
    const revActionText = `[Revision Requested] ${revTitle}: ${revDesc} (Deadline: ${revDeadline})`;
    onUpdateOrganizerStatus(selectedOrg.id, 'Need Revision', notes + '\n' + revActionText, revDesc);
    setSelectedOrg(null);
  };

  // ─── LIST VIEW ───
  if (!selectedOrg) {
    return (
      <div className="space-y-6 text-left animate-fade-in font-sans">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Organizer Verification</h1>
          <p className="text-sm text-text-secondary mt-0.5">Validate and verify event organizer credentials.</p>
        </div>

        {/* Dashboard Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: 'Pending Review', value: stats.pending, color: 'text-secondary bg-secondary/5 border-secondary/20' },
            { label: 'Verified', value: stats.verified, color: 'text-success bg-success/5 border-success/20' },
            { label: 'Need Revision', value: stats.revision, color: 'text-warning bg-warning/5 border-warning/20' },
            { label: 'Rejected', value: stats.rejected, color: 'text-danger bg-danger/5 border-danger/20' },
            { label: 'Suspended', value: stats.suspended, color: 'text-slate-500 bg-slate-100 border-slate-200' },
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
              placeholder="Search by organizer name, company name, email, or ID..."
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
            <div className="w-px h-5 bg-border-subtle self-center mx-1" />
            {BUSINESS_FILTERS.map(b => (
              <button
                key={b}
                onClick={() => setBusinessFilter(b)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${businessFilter === b ? 'bg-secondary text-white border-secondary' : 'border-border-subtle text-text-secondary hover:bg-surface-container-low'}`}
              >
                {b}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-wrap pt-1">
            <span className="text-[10px] font-mono text-text-secondary flex items-center gap-1"><ArrowUpDown className="w-3 h-3" /> Sort by:</span>
            {([['date', 'Reg Date'], ['risk', 'Risk Score'], ['name', 'Company Name']] as const).map(([k, label]) => (
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

        {/* Organizers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(org => (
            <div
              key={org.id}
              onClick={() => handleOpenReview(org)}
              className="bg-white border border-border-subtle rounded-2xl p-5 soft-shadow flex flex-col hover:border-outline hover:shadow-md transition-all group text-left cursor-pointer"
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3 min-w-0">
                  <img src={org.logo} alt={org.name} className="w-11 h-11 rounded-full object-cover border border-border-subtle shrink-0" />
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-text-primary leading-tight truncate group-hover:text-primary transition-colors">{org.name}</h4>
                    <p className="text-[10px] text-text-secondary font-mono truncate">{org.companyName}</p>
                  </div>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full font-mono text-[9px] font-bold border shrink-0 ${statusColors[org.status]}`}>
                  {org.status}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-text-secondary mb-4 flex-1">
                <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-on-surface-variant shrink-0" /><span className="truncate">{org.province}</span></div>
                <div className="flex items-center gap-2"><CalendarDays className="w-3.5 h-3.5 text-on-surface-variant shrink-0" /><span>Reg: {org.registrationDate}</span></div>
                <div className="flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-on-surface-variant shrink-0" /><span>Activity: {org.lastActivity}</span></div>
              </div>

              <div className="bg-surface-container-low border border-border-subtle rounded-xl p-3 grid grid-cols-2 gap-2 text-center text-xs mb-4">
                <div>
                  <p className="text-[8px] font-mono text-text-secondary uppercase tracking-wider">Risk Category</p>
                  <p className={`text-xs font-bold mt-0.5 ${org.riskCategory === 'Low' ? 'text-success' : org.riskCategory === 'Medium' ? 'text-warning' : 'text-danger'}`}>{org.riskCategory}</p>
                </div>
                <div>
                  <p className="text-[8px] font-mono text-text-secondary uppercase tracking-wider">Risk Score</p>
                  <p className="text-xs font-bold text-text-primary mt-0.5">{org.riskScore}%</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border-subtle text-[10px] font-mono">
                <span>{org.id}</span>
                <span className="text-xs font-semibold text-secondary flex items-center gap-1 group-hover:underline">
                  Review Details →
                </span>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="md:col-span-2 lg:col-span-3 bg-white border border-border-subtle rounded-xl p-10 text-center">
              <p className="text-sm font-bold text-text-primary">No organizers found matching this filter</p>
              <p className="text-xs text-text-secondary mt-1">Try another search keyword or clear filters.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── FULL REVIEW VIEW ───
  return (
    <div className="flex flex-col min-h-full text-left animate-fade-in font-sans pb-32">
      {/* Breadcrumbs */}
      <div className="flex items-center justify-between pb-4 border-b border-border-subtle mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => setSelectedOrg(null)} className="p-2 border border-border-subtle bg-white hover:bg-surface-container-low text-text-secondary hover:text-text-primary rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold shadow-xs shrink-0">
            <ArrowLeft className="w-4 h-4" /> Back to List
          </button>
          <div className="min-w-0">
            <div className="text-[10px] text-text-secondary font-mono uppercase tracking-wider flex items-center gap-1">
              <span>Auditor Console</span><span>/</span><span>Organizer Verification</span><span>/</span>
              <span className="text-text-primary font-bold truncate">{selectedOrg.name}</span>
            </div>
            <h2 className="text-lg font-bold text-text-primary truncate mt-0.5">{selectedOrg.companyName}</h2>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold border ${statusColors[selectedOrg.status]}`}>{selectedOrg.status}</span>
          <span className="font-mono text-[10px] font-bold text-text-secondary bg-surface border border-border-subtle px-2.5 py-1 rounded-lg">{selectedOrg.id}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Information blocks */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Company Information */}
          <SectionCard title="Company Information">
            <div className="flex items-center gap-3 border-b border-border-subtle pb-3">
              <img src={selectedOrg.logo} alt={selectedOrg.name} className="w-10 h-10 rounded-full object-cover border border-border-subtle" />
              <div>
                <h3 className="text-sm font-bold text-text-primary">{selectedOrg.name}</h3>
                <p className="text-[10px] text-text-secondary font-mono">{selectedOrg.businessType}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {[
                { label: 'Company Name', value: selectedOrg.companyName },
                { label: 'Business License (NIB)', value: selectedOrg.businessLicense },
                { label: 'NPWP', value: selectedOrg.npwp },
                { label: 'Registration Number', value: selectedOrg.registrationNumber },
                { label: 'Company Address', value: selectedOrg.address, full: true },
              ].map(r => (
                <div key={r.label} className={r.full ? 'sm:col-span-2' : ''}>
                  <p className="text-[9px] font-mono text-text-secondary uppercase">{r.label}</p>
                  <p className="text-text-primary font-medium mt-0.5">{r.value}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* PIC Information */}
          <SectionCard title="PIC Information">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2.5 text-xs">
                {[
                  { label: 'Full Name', value: selectedOrg.picName },
                  { label: 'Position', value: selectedOrg.picPosition },
                  { label: 'Email Address', value: selectedOrg.picEmail },
                  { label: 'Phone Number', value: selectedOrg.picPhone },
                  { label: 'National ID (NIK)', value: selectedOrg.picNationalId },
                ].map(r => (
                  <div key={r.label}>
                    <p className="text-[9px] font-mono text-text-secondary uppercase">{r.label}</p>
                    <p className="text-text-primary font-medium mt-0.5">{r.value}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <p className="text-[9px] font-mono font-bold text-text-secondary uppercase">Selfie Verification</p>
                <div className="border border-border-subtle rounded-lg overflow-hidden h-40 relative bg-slate-50 flex items-center justify-center">
                  <img src={selectedOrg.picSelfieUrl} alt="Selfie Verification" className="w-full h-full object-cover" />
                  <div className="absolute bottom-2 left-2 right-2 bg-black/60 backdrop-blur-xs text-white text-[9px] text-center rounded py-1 font-semibold">
                    Face Match ID Verified
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>

          {/* Business & Bank Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            
            {/* Business info */}
            <SectionCard title="Business Details">
              <div className="space-y-2.5 text-xs">
                {[
                  { label: 'Industry', value: selectedOrg.industry },
                  { label: 'Event Category', value: selectedOrg.eventCategory },
                  { label: 'Years In Business', value: `${selectedOrg.yearsInBusiness} Years` },
                  { label: 'Previous Events', value: `${selectedOrg.previousEventsCount} Events` },
                  { label: 'Est. Annual Revenue', value: `Rp ${selectedOrg.estimatedAnnualRevenue.toLocaleString()}` },
                ].map(r => (
                  <div key={r.label} className="flex justify-between border-b border-border-subtle pb-1">
                    <span className="text-text-secondary">{r.label}</span>
                    <span className="font-semibold text-text-primary">{r.value}</span>
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* Bank details */}
            <SectionCard title="Bank Details">
              <div className="space-y-2.5 text-xs">
                {[
                  { label: 'Bank Name', value: selectedOrg.bankName },
                  { label: 'Account Holder', value: selectedOrg.bankAccountHolder },
                  { label: 'Account Number', value: selectedOrg.bankAccountNumber },
                ].map(r => (
                  <div key={r.label} className="flex justify-between border-b border-border-subtle pb-1">
                    <span className="text-text-secondary">{r.label}</span>
                    <span className="font-semibold text-text-primary">{r.value}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-2">
                  <span className="text-text-secondary">Verification Status</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${selectedOrg.bankVerificationStatus === 'Verified' ? 'bg-success/10 text-success border-success/20' : 'bg-warning/10 text-warning border-warning/20'}`}>
                    {selectedOrg.bankVerificationStatus}
                  </span>
                </div>
              </div>
            </SectionCard>
          </div>

          {/* History */}
          <SectionCard title="History Log">
            <div className="space-y-3.5 pt-1">
              {selectedOrg.history.map((h, idx) => (
                <div key={idx} className="flex gap-2.5 text-xs">
                  <div className="flex flex-col items-center">
                    <div className="w-5 h-5 rounded-full bg-surface-container-low border border-border-subtle flex items-center justify-center shrink-0">
                      <Activity className="w-2.5 h-2.5 text-text-secondary" />
                    </div>
                    {idx < selectedOrg.history.length - 1 && <div className="w-px flex-1 bg-border-subtle my-1" />}
                  </div>
                  <div>
                    <p className="font-bold text-text-primary">{h.action}</p>
                    <p className="text-text-secondary text-[11px] mt-0.5">{h.details}</p>
                    <p className="text-[9px] font-mono text-text-secondary mt-1">{h.timestamp} · by {h.actor}</p>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        {/* Right Column: Checklists & Verification panel */}
        <div className="space-y-6">
          
          {/* Compliance Checklist */}
          <SectionCard title="Compliance Checklist">
            <div className="space-y-2">
              {[
                { key: 'businessLicenseValid' as const, label: 'Business License Valid' },
                { key: 'npwpValid' as const, label: 'NPWP Valid' },
                { key: 'picIdentityVerified' as const, label: 'PIC Identity Verified' },
                { key: 'bankAccountVerified' as const, label: 'Bank Account Verified' },
                { key: 'addressVerified' as const, label: 'Address Verified' },
                { key: 'emailVerified' as const, label: 'Email Verified' },
                { key: 'phoneVerified' as const, label: 'Phone Verified' },
              ].map(item => {
                const done = selectedOrg.checklist[item.key];
                return (
                  <button
                    key={item.key}
                    onClick={() => handleToggleChecklist(item.key)}
                    className={`w-full flex items-center gap-2.5 text-xs px-3 py-2 rounded-lg border text-left transition-all cursor-pointer ${done ? 'bg-success/5 text-success border-success/15 font-semibold' : 'bg-surface-container-low border-border-subtle text-text-secondary'}`}
                  >
                    <CheckCircle2 className={`w-4 h-4 shrink-0 ${done ? 'text-success' : 'text-slate-300'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </SectionCard>

          {/* Risk Assessment */}
          <SectionCard title="Risk Assessment">
            <div className="flex justify-between items-center">
              <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${riskColors[selectedOrg.riskCategory]}`}>{selectedOrg.riskCategory} Risk</span>
            </div>
            <div className="flex items-center gap-4 bg-surface-container-low border border-border-subtle rounded-xl p-3.5">
              <Shield className="w-7 h-7 text-secondary shrink-0" />
              <div>
                <p className="text-xs text-text-secondary">System Risk Score</p>
                <p className="text-xl font-bold text-text-primary mt-0.5">{selectedOrg.riskScore}%</p>
              </div>
            </div>
            <div className="space-y-2 text-xs">
              <p className="text-[9px] font-mono font-bold text-text-secondary uppercase">Risk Check Results</p>
              {[
                { label: 'Identity Match', status: selectedOrg.riskAssessment.identityMatch },
                { label: 'Company Validation', status: selectedOrg.riskAssessment.companyValidation },
                { label: 'Fraud History', status: !selectedOrg.riskAssessment.fraudHistory },
                { label: 'Duplicate Account', status: !selectedOrg.riskAssessment.duplicateAccount },
                { label: 'Suspicious Activity', status: !selectedOrg.riskAssessment.suspiciousActivity },
              ].map((item, idx) => (
                <div key={idx} className="flex justify-between border-b border-border-subtle pb-1.5">
                  <span className="text-text-secondary">{item.label}</span>
                  <span className={`font-bold ${item.status ? 'text-success' : 'text-danger'}`}>{item.status ? 'CLEAR' : 'FLAGGED'}</span>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Auditor Notes form */}
          <SectionCard title="Auditor Notes">
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[9px] font-mono font-bold text-text-secondary uppercase">Internal Notes</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Notes about this organizer..."
                  className="w-full p-2.5 border border-border-subtle rounded-lg text-xs bg-white outline-none resize-none placeholder:text-text-secondary focus:border-secondary focus:ring-1 focus:ring-secondary/20"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-mono font-bold text-text-secondary uppercase">Organizer Feedback</label>
                <textarea
                  value={feedback}
                  onChange={e => setFeedback(e.target.value)}
                  rows={2}
                  placeholder="Feedback sent to organizer..."
                  className="w-full p-2.5 border border-border-subtle rounded-lg text-xs bg-white outline-none resize-none placeholder:text-text-secondary focus:border-secondary focus:ring-1 focus:ring-secondary/20"
                />
              </div>
            </div>
          </SectionCard>
        </div>
      </div>

      {/* Sticky Verification Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-white/95 border-t border-border-subtle backdrop-blur-md px-4 py-3 sm:px-6">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-3 flex-wrap">
          {actionMode === 'reject' ? (
            <>
              <div className="flex-1 min-w-[200px]">
                <input
                  value={feedback}
                  onChange={e => setFeedback(e.target.value)}
                  placeholder="Provide rejection reason..."
                  className="w-full px-3 py-2 border border-border-subtle rounded-lg text-xs bg-white outline-none focus:border-danger focus:ring-1 focus:ring-danger/20"
                />
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => setActionMode('view')} className="flex items-center gap-1 px-3 py-2 border border-border-subtle text-text-secondary rounded-lg text-xs font-bold hover:bg-surface-container-low transition-colors cursor-pointer"><X className="w-3.5 h-3.5" /> Cancel</button>
                <button onClick={handleConfirmReject} disabled={!feedback.trim()} className="flex items-center gap-1.5 px-4 py-2 bg-danger text-white rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"><Ban className="w-3.5 h-3.5" /> Confirm Rejection</button>
              </div>
            </>
          ) : actionMode === 'suspend' ? (
            <>
              <div className="flex-1 min-w-[200px]">
                <input
                  value={feedback}
                  onChange={e => setFeedback(e.target.value)}
                  placeholder="Provide suspension reason..."
                  className="w-full px-3 py-2 border border-border-subtle rounded-lg text-xs bg-white outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400/20"
                />
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => setActionMode('view')} className="flex items-center gap-1 px-3 py-2 border border-border-subtle text-text-secondary rounded-lg text-xs font-bold hover:bg-surface-container-low transition-colors cursor-pointer"><X className="w-3.5 h-3.5" /> Cancel</button>
                <button onClick={handleConfirmSuspend} disabled={!feedback.trim()} className="flex items-center gap-1.5 px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"><Ban className="w-3.5 h-3.5" /> Confirm Suspension</button>
              </div>
            </>
          ) : actionMode === 'revision' ? (
            <div className="w-full grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
              <div>
                <label className="text-[9px] font-mono font-bold text-text-secondary uppercase">Revision Title</label>
                <input value={revTitle} onChange={e => setRevTitle(e.target.value)} placeholder="e.g. NPWP Card Missing" className="w-full px-2.5 py-1.5 border border-border-subtle rounded text-xs outline-none" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-[9px] font-mono font-bold text-text-secondary uppercase">Revision Description & Required Action</label>
                <input value={revDesc} onChange={e => setRevDesc(e.target.value)} placeholder="Describe what the organizer must correct..." className="w-full px-2.5 py-1.5 border border-border-subtle rounded text-xs outline-none" />
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setActionMode('view')} className="px-3 py-2 border border-border-subtle text-text-secondary rounded-lg text-xs font-bold hover:bg-surface-container-low transition-colors cursor-pointer"><X className="w-3.5 h-3.5" /> Cancel</button>
                <button onClick={handleSendRevision} disabled={!revTitle.trim() || !revDesc.trim()} className="px-4 py-2 bg-warning text-white rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"><Send className="w-3.5 h-3.5" /> Send Request</button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 w-full justify-end flex-wrap">
              <span className="text-[10px] font-mono text-text-secondary mr-auto hidden sm:block">
                Organizer Verification Console
              </span>
              <button onClick={() => setSelectedOrg(null)} className="flex items-center gap-1.5 px-3 py-2.5 border border-border-subtle text-text-secondary rounded-lg text-xs font-bold hover:bg-surface-container-low transition-colors cursor-pointer">
                <X className="w-3.5 h-3.5" /> Close
              </button>
              <button onClick={() => { onUpdateOrganizerStatus(selectedOrg.id, selectedOrg.status, notes, feedback); setSelectedOrg(null); }} className="flex items-center gap-1.5 px-3 py-2.5 border border-border-subtle text-text-secondary rounded-lg text-xs font-bold hover:bg-surface-container-low transition-colors cursor-pointer">
                <Save className="w-3.5 h-3.5" /> Save Draft
              </button>
              {selectedOrg.status === 'Pending' && (
                <>
                  <button onClick={() => { setActionMode('revision'); setRevTitle(''); setRevDesc(''); }} className="flex items-center gap-1.5 px-4 py-2.5 bg-warning/10 hover:bg-warning text-warning hover:text-white border border-warning/30 rounded-lg text-xs font-bold transition-colors cursor-pointer">
                    <RefreshCw className="w-3.5 h-3.5" /> Request Revision
                  </button>
                  <button onClick={() => setActionMode('reject')} className="flex items-center gap-1.5 px-4 py-2.5 bg-danger/10 hover:bg-danger text-danger hover:text-white border border-danger/30 rounded-lg text-xs font-bold transition-colors cursor-pointer">
                    <Ban className="w-3.5 h-3.5" /> Reject Organizer
                  </button>
                  <button onClick={() => setActionMode('suspend')} className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-200 hover:bg-slate-700 text-slate-700 hover:text-white border border-slate-300 rounded-lg text-xs font-bold transition-colors cursor-pointer">
                    <Ban className="w-3.5 h-3.5" /> Suspend
                  </button>
                  <button onClick={handleVerify} className="flex items-center gap-1.5 px-5 py-2.5 bg-success hover:bg-success/90 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-sm shadow-success/20">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Approve Organizer
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
