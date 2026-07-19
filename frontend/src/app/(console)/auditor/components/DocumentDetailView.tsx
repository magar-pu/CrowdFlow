"use client";

import React from 'react';
import { ArrowLeft, FileText, CheckCircle, AlertTriangle, ShieldCheck, Download, Printer, Calendar, ShieldAlert } from 'lucide-react';

interface DocumentDetailViewProps {
  document: {
    id: string;
    fileName: string;
    category: string;
    status: string;
    eventName: string;
    organizerName: string;
  };
  onBack: () => void;
  onVerify: () => void;
  onReject: () => void;
}

export default function DocumentDetailView({
  document,
  onBack,
  onVerify,
  onReject
}: DocumentDetailViewProps) {
  // Determine realistic mock content based on the filename
  const getDocContent = () => {
    const nameLower = document.fileName.toLowerCase();
    
    if (nameLower.includes('permit')) {
      return {
        title: 'TEMPORARY LAND USE PERMIT',
        authority: 'AUSTIN PARKS & RECREATION DEPARTMENT',
        docId: 'PMT-2026-99081',
        paragraphs: [
          'Subject to the provisions of the Municipal Event Code, authorization is hereby granted to holding public gatherings under restricted capacity rules.',
          'Permit Holder: Aurora Live Events / Neon Nights Team',
          'Approved Site: Zilker Park, Sector 4-B, Austin, TX',
          'Capacity Boundaries: Strictly limited to 4,200 active ticketholders at any given time.',
          'Operational Mandates: All amplified music must cease by 23:00 local time. Garbage disposal and lawn restoration operations must be fully settled within 24 hours of event dismantling.',
          'Safety Requirements: Clear access corridors of at least 15 feet must be maintained at all times for emergency medical vehicles.'
        ],
        stamp: 'COMPLIANCE SECURE - APPROVED'
      };
    }

    if (nameLower.includes('catering') || nameLower.includes('contract')) {
      return {
        title: 'VENDOR & CATERING SERVICE AGREEMENT',
        authority: 'FOOD & SANITATION COMPLIANCE DESK',
        docId: 'CTR-8871-FOOD',
        paragraphs: [
          'This service agreement is entered into by and between the Organizer (Aurora Live Events) and the Catering Vendor (Metro Foodservices Group).',
          'Services Rendered: Management of 12 licensed beverage stands, 4 hot-food stalls, and staff dining facilities during the active dates.',
          'Liability Caps: Vendor warrants that all ingredients comply with state sanitation codes. The Vendor assumes full responsibility for obtaining health permits.',
          'Pricing Scales: Standard menu rates are locked. Organizer receives a 12% royalty commission on gross food sales exceeding $20,000.',
          'Deposits & Payouts: A 30% advance deposit is payable upon approval, with remaining balances settled within 7 days of event completion.'
        ],
        stamp: 'WAITING REVIEW - AUDIT COPY'
      };
    }

    // Default to Artist Agreement / Talent Contract
    return {
      title: 'ARTIST PERFORMANCE RIDER & CONTRACT',
      authority: 'TALENT MANAGEMENT & ENGAGEMENT CO.',
      docId: 'ART-9902-PERF',
      paragraphs: [
        'This contract confirms the headline performance of "Neon Shimmers" at the upcoming event.',
        'Showtime: Sept 12, 2026 (21:00 - 23:00 local time).',
        'Technical Rider: Promoter shall provide 1x center-stage LED projection array, 4x wireless vocal microphones, and custom pyro control triggers.',
        'Logistics & Lodging: Promoter agrees to cover up to 5 standard hotel suites for the performing band and entourage.',
        'Exclusivity Term: Artist shall not perform any public show within a 60-mile radius of the venue for 30 days prior to the engagement date.'
      ],
      stamp: 'DRAFT CONTRACT - SIGNATURE READY'
    };
  };

  const content = getDocContent();

  return (
    <div className="space-y-6 text-left animate-fade-in font-sans">
      {/* Top Header / Breadcrumbs Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-subtle">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 border border-border-subtle bg-white hover:bg-surface-container-low text-text-secondary hover:text-text-primary rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold shadow-xs shrink-0"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[10px] text-text-secondary font-mono uppercase tracking-wider">
              <span>Auditor Console</span>
              <span>/</span>
              <span>Documents</span>
              <span>/</span>
              <span className="text-text-primary font-bold truncate max-w-[120px] sm:max-w-xs">{document.fileName}</span>
            </div>
            <h2 className="text-lg font-bold text-text-primary truncate mt-0.5">{document.fileName}</h2>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button className="p-2 border border-border-subtle bg-white hover:bg-surface-container-low text-text-secondary hover:text-text-primary rounded-lg transition-colors cursor-pointer" title="Download Original file">
            <Download className="w-4 h-4" />
          </button>
          <button className="p-2 border border-border-subtle bg-white hover:bg-surface-container-low text-text-secondary hover:text-text-primary rounded-lg transition-colors cursor-pointer" title="Print file">
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Grid View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Metadata Card & Controls */}
        <div className="lg:col-span-4 space-y-6">
          {/* Status & Actions Card */}
          <div className="bg-white border border-border-subtle rounded-xl p-5 soft-shadow space-y-5 text-left">
            <div>
              <p className="text-[10px] font-mono font-bold text-text-secondary uppercase">Current Audit Status</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className={`px-3 py-1 rounded-full font-mono text-[10px] font-bold border ${
                  document.status === 'VERIFIED' ? 'bg-success/10 text-success border-success/20' :
                  document.status === 'REJECTED' ? 'bg-danger/10 text-danger border-danger/20' :
                  'bg-warning/10 text-warning border-warning/20'
                }`}>
                  {document.status}
                </span>
              </div>
            </div>

            <div className="h-px bg-border-subtle" />

            {/* Document Properties */}
            <div className="space-y-3.5 text-xs">
              <div>
                <span className="text-[9px] font-mono text-text-secondary uppercase tracking-wider block">Category / Type</span>
                <span className="font-bold text-text-primary block mt-0.5">{document.category}</span>
              </div>
              <div>
                <span className="text-[9px] font-mono text-text-secondary uppercase tracking-wider block">Associated Event</span>
                <span className="font-medium text-text-primary block mt-0.5">{document.eventName}</span>
              </div>
              <div>
                <span className="text-[9px] font-mono text-text-secondary uppercase tracking-wider block">Uploaded By</span>
                <span className="font-medium text-text-primary block mt-0.5">{document.organizerName}</span>
              </div>
              <div>
                <span className="text-[9px] font-mono text-text-secondary uppercase tracking-wider block">Verification Scope</span>
                <span className="text-text-secondary block mt-0.5">Check spelling, dates, location parameters, and official seal registration.</span>
              </div>
            </div>

            <div className="h-px bg-border-subtle" />

            {/* Decision Controls */}
            <div className="space-y-2">
              {document.status !== 'VERIFIED' && document.status !== 'REJECTED' ? (
                <>
                  <button
                    onClick={onVerify}
                    className="w-full bg-success hover:bg-success/90 text-white font-bold py-2.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2 text-xs shadow-sm shadow-success/10"
                  >
                    <ShieldCheck className="w-4 h-4" /> Verify & Approve
                  </button>
                  <button
                    onClick={onReject}
                    className="w-full bg-danger hover:bg-danger/90 text-white font-bold py-2.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2 text-xs"
                  >
                    <AlertTriangle className="w-4 h-4" /> Reject Document
                  </button>
                </>
              ) : (
                <div className="bg-surface border border-border-subtle rounded-lg p-3.5 text-center text-xs text-text-secondary flex flex-col items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-text-secondary" />
                  <span>This document status is resolved and cannot be modified.</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Large Document Preview Paper Sheet */}
        <div className="lg:col-span-8 flex justify-center bg-surface-container-low border border-border-subtle rounded-xl p-4 sm:p-8 md:p-12 soft-shadow min-h-[700px]">
          {/* Simulated Printed Paper */}
          <div className="bg-white text-zinc-900 w-full max-w-[640px] shadow-lg p-8 sm:p-12 border border-zinc-200 rounded-sm relative font-serif leading-relaxed text-left min-h-[720px] flex flex-col justify-between">
            {/* Top Serial Stamp */}
            <div className="absolute top-6 right-6 border border-zinc-300 rounded px-2.5 py-0.5 text-[8px] font-mono uppercase tracking-widest text-zinc-400 font-bold select-none rotate-2">
              {content.docId}
            </div>

            <div className="space-y-6">
              {/* Document Logo & Header */}
              <div className="text-center space-y-2.5 pb-6 border-b-2 border-zinc-800">
                <span className="font-mono text-[9px] font-bold text-zinc-500 uppercase tracking-widest block leading-none">
                  {content.authority}
                </span>
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-zinc-950 font-serif leading-tight">
                  {content.title}
                </h1>
              </div>

              {/* Document Sections */}
              <div className="space-y-4 text-xs sm:text-sm text-zinc-800 pt-4 leading-relaxed">
                {content.paragraphs.map((p, idx) => (
                  <p key={idx} className="indent-6">
                    {p}
                  </p>
                ))}
              </div>
            </div>

            {/* Bottom Official Signatures and Seal */}
            <div className="pt-10 mt-10 border-t border-zinc-200 flex flex-col sm:flex-row justify-between items-end gap-6 text-zinc-650 text-xs select-none">
              <div className="space-y-1">
                <span className="font-mono text-[8px] font-bold text-zinc-400 uppercase tracking-wider block">ORGANIZER SIGNATURE</span>
                <p className="font-serif italic text-sm text-zinc-900 leading-none">Alex Rivera</p>
                <div className="w-28 h-px bg-zinc-300 mt-1"></div>
                <p className="font-mono text-[8px] text-zinc-400">Signed 2026-07-08</p>
              </div>

              {/* Watermark Seal */}
              <div className="w-14 h-14 rounded-full border border-zinc-200 flex items-center justify-center text-center font-mono text-[6px] text-zinc-300 font-bold uppercase p-1">
                AUSTIN COMPLIANCE
              </div>

              <div className="space-y-1 text-right">
                <span className="font-mono text-[8px] font-bold text-zinc-400 uppercase tracking-wider block">STATE AUDITOR SIGNATURE</span>
                <p className="font-serif italic text-sm text-zinc-900 leading-none">Priya Nair</p>
                <div className="w-28 h-px bg-zinc-300 mt-1 ml-auto"></div>
                <p className="font-mono text-[8px] text-zinc-400">Pending verification</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
