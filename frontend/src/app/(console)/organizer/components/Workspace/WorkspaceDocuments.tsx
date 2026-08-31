/**
 * Workspace/WorkspaceDocuments.tsx
 *
 * Event Documents tab: the paperwork an auditor needs before this event can be
 * approved.
 *
 * These are per-EVENT documents, distinct from the account-level KTP/NPWP/NIB an
 * organizer files once in Settings → Business Documents. Three of the four are
 * required, and the backend refuses to submit the event for review until they are
 * present (422 DOCUMENTS_INCOMPLETE).
 *
 * Every slot holds exactly one file. Re-uploading replaces it and resets the
 * auditor's review, so there is no separate edit action.
 *
 * The slot itself is `@/components/documents/DocumentSlot`, shared with the
 * Business Documents card — the two surfaces are the same task and had drifted
 * into two different answers. What stays here is this tab's data: which slots
 * exist, and the event-scoped endpoints behind them.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Check, FileText, ShieldCheck } from "lucide-react";
import DocumentSlot, {
  DocumentSlotSkeleton,
  type DocumentSlotFile,
  type DocumentSlotSpec,
} from "@/components/documents/DocumentSlot";
import { ACCEPT, compressImageIfNeeded, criteriaSingleForType, validateDocument } from "@/lib/documentUpload";
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

// Mirrors AllEventDocumentTypes in the backend. VENUE_PERMIT is optional there
// too: nothing in the schema can tell whether the organizer owns the venue.
const SLOTS: DocumentSlotSpec[] = [
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

/** Both document tables carry the same fields; the slot renders one shape. */
function toSlotFile(doc: EventDocument): DocumentSlotFile {
  return {
    id: doc.id,
    fileName: doc.file_name,
    fileSize: doc.file_size,
    uploadedAt: doc.uploaded_at,
    status: doc.status,
    reviewNotes: doc.review_notes,
  };
}

export default function WorkspaceDocuments({ eventId, readOnly = false }: WorkspaceDocumentsProps) {
  const [data, setData] = useState<EventDocumentsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** Which slot is mid-upload, so only that card shows a spinner. */
  const [busyType, setBusyType] = useState<string | null>(null);
  const [slotError, setSlotError] = useState<Record<string, string | undefined>>({});

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

  const handleFile = async (type: string, pickedFile: File) => {
    setSlotError((prev) => ({ ...prev, [type]: undefined }));

    // Shrink phone-photo-sized images before the size check, so a 4MB photo
    // succeeds silently instead of being rejected and handed back to the
    // user to compress by hand. PDFs pass through untouched.
    const file = await compressImageIfNeeded(pickedFile);

    // Checked here as well as server-side purely to save the user a round
    // trip; the backend rejects it either way. Same rules as every other
    // document surface, from one module.
    const problem = validateDocument(file, type);
    if (problem) {
      setSlotError((prev) => ({ ...prev, [type]: problem }));
      return;
    }

    setBusyType(type);
    const res = await uploadEventDocument(eventId, type as EventDocumentType, file);
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
   *
   * "noopener" is deliberately NOT in the feature string: window.open() returns
   * NULL whenever it is set, so this tab handle was always null and every View
   * quietly navigated the console away instead of opening a tab. Dropping
   * `opener` on the handle gives the same protection and still returns a window.
   */
  const handleView = async (type: string, doc: EventDocument) => {
    setSlotError((prev) => ({ ...prev, [type]: undefined }));
    const tab = window.open("", "_blank");
    if (tab) tab.opener = null;

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

  const handleDelete = async (type: string, doc: EventDocument) => {
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
                rules matter just as much when replacing a rejected file.
                The per-file limit differs by document (2-10MB), so it's
                shown on each slot below rather than as one number here. */}
            <p className="font-mono text-[10px] text-text-secondary">PDF, PNG, JPG/JPEG, or WebP — limit shown per document below</p>
          </div>
          {!loading && data && (
            data.complete ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-success/20 bg-success/10 px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-wide text-success">
                <Check className="h-3 w-3" /> All required documents in
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning/10 px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-wide text-warning">
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
              <DocumentSlotSkeleton key={slot.type} />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {SLOTS.map((slot) => {
              const doc = byType.get(slot.type);
              return (
                <DocumentSlot
                  key={slot.type}
                  idPrefix="event-doc"
                  slot={slot}
                  doc={doc ? toSlotFile(doc) : null}
                  criteria={criteriaSingleForType(slot.type)}
                  accept={ACCEPT}
                  busy={busyType === slot.type}
                  readOnly={readOnly}
                  error={slotError[slot.type]}
                  onFile={(file) => handleFile(slot.type, file)}
                  onView={() => doc && handleView(slot.type, doc)}
                  onDelete={doc ? () => handleDelete(slot.type, doc) : undefined}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
