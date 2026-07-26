/**
 * Workspace/WorkspaceDocuments.tsx
 *
 * Event Documents tab: the paperwork an auditor needs before this event can be
 * approved.
 *
 * These are per-EVENT documents, distinct from the account-level KTP/NPWP/NIB an
 * organizer submits once when applying to become one. Three of the four are
 * required, and the backend refuses to submit the event for review until they are
 * present (422 DOCUMENTS_INCOMPLETE).
 *
 * Every slot holds exactly one file. Re-uploading replaces it and resets the
 * auditor's review, so there is no separate edit action.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Check,
  Clock,
  Download,
  FileText,
  ShieldCheck,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  deleteEventDocument,
  getEventDocumentUrl,
  listEventDocuments,
  uploadEventDocument,
  type EventDocument,
  type EventDocumentType,
  type EventDocumentsResponse,
} from "@/lib/api/eorganizer";

interface WorkspaceDocumentsProps {
  eventId: number;
  /** Locks uploads once the event is with an auditor or already approved. */
  readOnly?: boolean;
}

interface SlotSpec {
  type: EventDocumentType;
  label: string;
  /** Indonesian name, where the document has one organizers will recognise. */
  localName?: string;
  description: string;
  icon: LucideIcon;
  required: boolean;
}

// Mirrors AllEventDocumentTypes in the backend. VENUE_PERMIT is optional there
// too: nothing in the schema can tell whether the organizer owns the venue.
const SLOTS: SlotSpec[] = [
  {
    type: "EVENT_PROPOSAL",
    label: "Event Proposal",
    localName: "Proposal Kegiatan",
    description:
      "The formal proposal — what the event is, when and where it runs, and expected headcount. This is the document auditors actually evaluate.",
    icon: FileText,
    required: true,
  },
  {
    type: "CROWD_PERMIT",
    label: "Crowd Permit",
    localName: "Izin Keramaian",
    description:
      "The police-issued public-event permit, or proof that you have applied for one.",
    icon: ShieldCheck,
    required: true,
  },
  {
    type: "PIC_ID",
    label: "PIC Identification",
    localName: "KTP Penanggung Jawab",
    description:
      "ID of the person responsible for this specific event. Stored privately and only reachable through short-lived links.",
    icon: FileText,
    required: true,
  },
  {
    type: "VENUE_PERMIT",
    label: "Venue Usage Permit",
    localName: "Izin Penggunaan Tempat",
    description:
      "Written permission from the venue owner. Only needed when you do not own the venue yourself.",
    icon: FileText,
    required: false,
  },
];

const ACCEPT = ".pdf,.png,.jpg,.jpeg,.webp";
const MAX_BYTES = 10 * 1024 * 1024;

// Stated once at the top of the tab and reused in the per-slot hint and the
// size error, so the three can't drift apart. Derived from MAX_BYTES for the
// same reason. PDF leads the list because permits and proposals are usually
// multi-page scans.
const MAX_MB = MAX_BYTES / (1024 * 1024);
const CRITERIA = `PDF, PNG, JPG/JPEG, or WebP · up to ${MAX_MB}MB per file`;

function formatSize(bytes: number): string {
  if (bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

function StatusChip({ status }: { status: EventDocument["status"] }) {
  const styles = {
    verified: {
      cls: "border-success/20 bg-success/10 text-success",
      icon: Check,
      label: "Verified",
    },
    rejected: {
      cls: "border-rose-500/30 bg-rose-500/10 text-rose-700",
      icon: XCircle,
      label: "Rejected",
    },
    pending_verification: {
      cls: "border-amber-500/30 bg-amber-500/10 text-amber-700",
      icon: Clock,
      label: "Awaiting review",
    },
  }[status];

  const Icon = styles.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-wide ${styles.cls}`}
    >
      <Icon className="h-3 w-3" /> {styles.label}
    </span>
  );
}

export default function WorkspaceDocuments({ eventId, readOnly = false }: WorkspaceDocumentsProps) {
  const [data, setData] = useState<EventDocumentsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** Which slot is mid-upload, so only that card shows a spinner. */
  const [busyType, setBusyType] = useState<EventDocumentType | null>(null);
  const [slotError, setSlotError] = useState<Partial<Record<EventDocumentType, string>>>({});
  const [dragType, setDragType] = useState<EventDocumentType | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await listEventDocuments(eventId);
    if (res.success && res.data) {
      setData(res.data);
    } else {
      setError(res.error?.message ?? "Failed to load documents");
    }
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleFile = async (type: EventDocumentType, file: File) => {
    setSlotError((prev) => ({ ...prev, [type]: undefined }));

    // Checked here as well as server-side purely to save the user a 10MB round
    // trip; the backend rejects it either way.
    if (file.size > MAX_BYTES) {
      setSlotError((prev) => ({ ...prev, [type]: `File exceeds the ${MAX_MB}MB limit.` }));
      return;
    }

    setBusyType(type);
    const res = await uploadEventDocument(eventId, type, file);
    setBusyType(null);

    if (!res.success) {
      setSlotError((prev) => ({
        ...prev,
        [type]: res.error?.message ?? "Upload failed. Please try again.",
      }));
      return;
    }
    // Refetch rather than splicing the response in: the server also recomputes
    // `missing`/`complete`, which drive the banner above.
    await load();
  };

  /**
   * Fetches a view link and follows it.
   *
   * The tab is opened synchronously, BEFORE awaiting, because a window.open()
   * that happens after an await is no longer attributable to the click and gets
   * blocked as a popup. The blank tab is then pointed at the signed URL, or
   * closed if minting failed.
   */
  const handleView = async (type: EventDocumentType, doc: EventDocument) => {
    setSlotError((prev) => ({ ...prev, [type]: undefined }));
    const tab = window.open("", "_blank", "noopener,noreferrer");

    const res = await getEventDocumentUrl(eventId, doc.id);

    if (!res.success || !res.data) {
      tab?.close();
      setSlotError((prev) => ({
        ...prev,
        [type]: res.error?.message ?? "Could not open this document.",
      }));
      return;
    }

    if (tab) {
      tab.location.assign(res.data.url);
    } else {
      // Popup blocked despite the synchronous open — fall back to this tab.
      window.location.assign(res.data.url);
    }
  };

  const handleDelete = async (type: EventDocumentType, doc: EventDocument) => {
    if (!window.confirm(`Remove "${doc.file_name}"? You will need to upload it again before this event can be submitted.`)) {
      return;
    }
    setBusyType(type);
    const res = await deleteEventDocument(eventId, doc.id);
    setBusyType(null);
    if (!res.success) {
      setSlotError((prev) => ({
        ...prev,
        [type]: res.error?.message ?? "Failed to remove the document.",
      }));
      return;
    }
    await load();
  };

  const byType = new Map<string, EventDocument>();
  for (const doc of data?.documents ?? []) {
    byType.set(doc.document_type, doc);
  }

  const missingCount = data?.missing.length ?? 0;

  return (
    <div className="space-y-4 text-left animate-fade-in">
      <div className="rounded-xl border border-border-subtle bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border-subtle pb-3">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-text-primary">Documents</h3>
            <p className="text-xs text-text-secondary">
              Paperwork an auditor needs before this event can be approved. Files are stored
              privately; View creates a link that expires within a couple of minutes.
            </p>
            {/* Always on screen, including once every slot is filled — the
                rules matter just as much when replacing a rejected file. */}
            <p className="font-mono text-[10px] text-text-secondary">{CRITERIA}</p>
          </div>
          {!loading && data && (
            data.complete ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-success/20 bg-success/10 px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-wide text-success">
                <Check className="h-3 w-3" /> All required documents in
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-wide text-amber-700">
                <AlertTriangle className="h-3 w-3" />
                {missingCount} required outstanding
              </span>
            )
          )}
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-danger/20 bg-danger/10 px-4 py-2"
          >
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-danger" />
            <p className="text-xs font-semibold text-danger">{error}</p>
          </div>
        )}

        {readOnly && (
          <div className="rounded-lg border border-border-subtle bg-surface-container-low px-4 py-2">
            <p className="text-xs font-semibold text-text-secondary">
              This event is with an auditor. Documents are locked until it comes back to you.
            </p>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {SLOTS.map((slot) => (
              <div
                key={slot.type}
                className="h-28 animate-pulse rounded-lg bg-surface-container-low"
              />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {SLOTS.map((slot) => {
              const doc = byType.get(slot.type);
              const Icon = slot.icon;
              const busy = busyType === slot.type;
              const err = slotError[slot.type];
              const dragging = dragType === slot.type;

              return (
                <div
                  key={slot.type}
                  onDragOver={(e) => {
                    if (readOnly) return;
                    e.preventDefault();
                    setDragType(slot.type);
                  }}
                  onDragLeave={() => setDragType(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragType(null);
                    if (readOnly) return;
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleFile(slot.type, file);
                  }}
                  className={`rounded-lg border p-4 transition-colors ${
                    dragging
                      ? "border-secondary bg-secondary/5"
                      : doc
                        ? "border-border-subtle bg-white"
                        : "border-dashed border-border-subtle bg-surface-container-low"
                  }`}
                >
                  {/* items-center so the action group sits centred against the
                      card's full height rather than pinned to the top — the
                      description block is what sets that height, and it varies
                      per slot. */}
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-start gap-3">
                      <Icon
                        className={`mt-0.5 h-4 w-4 shrink-0 ${doc ? "text-secondary" : "text-on-surface-variant"}`}
                      />
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-xs font-bold text-text-primary">{slot.label}</p>
                          {slot.localName && (
                            <span className="text-[10px] italic text-text-secondary">
                              {slot.localName}
                            </span>
                          )}
                          <span
                            className={`rounded px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase ${
                              slot.required
                                ? "bg-surface-container text-text-secondary"
                                : "bg-surface-container text-on-surface-variant"
                            }`}
                          >
                            {slot.required ? "Required" : "If applicable"}
                          </span>
                          {doc && <StatusChip status={doc.status} />}
                        </div>

                        <p className="max-w-prose text-[11px] leading-snug text-text-secondary">
                          {slot.description}
                        </p>

                        {doc ? (
                          <p className="text-[11px] text-text-secondary">
                            <span className="font-semibold text-text-primary">{doc.file_name}</span>
                            {" · "}
                            {formatSize(doc.file_size)}
                            {" · uploaded "}
                            {formatDate(doc.uploaded_at)}
                          </p>
                        ) : (
                          <p className="text-[11px] text-text-secondary">
                            No file yet — {CRITERIA}. Drag one here or browse.
                          </p>
                        )}

                        {doc?.status === "rejected" && (
                          <div className="mt-1 rounded-md border border-rose-500/20 bg-rose-500/5 px-2.5 py-1.5">
                            <p className="text-[11px] font-semibold text-rose-700">
                              {doc.review_notes
                                ? `Auditor: ${doc.review_notes}`
                                : "The auditor rejected this document. Upload a replacement."}
                            </p>
                          </div>
                        )}

                        {err && (
                          <p role="alert" className="text-[11px] font-semibold text-danger">
                            {err}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      {doc && (
                        <button
                          type="button"
                          onClick={() => handleView(slot.type, doc)}
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border-subtle bg-white px-3 text-xs font-bold text-text-primary transition-colors hover:bg-surface-container"
                        >
                          <Download className="h-3.5 w-3.5" /> View
                        </button>
                      )}

                      <input
                        type="file"
                        accept={ACCEPT}
                        className="sr-only"
                        id={`doc-upload-${slot.type}`}
                        disabled={readOnly || busy}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFile(slot.type, file);
                          // Reset so picking the SAME file again still fires onChange.
                          e.target.value = "";
                        }}
                      />
                      <label
                        htmlFor={`doc-upload-${slot.type}`}
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

                      {doc && !readOnly && (
                        <button
                          type="button"
                          onClick={() => handleDelete(slot.type, doc)}
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
            })}
          </div>
        )}
      </div>
    </div>
  );
}
