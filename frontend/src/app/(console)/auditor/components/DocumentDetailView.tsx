"use client";

import React, { useEffect, useState } from 'react';
import {
  ArrowLeft, FileText, AlertTriangle, ShieldCheck, ShieldAlert,
  Download, RefreshCw, ExternalLink, Calendar,
} from 'lucide-react';
import { ReviewDocument } from '../types';

/**
 * How long a minted preview link stays usable. The backend signs document URLs
 * for 2 minutes (see auditor/service.go documentURLTTL), so the embedded
 * preview is refreshed a little before that to avoid a frame that silently
 * turns into an S3 "Request has expired" page while the auditor is reading it.
 */
const PREVIEW_REFRESH_MS = 100 * 1000;

type PreviewKind = 'pdf' | 'image' | 'unsupported';

/**
 * Documents are labelled by type ("PIC Identification"), not filename, so the
 * extension has to come from the stored object key.
 */
function previewKindFor(objectKey: string): PreviewKind {
  const ext = objectKey.split('?')[0].split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf') return 'pdf';
  if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) return 'image';
  return 'unsupported';
}

interface DocumentDetailViewProps {
  document: ReviewDocument;
  eventName: string;
  organizerName: string;
  /** Mints a fresh short-lived signed URL for this document. */
  onRequestUrl: (doc: ReviewDocument) => Promise<string | null>;
  onBack: () => void;
  onVerify: () => void;
  onReject: () => void;
}

export default function DocumentDetailView({
  document: doc,
  eventName,
  organizerName,
  onRequestUrl,
  onBack,
  onVerify,
  onReject,
}: DocumentDetailViewProps) {
  // A synthetic MISSING row has no id and no stored file — there is nothing to
  // preview and no URL to mint.
  const hasFile = doc.status !== 'MISSING' && !!doc.id;
  const kind = previewKindFor(doc.fileUrl ?? '');

  const [url, setUrl] = useState<string | null>(null);
  // Only a document that actually has a file starts in a loading state.
  const [loading, setLoading] = useState(hasFile);
  const [error, setError] = useState<string | null>(null);

  // Fetch + refresh. `cancelled` stops a slow response from overwriting a newer
  // one when the auditor switches documents mid-flight.
  // onRequestUrl is memoised by the parent, so it is a safe dependency.
  useEffect(() => {
    if (!hasFile) return;

    let cancelled = false;

    const load = async () => {
      const signed = await onRequestUrl(doc);
      if (cancelled) return;
      if (signed) {
        setUrl(signed);
        setError(null);
      } else {
        setError('Could not open this document. The link may have expired — try reloading the preview.');
      }
      setLoading(false);
    };

    load();

    // Keep the embedded preview alive past the signature TTL.
    const timer = kind === 'unsupported' ? undefined : setInterval(load, PREVIEW_REFRESH_MS);
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [doc, hasFile, kind, onRequestUrl]);

  // Manual reload from the toolbar. Safe to set state synchronously here —
  // this runs from an event handler, not an effect.
  const reload = async () => {
    if (!hasFile) return;
    setLoading(true);
    setError(null);
    const signed = await onRequestUrl(doc);
    if (signed) {
      setUrl(signed);
    } else {
      setError('Could not open this document. The link may have expired — try reloading the preview.');
    }
    setLoading(false);
  };

  const isResolved = doc.status === 'VERIFIED' || doc.status === 'REJECTED';

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
              <span className="text-text-primary font-bold truncate max-w-[120px] sm:max-w-xs">{doc.name}</span>
            </div>
            <h2 className="text-lg font-bold text-text-primary truncate mt-0.5">{doc.name}</h2>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={reload}
            disabled={!hasFile || loading}
            className="p-2 border border-border-subtle bg-white hover:bg-surface-container-low text-text-secondary hover:text-text-primary rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            title="Reload preview"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <a
            href={url ?? undefined}
            download
            aria-disabled={!url}
            className={`p-2 border border-border-subtle bg-white rounded-lg transition-colors flex items-center ${
              url
                ? 'hover:bg-surface-container-low text-text-secondary hover:text-text-primary cursor-pointer'
                : 'text-text-secondary/40 pointer-events-none'
            }`}
            title="Download original file"
          >
            <Download className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Main Grid View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Metadata Card & Controls */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-border-subtle rounded-xl p-5 soft-shadow space-y-5 text-left">
            <div>
              <p className="text-[10px] font-mono font-bold text-text-secondary uppercase">Current Audit Status</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className={`px-3 py-1 rounded-full font-mono text-[10px] font-bold border ${
                  doc.status === 'VERIFIED' ? 'bg-success/10 text-success border-success/20' :
                  doc.status === 'REJECTED' ? 'bg-danger/10 text-danger border-danger/20' :
                  doc.status === 'MISSING' ? 'bg-surface-container text-text-secondary border-border-subtle' :
                  'bg-warning/10 text-warning border-warning/20'
                }`}>
                  {doc.status}
                </span>
              </div>
            </div>

            <div className="h-px bg-border-subtle" />

            {/* Document Properties */}
            <div className="space-y-3.5 text-xs">
              <div>
                <span className="text-[9px] font-mono text-text-secondary uppercase tracking-wider block">Category / Type</span>
                <span className="font-bold text-text-primary block mt-0.5">{doc.category}</span>
              </div>
              <div>
                <span className="text-[9px] font-mono text-text-secondary uppercase tracking-wider block">Source</span>
                <span className="font-medium text-text-primary block mt-0.5">
                  {doc.source === 'event' ? 'Submitted for this event' : 'Organizer account document'}
                </span>
              </div>
              <div>
                <span className="text-[9px] font-mono text-text-secondary uppercase tracking-wider block">Associated Event</span>
                <span className="font-medium text-text-primary block mt-0.5">{eventName}</span>
              </div>
              <div>
                <span className="text-[9px] font-mono text-text-secondary uppercase tracking-wider block">Uploaded By</span>
                <span className="font-medium text-text-primary block mt-0.5">{organizerName}</span>
              </div>
              {doc.uploadDate && (
                <div>
                  <span className="text-[9px] font-mono text-text-secondary uppercase tracking-wider block">Uploaded</span>
                  <span className="font-medium text-text-primary block mt-0.5 flex items-center gap-1.5">
                    <Calendar className="w-3 h-3 text-on-surface-variant" /> {doc.uploadDate}
                  </span>
                </div>
              )}
              {doc.reviewNotes && (
                <div>
                  <span className="text-[9px] font-mono text-text-secondary uppercase tracking-wider block">Reviewer Notes</span>
                  <span className="text-text-secondary block mt-0.5">{doc.reviewNotes}</span>
                </div>
              )}
            </div>

            <div className="h-px bg-border-subtle" />

            {/* Decision Controls */}
            <div className="space-y-2">
              {!hasFile ? (
                <div className="bg-surface border border-border-subtle rounded-lg p-3.5 text-center text-xs text-text-secondary flex flex-col items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-text-secondary" />
                  <span>This document was never uploaded, so there is nothing to review yet.</span>
                </div>
              ) : !isResolved ? (
                <>
                  <button
                    onClick={onVerify}
                    className="w-full bg-success hover:bg-success/90 text-white font-bold py-2.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2 text-xs shadow-sm shadow-success/10"
                  >
                    <ShieldCheck className="w-4 h-4" /> Verify &amp; Approve
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

        {/* Right Side: the real uploaded file */}
        <div className="lg:col-span-8 bg-surface-container-low border border-border-subtle rounded-xl p-4 sm:p-6 soft-shadow min-h-[700px] flex items-center justify-center">
          {!hasFile ? (
            <EmptyPane
              icon={<FileText className="w-6 h-6" />}
              title="No file uploaded"
              detail="The organizer has not submitted this document yet."
            />
          ) : loading && !url ? (
            <EmptyPane
              icon={<RefreshCw className="w-6 h-6 animate-spin" />}
              title="Loading document…"
              detail="Minting a short-lived secure link."
            />
          ) : error ? (
            <EmptyPane
              icon={<AlertTriangle className="w-6 h-6 text-danger" />}
              title="Preview unavailable"
              detail={error}
              action={
                <button onClick={reload} className="mt-3 text-xs font-bold text-secondary hover:underline cursor-pointer">
                  Reload preview
                </button>
              }
            />
          ) : kind === 'pdf' && url ? (
            <iframe
              src={url}
              title={doc.name}
              className="w-full h-[720px] rounded-sm border border-zinc-200 bg-white"
            />
          ) : kind === 'image' && url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt={doc.name}
              className="max-w-full max-h-[720px] object-contain rounded-sm border border-zinc-200 bg-white"
            />
          ) : (
            <EmptyPane
              icon={<FileText className="w-6 h-6" />}
              title="Preview not supported for this file type"
              detail="Open it in a new tab to review the contents."
              action={
                url ? (
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-secondary hover:underline cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Open document
                  </a>
                ) : undefined
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyPane({
  icon,
  title,
  detail,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center text-center gap-2 max-w-sm">
      <span className="text-text-secondary">{icon}</span>
      <p className="text-sm font-bold text-text-primary">{title}</p>
      <p className="text-xs text-text-secondary">{detail}</p>
      {action}
    </div>
  );
}
