/**
 * DocumentSlot — one uploadable paperwork slot.
 *
 * CrowdFlow collects documents in two places that are the same task from the
 * organizer's side: the per-EVENT Documents tab in the event workspace, and the
 * account-level Business Documents card in organizer Settings (KTP/NPWP/NIB —
 * filed once, reused across every event). They were built months apart and
 * looked it: the event tab had drag-and-drop, per-slot descriptions, the
 * filename and size on file, and the auditor's rejection reason, while the
 * settings card was a bare list of labels and status pills. Same job, two
 * answers.
 *
 * This is that job, once. It is presentational: it owns only the drag-hover
 * state, and every fetch, upload and refetch stays in the feature component
 * that renders it.
 *
 * Sizing is by CONTAINER query, not viewport. The event tab is full-width and
 * the settings card sits in a narrow column on the same large screen, so a
 * `md:` breakpoint would put the actions beside the description in a 420px
 * column and squeeze both. `@container` makes the slot respond to the width it
 * is actually given.
 */

"use client";

import { useState } from "react";
import { Check, Clock, Download, Trash2, Upload, XCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { formatSize } from "@/lib/documentUpload";

/** A slot the organizer can fill, independent of whether they have. */
export interface DocumentSlotSpec {
  /** Backend document_type key. Also namespaces the file input's id. */
  type: string;
  label: string;
  /** Indonesian name, where the document has one organizers will recognise. */
  localName?: string;
  description: string;
  icon: LucideIcon;
  required: boolean;
  /**
   * Overrides the "Required" chip text. Account documents are required to
   * SUBMIT AN EVENT rather than to save anything here, and a bare "Required" on
   * a settings card implies a form that will not submit without it.
   */
  requiredLabel?: string;
}

/**
 * A filed document, normalised across the two backend shapes.
 *
 * `event_documents` and `organizer_documents` are separate tables with
 * overlapping SERIAL ids, so an id alone never identifies a document — the
 * caller pairs it with the right endpoint in its own handlers.
 */
export interface DocumentSlotFile {
  id: number;
  fileName: string;
  /** 0 means unknown, not empty: account rows filed before migration 0031 have
   *  no recorded size. The size is omitted rather than shown as "0 B". */
  fileSize: number;
  uploadedAt: string;
  status: "pending_verification" | "verified" | "rejected";
  /** The auditor's reason, shown only on a rejection. */
  reviewNotes?: string | null;
}

interface DocumentSlotProps {
  slot: DocumentSlotSpec;
  doc?: DocumentSlotFile | null;
  /** Accepted formats and size cap, stated in the panel and repeated in the
   *  empty slot so the rules are visible at the moment of choosing a file. */
  criteria: string;
  accept: string;
  busy?: boolean;
  readOnly?: boolean;
  error?: string | null;
  onFile: (file: File) => void;
  onView: () => void;
  /** Omit to hide Remove entirely — not every surface can delete. */
  onDelete?: () => void;
  /** Namespaces the input id, so two panels on one page cannot collide. */
  idPrefix: string;
}

const STATUS_STYLE = {
  verified: {
    cls: "border-success/20 bg-success/10 text-success",
    icon: Check,
    label: "Verified",
  },
  rejected: {
    cls: "border-danger/20 bg-danger/10 text-danger",
    icon: XCircle,
    label: "Rejected",
  },
  pending_verification: {
    cls: "border-warning/30 bg-warning/10 text-warning",
    icon: Clock,
    label: "Awaiting review",
  },
} as const;

export function DocumentStatusChip({ status }: { status: DocumentSlotFile["status"] }) {
  const style = STATUS_STYLE[status];
  const Icon = style.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-wide ${style.cls}`}
    >
      <Icon className="h-3 w-3" /> {style.label}
    </span>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Matches a filled slot's height closely enough that the list does not jump
 *  when it resolves. */
export function DocumentSlotSkeleton() {
  return <div className="h-28 animate-pulse rounded-lg bg-surface-container-low" />;
}

export default function DocumentSlot({
  slot,
  doc,
  criteria,
  accept,
  busy = false,
  readOnly = false,
  error,
  onFile,
  onView,
  onDelete,
  idPrefix,
}: DocumentSlotProps) {
  const [dragging, setDragging] = useState(false);
  const Icon = slot.icon;
  const inputId = `${idPrefix}-${slot.type}`;

  return (
    <div
      onDragOver={(e) => {
        if (readOnly) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (readOnly) return;
        const file = e.dataTransfer.files?.[0];
        if (file) onFile(file);
      }}
      className={`@container rounded-lg border p-4 transition-colors ${
        dragging
          ? "border-secondary bg-secondary/5"
          : doc
            ? "border-border-subtle bg-white"
            : "border-dashed border-border-subtle bg-surface-container-low"
      }`}
    >
      {/* items-center so the action group sits centred against the slot's full
          height rather than pinned to the top — the description block is what
          sets that height, and it varies per slot. */}
      <div className="flex flex-col gap-3 @md:flex-row @md:items-center @md:justify-between">
        <div className="flex items-start gap-3">
          <Icon
            className={`mt-0.5 h-4 w-4 shrink-0 ${doc ? "text-secondary" : "text-on-surface-variant"}`}
          />
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-bold text-text-primary">{slot.label}</p>
              {slot.localName && (
                <span className="text-[10px] italic text-text-secondary">{slot.localName}</span>
              )}
              <span
                className={`rounded px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase ${
                  slot.required
                    ? "bg-surface-container text-text-secondary"
                    : "bg-surface-container text-on-surface-variant"
                }`}
              >
                {slot.required ? (slot.requiredLabel ?? "Required") : "If applicable"}
              </span>
              {doc && <DocumentStatusChip status={doc.status} />}
            </div>

            <p className="max-w-prose text-[11px] leading-snug text-text-secondary">
              {slot.description}
            </p>

            {doc ? (
              <p className="text-[11px] break-words text-text-secondary">
                <span className="font-semibold text-text-primary">{doc.fileName || "Document"}</span>
                {doc.fileSize > 0 && <>{" · "}{formatSize(doc.fileSize)}</>}
                {" · uploaded "}
                {formatDate(doc.uploadedAt)}
              </p>
            ) : (
              <p className="text-[11px] text-text-secondary">
                No file yet — {criteria}. Drag one here or browse.
              </p>
            )}

            {doc?.status === "rejected" && (
              <div className="mt-1 rounded-md border border-danger/20 bg-danger/5 px-2.5 py-1.5">
                <p className="text-[11px] font-semibold text-danger">
                  {doc.reviewNotes
                    ? `Auditor: ${doc.reviewNotes}`
                    : "The auditor rejected this document. Upload a replacement."}
                </p>
              </div>
            )}

            {error && (
              <p role="alert" className="text-[11px] font-semibold text-danger">
                {error}
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {doc && (
            <button
              type="button"
              onClick={onView}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border-subtle bg-white px-3 text-xs font-bold text-text-primary transition-colors hover:bg-surface-container"
            >
              <Download className="h-3.5 w-3.5" /> View
            </button>
          )}

          <input
            type="file"
            accept={accept}
            className="sr-only"
            id={inputId}
            disabled={readOnly || busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onFile(file);
              // Reset so picking the SAME file again still fires onChange.
              e.target.value = "";
            }}
          />
          <label
            htmlFor={inputId}
            aria-disabled={readOnly || busy}
            className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-bold shadow-sm transition-colors ${
              readOnly || busy
                ? "cursor-not-allowed bg-primary/50 text-on-primary"
                : "cursor-pointer bg-primary text-on-primary hover:bg-primary/90"
            }`}
          >
            <Upload className="h-3.5 w-3.5" />
            {busy ? "Working…" : doc ? "Replace" : "Upload"}
          </label>

          {doc && onDelete && !readOnly && (
            <button
              type="button"
              onClick={onDelete}
              disabled={busy}
              aria-label={`Remove ${slot.label}`}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border-subtle bg-white text-text-secondary transition-colors hover:border-danger/30 hover:text-danger disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
