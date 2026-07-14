import React from 'react';
import { Send, CheckCircle2, Pencil, MapPin, Globe2, ShieldCheck, Clock, FileText } from 'lucide-react';
import { DocumentStatus, TicketTier } from '../../types';

interface StepReviewProps {
  eventName: string;
  category: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  locationType: 'physical' | 'virtual';
  address: string;
  streamingLink: string;
  venue: string;
  tiers: TicketTier[];
  documents: DocumentStatus[];
  visibility: 'public' | 'private';
  setVisibility: (v: 'public' | 'private') => void;
  organizerContact: string;
  setOrganizerContact: (v: string) => void;
  certified: boolean;
  setCertified: (v: boolean) => void;
  agreedGuidelines: boolean;
  setAgreedGuidelines: (v: boolean) => void;
  onEditStep: (step: 'basic' | 'venue' | 'tickets') => void;
  onSubmit: () => void;
}

const TIMELINE_STAGES = ['Submitted', 'Document Verification', 'Event Validation', 'Final Approval & Published'];

export default function StepReview({
  eventName, category,
  startDate, startTime, endDate, endTime,
  locationType, address, streamingLink, venue,
  tiers, documents,
  visibility, setVisibility,
  organizerContact, setOrganizerContact,
  certified, setCertified,
  agreedGuidelines, setAgreedGuidelines,
  onEditStep,
  onSubmit,
}: StepReviewProps) {
  const totalCapacity = tiers.reduce((acc, t) => acc + t.capacity, 0);
  const checklist = [
    { label: 'Event Info', done: !!eventName },
    { label: 'Venue Layout', done: locationType === 'virtual' ? !!streamingLink : !!venue },
    { label: 'Organizer Profile', done: !!organizerContact },
    { label: 'Ticket Configuration', done: tiers.length > 0 },
  ];
  const canSubmit = certified && agreedGuidelines;

  return (
    <div className="space-y-6 text-left animate-fade-in">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white border border-border-subtle rounded-xl p-5 soft-shadow space-y-3">
          <div className="flex justify-between items-start border-b border-border-subtle pb-2.5">
            <h4 className="text-sm font-bold text-text-primary">Basic Information</h4>
            <button onClick={() => onEditStep('basic')} className="flex items-center gap-1 text-[10px] font-bold text-secondary hover:text-primary transition-colors cursor-pointer">
              <Pencil className="w-3 h-3" /> Edit
            </button>
          </div>
          <div className="space-y-1.5 text-xs">
            <p className="font-bold text-text-primary">{eventName}</p>
            <p className="text-text-secondary">{category}</p>
            <p className="text-text-secondary font-mono text-[10px]">{startDate} {startTime} &rarr; {endDate} {endTime}</p>
          </div>
        </div>

        <div className="bg-white border border-border-subtle rounded-xl p-5 soft-shadow space-y-3">
          <div className="flex justify-between items-start border-b border-border-subtle pb-2.5">
            <h4 className="text-sm font-bold text-text-primary">Tickets</h4>
            <button onClick={() => onEditStep('tickets')} className="flex items-center gap-1 text-[10px] font-bold text-secondary hover:text-primary transition-colors cursor-pointer">
              <Pencil className="w-3 h-3" /> Edit
            </button>
          </div>
          <div className="space-y-1.5 text-xs">
            {tiers.length === 0 ? (
              <p className="text-text-secondary">No tiers configured.</p>
            ) : tiers.map(t => (
              <div key={t.id} className="flex justify-between">
                <span className="text-text-primary font-medium">{t.name}</span>
                <span className="text-text-secondary font-mono text-[10px]">${t.price} &middot; {t.capacity}</span>
              </div>
            ))}
            <p className="text-[10px] text-on-surface-variant font-mono pt-1 border-t border-border-subtle">Total capacity: {totalCapacity.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white border border-border-subtle rounded-xl p-5 soft-shadow space-y-3">
          <div className="flex justify-between items-start border-b border-border-subtle pb-2.5">
            <h4 className="text-sm font-bold text-text-primary">Venue</h4>
            {locationType === 'physical' && (
              <button onClick={() => onEditStep('venue')} className="flex items-center gap-1 text-[10px] font-bold text-secondary hover:text-primary transition-colors cursor-pointer">
                <Pencil className="w-3 h-3" /> Edit
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            {locationType === 'physical' ? <MapPin className="w-3.5 h-3.5 text-secondary shrink-0" /> : <Globe2 className="w-3.5 h-3.5 text-secondary shrink-0" />}
            <span className="text-text-primary font-medium truncate">{locationType === 'physical' ? (venue || 'No venue selected') : 'Virtual Event'}</span>
          </div>
          {locationType === 'physical' && <p className="text-[10px] text-on-surface-variant font-mono">{address}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Final Settings */}
        <div className="bg-white border border-border-subtle rounded-xl p-5 soft-shadow space-y-4">
          <h3 className="text-sm font-bold text-text-primary border-b border-border-subtle pb-3">Final Settings</h3>
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono font-bold text-text-secondary uppercase">Event Visibility</label>
            <div className="inline-flex rounded-lg border border-border-subtle p-1 bg-surface-container-low w-full">
              <button
                type="button"
                onClick={() => setVisibility('public')}
                className={`flex-1 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  visibility === 'public' ? 'bg-primary text-on-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Public
              </button>
              <button
                type="button"
                onClick={() => setVisibility('private')}
                className={`flex-1 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  visibility === 'private' ? 'bg-primary text-on-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Private
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono font-bold text-text-secondary uppercase">Organizer Contact</label>
            <input type="email" value={organizerContact} onChange={(e) => setOrganizerContact(e.target.value)} className="w-full h-10 px-3 border border-border-subtle rounded-lg text-xs bg-white outline-none" placeholder="organizer@example.com" />
          </div>
        </div>

        {/* Auditor Review System */}
        <div className="bg-white border border-border-subtle rounded-xl p-5 soft-shadow space-y-4">
          <h3 className="text-sm font-bold text-text-primary border-b border-border-subtle pb-3 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-secondary" /> Submission Checklist
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {checklist.map((item) => (
              <div key={item.label} className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg ${item.done ? 'bg-success/5 text-success' : 'bg-surface-container-low text-on-surface-variant'}`}>
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{item.label}</span>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-border-subtle space-y-2">
            <p className="text-[10px] font-mono font-bold text-text-secondary uppercase">Required Documents Status</p>
            {documents.length === 0 ? (
              <p className="text-xs text-on-surface-variant font-mono">No documents uploaded.</p>
            ) : documents.map((doc, idx) => (
              <div key={idx} className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-1.5 min-w-0">
                  <FileText className="w-3.5 h-3.5 text-on-surface-variant shrink-0" />
                  <span className="truncate text-text-primary font-medium">{doc.name}</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full font-mono text-[8px] font-bold shrink-0 ${
                  doc.status === 'VERIFIED' ? 'bg-success/10 text-success' : 'bg-secondary/10 text-secondary'
                }`}>
                  {doc.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Verification Timeline */}
      <div className="bg-white border border-border-subtle rounded-xl p-5 soft-shadow space-y-4">
        <h3 className="text-sm font-bold text-text-primary border-b border-border-subtle pb-3">Verification Timeline</h3>
        <div className="relative flex justify-between items-start gap-2">
          <div className="absolute left-4 right-4 top-4 h-0.5 bg-surface-container -z-10"></div>
          {TIMELINE_STAGES.map((stage, idx) => {
            const isCurrent = idx === 0;
            return (
              <div key={stage} className="flex flex-col items-center gap-1.5 flex-1 text-center">
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold ${
                  isCurrent ? 'bg-secondary border-secondary text-white' : 'bg-white border-border-subtle text-on-surface-variant'
                }`}>
                  {idx + 1}
                </div>
                <span className={`text-[9px] font-bold ${isCurrent ? 'text-text-primary' : 'text-on-surface-variant'}`}>{stage}</span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-2 p-3 bg-surface-container-low border border-border-subtle rounded-lg text-xs text-text-secondary">
          <Clock className="w-4 h-4 shrink-0 text-secondary" />
          <span>Estimated review processing time: 1-7 business days.</span>
        </div>
      </div>

      {/* Legal / Compliance + Submit */}
      <div className="bg-white border border-border-subtle rounded-xl p-6 soft-shadow max-w-xl mx-auto space-y-6">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 bg-secondary/10 border border-secondary/20 rounded-full flex items-center justify-center text-secondary mx-auto">
            <Send className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-text-primary">Review & Launch</h3>
            <p className="text-xs text-text-secondary">Certify compliance policies before submitting to public ticketing catalogs.</p>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-border-subtle">
          <label className="flex items-start gap-3 cursor-pointer select-none text-xs text-text-secondary leading-normal font-normal">
            <input
              type="checkbox"
              checked={certified}
              onChange={(e) => setCertified(e.target.checked)}
              className="w-4 h-4 mt-0.5 accent-secondary cursor-pointer"
            />
            <span>I certify that all uploaded contracts, licenses, and permits are authentic and valid under local laws.</span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer select-none text-xs text-text-secondary leading-normal font-normal">
            <input
              type="checkbox"
              checked={agreedGuidelines}
              onChange={(e) => setAgreedGuidelines(e.target.checked)}
              className="w-4 h-4 mt-0.5 accent-secondary cursor-pointer"
            />
            <span>I agree to CrowdFlow&apos;s Terms of Service and anti-scalping price boundary guidelines.</span>
          </label>
        </div>

        <button
          onClick={onSubmit}
          disabled={!canSubmit}
          className="w-full bg-primary hover:bg-primary/90 disabled:bg-surface-container disabled:text-on-surface-variant text-white font-bold text-xs py-3 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Submit for Review</span>
        </button>
      </div>
    </div>
  );
}
