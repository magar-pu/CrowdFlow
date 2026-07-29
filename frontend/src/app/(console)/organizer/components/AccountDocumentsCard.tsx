/**
 * AccountDocumentsCard.tsx
 *
 * The organizer's account-level paperwork (KTP, NPWP, NIB, SIUP...), filed once
 * and reused across every event. Distinct from the per-event documents in the
 * event workspace.
 *
 * Until recently these could only be supplied through the application wizard, and
 * UpdateApplication refuses once an application is approved — so an organizer
 * whose NIB an auditor REJECTED had no way to file a corrected one. The
 * rejection was visible and unactionable.
 *
 * A replacement supersedes rather than overwrites: the auditor needs to see
 * that an earlier version was rejected, and it re-enters review because the
 * auditor verified the file that was there before, not this one. Remove is the
 * exception — it deletes outright, and only the current version, so review
 * history is never rewritten.
 *
 * The slots are `@/components/documents/DocumentSlot`, shared with the event
 * workspace's Documents tab. Filing paperwork is one task and now looks like it
 * from both directions: drag-and-drop, what each document is for, which file is
 * on record, and what the auditor said when they rejected it.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Check, FileText, IdCard, Receipt, ShieldCheck } from "lucide-react";
import DocumentSlot, {
  DocumentSlotSkeleton,
  type DocumentSlotFile,
  type DocumentSlotSpec,
} from "@/components/documents/DocumentSlot";
import {
  deleteAccountDocument,
  listAccountDocuments,
  uploadAccountDocument,
  getAccountDocumentURL,
  ACCOUNT_DOCUMENT_TYPES,
  ACCOUNT_DOCUMENT_LABELS,
  getAccountDocumentReadiness,
  type AccountDocumentReadiness,
  type OrganizerAccountDocument,
} from "@/lib/api/eorganizer";
import { ACCEPT, CRITERIA_SINGLE, validateDocument } from "@/lib/documentUpload";

/** What each document is and why it is being asked for. Mirrors the depth of the
 *  event workspace's slots — "NPWP (Tax ID)" alone told an organizer nothing
 *  about which of their several tax documents was wanted. Descriptions only;
 *  which types BLOCK event submission comes from the server. */
const SLOT_COPY: Record<
  string,
  { label: string; localName?: string; description: string; icon: DocumentSlotSpec["icon"] }
> = {
  KTP: {
    label: "Director's ID",
    localName: "KTP Direktur",
    description:
      "The national ID of the person who legally represents the business. Carries your NIK, so it is stored privately and only ever opened through a link that expires in minutes.",
    icon: IdCard,
  },
  NPWP: {
    label: "Tax ID",
    localName: "NPWP",
    description:
      "The company's taxpayer registration. Used to settle payouts correctly — it is not a personal NPWP unless you trade as an individual.",
    icon: Receipt,
  },
  NIB: {
    label: "Business Registration",
    localName: "NIB",
    description:
      "Your Nomor Induk Berusaha from OSS. This is what proves the business exists and may sell tickets.",
    icon: ShieldCheck,
  },
  SIUP: {
    label: "Trading Licence",
    localName: "SIUP",
    description:
      "Only where your business type still issues one. Newer entities registered through OSS will not have a separate SIUP.",
    icon: FileText,
  },
  BUSINESS_LICENSE: {
    label: "Business Licence",
    description:
      "Any further operating licence specific to your line of business. Attach it if an auditor has asked for one.",
    icon: FileText,
  },
};

/** The list payload and the slot render one shape. */
function toSlotFile(doc: OrganizerAccountDocument): DocumentSlotFile {
  return {
    id: doc.id,
    fileName: doc.file_name,
    fileSize: doc.file_size,
    uploadedAt: doc.uploaded_at,
    status: doc.status,
    reviewNotes: doc.review_notes,
  };
}

export default function AccountDocumentsCard() {
  const [docs, setDocs] = useState<OrganizerAccountDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyType, setBusyType] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Per-slot, so a failure on NIB does not sit above an untouched KTP. */
  const [slotError, setSlotError] = useState<Record<string, string | undefined>>({});
  const [readiness, setReadiness] = useState<AccountDocumentReadiness | null>(null);

  // No setState before the first await: this runs from an effect, and a
  // synchronous setState in an effect body triggers a cascading render (and the
  // repo's lint rejects it). `loading` already starts true, and refreshes after
  // an upload are covered by the per-row busy state.
  const load = useCallback(async () => {
    // Readiness comes from the server rather than being recomputed here: it is
    // the same check the publish gate runs, and a local copy of "which types are
    // required" would drift the moment the backend list changed.
    const [res, readinessRes] = await Promise.all([
      listAccountDocuments(),
      getAccountDocumentReadiness(),
    ]);
    if (res.success && res.data) {
      setDocs(res.data);
      setError(null);
    } else {
      setError(res.error?.message ?? "Failed to load documents");
    }
    setReadiness(readinessRes.success && readinessRes.data ? readinessRes.data : null);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleFile = async (documentType: string, file: File) => {
    setSlotError((prev) => ({ ...prev, [documentType]: undefined }));

    // Rejected here rather than after the upload. The card once claimed a 10MB
    // limit while checking nothing, so an oversized file was transferred in full
    // before the server refused it — the user waited out the whole upload to be
    // told no. Same rules as the /business wizard, from one module.
    const problem = validateDocument(file);
    if (problem) {
      setSlotError((prev) => ({ ...prev, [documentType]: problem }));
      return;
    }

    setBusyType(documentType);
    const res = await uploadAccountDocument(documentType, file);
    if (res.success) {
      await load();
    } else {
      setSlotError((prev) => ({
        ...prev,
        [documentType]: res.error?.message ?? "Upload failed. Please try again.",
      }));
    }
    setBusyType(null);
  };

  // Open the blank tab synchronously, BEFORE awaiting the signed URL — a popup
  // blocker rejects a window opened from an async continuation.
  //
  // No "noopener" in the feature string: window.open() returns NULL when it is
  // set, which defeats the whole point of opening early and silently downgrades
  // every view to a same-tab navigation. The opener reference is dropped on the
  // handle instead, which is the same protection with a usable return value.
  const handleView = async (documentType: string, doc: OrganizerAccountDocument) => {
    setSlotError((prev) => ({ ...prev, [documentType]: undefined }));
    const tab = window.open("", "_blank");
    if (tab) tab.opener = null;
    const res = await getAccountDocumentURL(doc.id);
    if (res.success && res.data?.url) {
      if (tab) {
        tab.location.assign(res.data.url);
      } else {
        // Popup blocked despite the synchronous open — fall back to this tab.
        window.location.assign(res.data.url);
      }
      return;
    }
    tab?.close();
    setSlotError((prev) => ({
      ...prev,
      [documentType]: res.error?.message ?? "Could not open that document.",
    }));
  };

  const handleDelete = async (documentType: string, doc: OrganizerAccountDocument) => {
    // Named in the prompt because these five slots look alike in a list, and the
    // consequence is spelled out for the types that gate submission: this is a
    // real delete, not the supersede that Replace performs.
    const gated = readiness?.required.includes(documentType) && !readiness.exempt;
    const consequence = gated
      ? " You will not be able to submit an event for review until you upload a replacement and an auditor verifies it."
      : "";
    if (!window.confirm(`Remove "${doc.file_name || SLOT_COPY[documentType]?.label || documentType}"?${consequence}`)) {
      return;
    }

    setBusyType(documentType);
    const res = await deleteAccountDocument(doc.id);
    if (res.success) {
      await load();
    } else {
      setSlotError((prev) => ({
        ...prev,
        [documentType]: res.error?.message ?? "Failed to remove the document.",
      }));
    }
    setBusyType(null);
  };

  const byType = new Map(docs.map((d) => [d.document_type, d]));

  return (
    <div className="rounded-xl border border-border-subtle bg-white p-5 shadow-sm space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border-subtle pb-3">
        <div className="space-y-1">
          <h3 className="flex items-center gap-2 text-base font-bold text-text-primary">
            <FileText className="h-4 w-4 text-secondary" />
            <span>Business Documents</span>
          </h3>
          <p className="text-xs text-text-secondary">
            Your company paperwork, reused for every event you organise. Files are stored
            privately; View creates a link that expires within a couple of minutes. Replacing a
            document sends it back for review and keeps the previous version on the record.
          </p>
          <p className="font-mono text-[10px] text-text-secondary">{CRITERIA_SINGLE}</p>
        </div>
        {!loading && readiness && !readiness.exempt && (
          readiness.ready ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-success/20 bg-success/10 px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-wide text-success">
              <Check className="h-3 w-3" /> All required documents verified
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning/10 px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-wide text-warning">
              <AlertTriangle className="h-3 w-3" />
              {readiness.missing.length} outstanding
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

      {/* Only shown while something is actually outstanding. A permanent
          "these are required" notice on a complete account is noise, and an
          exempt organizer is not being asked for anything. */}
      {readiness && !readiness.ready && !readiness.exempt && (
        <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-4 py-2">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
          <p className="text-xs font-semibold text-warning">
            You cannot submit an event for review until an auditor has verified these documents.
            Outstanding: {readiness.missing.join(", ")}.
          </p>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {ACCOUNT_DOCUMENT_TYPES.map((type) => (
            <DocumentSlotSkeleton key={type} />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {ACCOUNT_DOCUMENT_TYPES.map((type) => {
            const doc = byType.get(type);
            const copy = SLOT_COPY[type];
            const slot: DocumentSlotSpec = {
              type,
              label: copy?.label ?? ACCOUNT_DOCUMENT_LABELS[type] ?? type,
              localName: copy?.localName,
              description: copy?.description ?? "",
              icon: copy?.icon ?? FileText,
              // Which types block submission comes from the server, so this
              // marker cannot drift from the gate that enforces it.
              required: readiness?.required.includes(type) ?? false,
              requiredLabel: "Required to submit events",
            };

            return (
              <DocumentSlot
                key={type}
                idPrefix="account-doc"
                slot={slot}
                doc={doc ? toSlotFile(doc) : null}
                criteria={CRITERIA_SINGLE}
                accept={ACCEPT}
                busy={busyType === type}
                error={slotError[type]}
                onFile={(file) => handleFile(type, file)}
                onView={() => doc && handleView(type, doc)}
                onDelete={doc ? () => handleDelete(type, doc) : undefined}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
