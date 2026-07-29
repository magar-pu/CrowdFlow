"use client";

import React, { useState } from 'react';
import { OrganizerVerification, OrganizerStatus, ReviewDocument } from '../types';
import { getAccountDocumentViewURL } from '@/lib/api/auditor';
import {
  CheckCircle2,
  ArrowLeft, Ban, Send, Save, X, Activity, RefreshCw, FileText, ExternalLink
} from 'lucide-react';

interface OrganizerDetailViewProps {
  organizer: OrganizerVerification;
  onBack: () => void;
  onUpdateOrganizerStatus: (id: string, status: OrganizerStatus, notes: string, feedback: string) => void;
  onUpdateOrganizerChecklist: (id: string, checklist: OrganizerVerification['checklist']) => void;
  onVerifyDocument: (docId: string) => void;
  onRejectDocument: (docId: string) => void;
}

// doc.fileUrl is the private-bucket OBJECT KEY, not a fetchable link — rendering
// it in an href gave every document a dead "View Link" button. Mint a signed URL
// instead.
//
// The blank tab is opened SYNCHRONOUSLY, before awaiting, or a popup blocker
// rejects a window created from an async continuation.
async function openSignedDocument(docId: string | number | undefined) {
  if (docId === undefined) {
    alert("This document has no id on file and cannot be opened.");
    return;
  }
  const tab = window.open("", "_blank");
  const res = await getAccountDocumentViewURL(docId);
  if (res.success && res.data?.url) {
    if (tab) tab.location.href = res.data.url;
  } else {
    tab?.close();
    alert(res.error?.message || "Could not open that document.");
  }
}

const statusColors: Record<OrganizerStatus, string> = {
  Pending: 'bg-secondary/10 text-secondary border-secondary/20',
  Verified: 'bg-success/10 text-success border-success/20',
  'Need Revision': 'bg-warning/10 text-warning border-warning/20',
  Rejected: 'bg-danger/10 text-danger border-danger/20',
  Suspended: 'bg-slate-200 text-slate-700 border-slate-300',
};

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-border-subtle rounded-xl p-5 soft-shadow space-y-4">
      <h3 className="text-[10px] font-mono font-bold text-text-secondary uppercase tracking-wider">{title}</h3>
      {children}
    </div>
  );
}

/**
 * Drops rows the application never supplied.
 *
 * An auditor decides whether a business is real. A field rendered with an
 * invented placeholder — this page used to show a fabricated NIK, NPWP, NIB and
 * bank account for every organizer, from mapper fallbacks — is worse than an
 * absent one: it can be ticked off the checklist as if it had been seen. If the
 * organizer did not provide it, it does not appear.
 */
function present(rows: { label: string; value?: string | null; full?: boolean }[]) {
  return rows.filter((r) => typeof r.value === "string" && r.value.trim() !== "");
}

export default function OrganizerDetailView({
  organizer,
  onBack,
  onUpdateOrganizerStatus,
  onUpdateOrganizerChecklist,
  onVerifyDocument,
  onRejectDocument,
}: OrganizerDetailViewProps) {
  const [notes, setNotes] = useState(organizer.internalNotes || '');
  const [feedback, setFeedback] = useState(organizer.organizerFeedback || '');
  const [actionMode, setActionMode] = useState<'view' | 'reject' | 'revision' | 'suspend'>('view');

  const [revTitle, setRevTitle] = useState('');
  const [revDesc, setRevDesc] = useState('');
  const [revDeadline, setRevDeadline] = useState('');

  const handleToggleChecklist = (field: keyof OrganizerVerification['checklist']) => {
    const updatedChecklist = {
      ...organizer.checklist,
      [field]: !organizer.checklist[field]
    };
    onUpdateOrganizerChecklist(organizer.id, updatedChecklist);
  };

  const handleVerify = () => {
    onUpdateOrganizerStatus(organizer.id, 'Verified', notes, 'Account verification approved.');
    onBack();
  };

  const handleConfirmReject = () => {
    if (!feedback.trim()) return;
    onUpdateOrganizerStatus(organizer.id, 'Rejected', notes, feedback);
    onBack();
  };

  const handleConfirmSuspend = () => {
    if (!feedback.trim()) return;
    onUpdateOrganizerStatus(organizer.id, 'Suspended', notes, feedback);
    onBack();
  };

  const handleSendRevision = () => {
    if (!revTitle.trim() || !revDesc.trim()) return;
    const revActionText = `[Revision Requested] ${revTitle}: ${revDesc} (Deadline: ${revDeadline})`;
    onUpdateOrganizerStatus(organizer.id, 'Need Revision', notes + '\n' + revActionText, revDesc);
    onBack();
  };

  return (
    <div className="flex flex-col min-h-full text-left animate-fade-in font-sans pb-32">
      {/* Breadcrumbs */}
      <div className="flex items-center justify-between pb-4 border-b border-border-subtle mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onBack} className="p-2 border border-border-subtle bg-white hover:bg-surface-container-low text-text-secondary hover:text-text-primary rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold shadow-xs shrink-0">
            <ArrowLeft className="w-4 h-4" /> Back to List
          </button>
          <div className="min-w-0">
            <div className="text-[10px] text-text-secondary font-mono uppercase tracking-wider flex items-center gap-1">
              <span>Auditor Console</span><span>/</span><span>Organizer Verification</span><span>/</span>
              <span className="text-text-primary font-bold truncate">{organizer.name}</span>
            </div>
            <h2 className="text-lg font-bold text-text-primary truncate mt-0.5">{organizer.companyName}</h2>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold border ${statusColors[organizer.status]}`}>{organizer.status}</span>
          <span className="font-mono text-[10px] font-bold text-text-secondary bg-surface border border-border-subtle px-2.5 py-1 rounded-lg">{organizer.id}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column: Information blocks */}
        <div className="lg:col-span-2 space-y-6">

          {/* Company Information */}
          <SectionCard title="Company Information">
            <div className="flex items-center gap-3 border-b border-border-subtle pb-3">
              <div>
                <h3 className="text-sm font-bold text-text-primary">{organizer.companyName}</h3>
                {/* business_type is NOT NULL but empty for organizers an admin
                    granted the role directly, who never filled in a form. */}
                {organizer.businessType?.trim() && (
                  <p className="text-[10px] text-text-secondary font-mono">{organizer.businessType}</p>
                )}
              </div>
            </div>
            {/* NIB, NPWP and Registration Number used to sit here. The
                application form never collects them and GetOrganizer never
                returned them — every organizer showed the same invented
                numbers. The NIB and NPWP an auditor actually checks are the
                uploaded documents below. */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs mt-3">
              {present([
                { label: 'Company Name', value: organizer.companyName },
                { label: 'Company Address', value: organizer.address, full: true },
              ]).map(r => (
                <div key={r.label} className={r.full ? 'sm:col-span-2' : ''}>
                  <p className="text-[9px] font-mono text-text-secondary uppercase">{r.label}</p>
                  <p className="text-text-primary font-medium mt-0.5">{r.value}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* PIC Information.
              Position and National ID (NIK) are gone for the same reason as the
              company registration numbers: nothing collects them, so both were
              pure mapper inventions — and a fabricated NIK next to a KTP an
              auditor is about to verify is the most dangerous of the lot. */}
          <SectionCard title="PIC Information">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {present([
                { label: 'Full Name', value: organizer.picName },
                { label: 'Email Address', value: organizer.picEmail },
                { label: 'Phone Number', value: organizer.picPhone },
              ]).map(r => (
                <div key={r.label}>
                  <p className="text-[9px] font-mono text-text-secondary uppercase">{r.label}</p>
                  <p className="text-text-primary font-medium mt-0.5">{r.value}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Onboarding Documents */}
          <SectionCard title="Onboarding Documents">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {organizer.documents && organizer.documents.length > 0 ? (
                organizer.documents.map((doc: ReviewDocument) => (
                  <div
                    key={doc.id}
                    className="flex flex-col justify-between p-4 border border-border-subtle bg-surface-container-low rounded-xl text-xs space-y-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 border border-border-subtle bg-white text-text-secondary rounded-lg shrink-0">
                        <FileText className="w-5 h-5 text-secondary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-text-primary uppercase tracking-wide">
                          {doc.name}
                        </p>
                        <p className="text-[10px] text-text-secondary mt-0.5">
                          {doc.category}
                        </p>
                        <p className="text-[9px] font-mono text-text-secondary mt-1">
                          Uploaded: {doc.uploadDate}
                        </p>
                      </div>
                      <span
                        className={`ml-auto px-2 py-0.5 rounded-full font-mono text-[9px] font-bold border shrink-0 ${
                          doc.status === "VERIFIED"
                            ? "bg-success/10 text-success border-success/20"
                            : doc.status === "REJECTED"
                            ? "bg-danger/10 text-danger border-danger/20"
                            : "bg-warning/10 text-warning border-warning/20"
                        }`}
                      >
                        {doc.status === "VERIFIED"
                          ? "VERIFIED"
                          : doc.status === "REJECTED"
                          ? "REJECTED"
                          : "WAITING REVIEW"}
                      </span>
                    </div>

                    <div className="flex gap-2 pt-2 border-t border-border-subtle">
                      <button
                        onClick={() => openSignedDocument(doc.id)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 border border-border-subtle bg-white hover:bg-surface text-text-secondary hover:text-text-primary rounded-lg text-xs font-bold transition-colors cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> View Document
                      </button>

                      {doc.status !== "VERIFIED" && doc.status !== "REJECTED" && (
                        <>
                          <button
                            onClick={() => onVerifyDocument(String(doc.id))}
                            className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-success text-white rounded-lg text-xs font-bold hover:bg-success/90 transition-colors cursor-pointer"
                          >
                            Verify
                          </button>
                          <button
                            onClick={() => onRejectDocument(String(doc.id))}
                            className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-danger text-white rounded-lg text-xs font-bold hover:bg-danger/90 transition-colors cursor-pointer"
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-2 text-center py-6 text-text-secondary">
                  No onboarding documents uploaded for this organizer.
                </div>
              )}
            </div>
          </SectionCard>

          {/* A "Business Details" card sat beside this one showing Industry,
              Event Category, Years In Business, Previous Events and Est. Annual
              Revenue. Not one of those five is collected by the application
              form, stored in organizer_applications, or returned by
              GetOrganizer — every organizer displayed the same five constants
              from the page's mapper ("Creative Industries", "2 Years",
              "Rp 150,000,000"...). There is nothing to show, so it is gone
              rather than emptied: an empty card invites someone to go looking
              for the data behind it. */}
          <SectionCard title="Bank Details">
            {/* Bank details ARE real (organizer_applications.bank_*) but are
                filled in later, from the organizer's own Payout Details screen.
                Blank means "not submitted yet", which an auditor needs to be
                able to tell apart from a value. */}
            <div className="space-y-2.5 text-xs">
              {[
                { label: 'Bank Name', value: organizer.bankName },
                { label: 'Account Holder', value: organizer.bankAccountHolder },
                { label: 'Account Number', value: organizer.bankAccountNumber },
              ].map(r => (
                <div key={r.label} className="flex justify-between gap-3 border-b border-border-subtle pb-1">
                  <span className="text-text-secondary shrink-0">{r.label}</span>
                  {r.value?.trim() ? (
                    <span className="font-semibold text-text-primary text-right break-all">{r.value}</span>
                  ) : (
                    <span className="italic text-text-secondary">Not provided</span>
                  )}
                </div>
              ))}
              <div className="flex justify-between items-center pt-2">
                <span className="text-text-secondary">Verification Status</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${organizer.bankVerificationStatus === 'Verified' ? 'bg-success/10 text-success border-success/20' : 'bg-warning/10 text-warning border-warning/20'}`}>
                  {organizer.bankVerificationStatus}
                </span>
              </div>
            </div>
          </SectionCard>

          {/* History */}
          <SectionCard title="History Log">
            <div className="space-y-3.5 pt-1">
              {organizer.history.map((h, idx) => (
                <div key={idx} className="flex gap-2.5 text-xs">
                  <div className="flex flex-col items-center">
                    <div className="w-5 h-5 rounded-full bg-surface-container-low border border-border-subtle flex items-center justify-center shrink-0">
                      <Activity className="w-2.5 h-2.5 text-text-secondary" />
                    </div>
                    {idx < organizer.history.length - 1 && <div className="w-px flex-1 bg-border-subtle my-1" />}
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
                const done = organizer.checklist[item.key];
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
              <button onClick={onBack} className="flex items-center gap-1.5 px-3 py-2.5 border border-border-subtle text-text-secondary rounded-lg text-xs font-bold hover:bg-surface-container-low transition-colors cursor-pointer">
                <X className="w-3.5 h-3.5" /> Close
              </button>
              <button onClick={() => { onUpdateOrganizerStatus(organizer.id, organizer.status, notes, feedback); onBack(); }} className="flex items-center gap-1.5 px-3 py-2.5 border border-border-subtle text-text-secondary rounded-lg text-xs font-bold hover:bg-surface-container-low transition-colors cursor-pointer">
                <Save className="w-3.5 h-3.5" /> Save Draft
              </button>
              {organizer.status === 'Pending' && (
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
