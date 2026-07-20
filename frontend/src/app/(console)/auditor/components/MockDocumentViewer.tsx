"use client";

import React from 'react';
import { X, FileText, CheckCircle2, AlertTriangle, ShieldCheck, Download, Printer } from 'lucide-react';

interface MockDocumentViewerProps {
  fileName: string;
  category: string;
  status: string;
  onClose: () => void;
  onVerify?: () => void;
  onReject?: () => void;
}

export default function MockDocumentViewer({
  fileName,
  category,
  status,
  onClose,
  onVerify,
  onReject
}: MockDocumentViewerProps) {
  // Determine realistic mock content based on the filename
  const getDocContent = () => {
    const nameLower = fileName.toLowerCase();
    
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
    <div className="fixed inset-y-0 right-0 left-0 lg:left-[280px] z-50 flex items-center justify-center bg-black/5 p-4 animate-fade-in font-sans transition-all duration-300">
      {/* Backdrop Exit */}
      <div className="absolute inset-0" onClick={onClose} />
      
      <div className="relative z-10 bg-surface-white rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-overlay border border-border-subtle text-text-primary overflow-hidden animate-fade-in">
        {/* Document Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-surface">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-secondary/5 border border-secondary/10 text-secondary rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h3 className="text-sm font-bold text-text-primary truncate max-w-[240px] sm:max-w-md">{fileName}</h3>
              <p className="text-[10px] text-text-secondary font-mono leading-none mt-1">{category}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="p-2 text-text-secondary hover:text-text-primary hover:bg-surface rounded-lg transition-colors cursor-pointer" title="Download Document">
              <Download className="w-4 h-4" />
            </button>
            <button className="p-2 text-text-secondary hover:text-text-primary hover:bg-surface rounded-lg transition-colors cursor-pointer" title="Print Document">
              <Printer className="w-4 h-4" />
            </button>
            <div className="w-px h-6 bg-border-subtle mx-1"></div>
            <button onClick={onClose} className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-surface rounded-lg transition-colors cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Document Content Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          {/* Legal Document Title & Seal Info */}
          <div className="text-center pb-6 border-b border-border-subtle space-y-2 relative">
            <span className="font-mono text-[9px] font-bold text-text-secondary uppercase tracking-widest block leading-none">
              {content.authority}
            </span>
            <h2 className="text-lg font-serif font-bold text-text-primary tracking-tight">
              {content.title}
            </h2>
            <span className="inline-block border border-border-subtle rounded-full px-2.5 py-0.5 text-[9px] font-mono text-text-secondary bg-surface leading-none">
              Document ID: {content.docId}
            </span>
          </div>

          {/* Legal Text Paragraphs */}
          <div className="space-y-4 text-xs md:text-sm text-text-primary leading-relaxed font-serif text-left">
            {content.paragraphs.map((p, idx) => (
              <p key={idx} className="indent-6 leading-relaxed">
                {p}
              </p>
            ))}
          </div>

          {/* Signature Blocks */}
          <div className="pt-8 mt-8 border-t border-border-subtle flex flex-col sm:flex-row justify-between items-end gap-6 text-text-secondary text-xs select-none text-left">
            <div className="space-y-1">
              <span className="font-mono text-[8px] font-bold text-text-secondary uppercase tracking-wider block">ORGANIZER SIGNATURE</span>
              <p className="font-serif italic text-sm text-text-primary">Alex Rivera</p>
              <div className="w-32 h-px bg-border-subtle"></div>
              <p className="font-mono text-[8px] text-text-secondary">Signed 2026-07-08</p>
            </div>

            <div className="w-16 h-16 rounded-full border border-dashed border-border-subtle flex items-center justify-center text-center font-mono text-[7px] text-border-subtle font-bold uppercase p-1">
              AUSTIN COMPLIANCE
            </div>

            <div className="space-y-1 text-right">
              <span className="font-mono text-[8px] font-bold text-text-secondary uppercase tracking-wider block">STATE AUDITOR SIGNATURE</span>
              <p className="font-serif italic text-sm text-text-primary">Priya Nair</p>
              <div className="w-32 h-px bg-border-subtle ml-auto"></div>
              <p className="font-mono text-[8px] text-text-secondary">Pending Verification</p>
            </div>
          </div>
        </div>

        {/* Action Decision Footer */}
        <div className="px-6 py-4 border-t border-border-subtle bg-surface flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between text-xs shrink-0">
          <div className="flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto">
            <span className="text-[10px] text-text-secondary font-mono">STATUS:</span>
            <span className={`px-2.5 py-0.5 rounded-full font-mono text-[9px] font-bold ${
              status === 'VERIFIED' ? 'bg-success/10 text-success border border-success/20' :
              status === 'REJECTED' ? 'bg-danger/10 text-danger border border-danger/20' :
              'bg-warning/10 text-warning border border-warning/20'
            }`}>
              {status}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            {onVerify && onReject && (status !== 'VERIFIED' && status !== 'REJECTED') ? (
              <>
                <button
                  onClick={() => { onReject(); onClose(); }}
                  className="bg-danger hover:bg-danger/90 text-white font-bold px-4 py-2.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 min-h-10 text-xs w-full sm:w-auto"
                >
                  <AlertTriangle className="w-4 h-4 shrink-0" /> Reject Document
                </button>
                <button
                  onClick={() => { onVerify(); onClose(); }}
                  className="bg-success hover:bg-success/90 text-white font-bold px-4 py-2.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 min-h-10 text-xs shadow-sm w-full sm:w-auto"
                >
                  <ShieldCheck className="w-4 h-4 shrink-0" /> Verify & Approve
                </button>
              </>
            ) : (
              <button
                onClick={onClose}
                className="bg-primary hover:bg-primary/90 text-white font-bold px-5 py-2.5 rounded-lg transition-colors cursor-pointer min-h-10 text-xs w-full sm:w-auto text-center"
              >
                Close Viewer
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
