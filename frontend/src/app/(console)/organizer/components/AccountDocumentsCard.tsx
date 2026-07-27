"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FileText, Upload, ExternalLink, ShieldCheck, ShieldAlert, Clock } from "lucide-react";
import {
  listAccountDocuments,
  uploadAccountDocument,
  getAccountDocumentURL,
  ACCOUNT_DOCUMENT_TYPES,
  ACCOUNT_DOCUMENT_LABELS,
  type OrganizerAccountDocument,
} from "@/lib/api/eorganizer";

// The organizer's account-level paperwork (KTP, NPWP, NIB, SIUP...), filed once
// and reused across every event. Distinct from the per-event documents in the
// event workspace.
//
// Until now these could only be supplied through the application wizard, and
// UpdateApplication refuses once an application is approved — so an organizer
// whose NIB an auditor REJECTED had no way to file a corrected one. The
// rejection was visible and unactionable.
//
// A replacement supersedes rather than overwrites: the auditor needs to see
// that an earlier version was rejected, and it re-enters review because the
// auditor verified the file that was there before, not this one.

const STATUS_STYLE: Record<string, { label: string; cls: string; Icon: typeof ShieldCheck }> = {
  verified: {
    label: "Verified",
    cls: "border-success/20 bg-success/10 text-success",
    Icon: ShieldCheck,
  },
  rejected: {
    label: "Rejected — re-upload required",
    cls: "border-danger/20 bg-danger/10 text-danger",
    Icon: ShieldAlert,
  },
  pending_verification: {
    label: "Awaiting review",
    cls: "border-warning/30 bg-warning/10 text-warning",
    Icon: Clock,
  },
};

export default function AccountDocumentsCard() {
  const [docs, setDocs] = useState<OrganizerAccountDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyType, setBusyType] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // One hidden input per document type, so "Replace" opens the picker for the
  // row that was clicked rather than a shared input whose target must be
  // tracked separately.
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  // No setState before the first await: this runs from an effect, and a
  // synchronous setState in an effect body triggers a cascading render (and the
  // repo's lint rejects it). `loading` already starts true, and refreshes after
  // an upload are covered by the per-row busy state.
  const load = useCallback(async () => {
    const res = await listAccountDocuments();
    if (res.success && res.data) {
      setDocs(res.data);
      setError(null);
    } else {
      setError(res.error?.message ?? "Failed to load documents");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleFile = async (documentType: string, file: File | undefined) => {
    if (!file) return;
    setBusyType(documentType);
    setError(null);
    const res = await uploadAccountDocument(documentType, file);
    if (res.success) {
      await load();
    } else {
      setError(res.error?.message ?? `Failed to upload ${documentType}`);
    }
    setBusyType(null);
  };

  // Open the blank tab synchronously, BEFORE awaiting the signed URL — a popup
  // blocker rejects a window opened from an async continuation.
  const handleOpen = async (doc: OrganizerAccountDocument) => {
    const tab = window.open("", "_blank");
    const res = await getAccountDocumentURL(doc.id);
    if (res.success && res.data?.url) {
      if (tab) tab.location.href = res.data.url;
    } else {
      tab?.close();
      setError(res.error?.message ?? "Could not open that document");
    }
  };

  if (loading) {
    return <div className="h-64 animate-pulse rounded-xl bg-surface-container" />;
  }

  const byType = new Map(docs.map((d) => [d.document_type, d]));

  return (
    <div className="rounded-xl border border-border-subtle bg-white p-5 shadow-sm">
      <div className="border-b border-border-subtle pb-4">
        <h3 className="flex items-center gap-2 text-sm font-bold text-text-primary">
          <FileText className="h-4 w-4 text-secondary" />
          <span>Business Documents</span>
        </h3>
        <p className="mt-0.5 text-xs text-text-secondary">
          Your company paperwork, reused for every event you organise. Replacing a document sends it
          back for review.
        </p>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-danger/20 bg-danger/10 px-3 py-2.5 text-xs font-semibold text-danger">
          {error}
        </div>
      )}

      <ul className="mt-4 space-y-2">
        {ACCOUNT_DOCUMENT_TYPES.map((type) => {
          const doc = byType.get(type);
          const style = doc ? STATUS_STYLE[doc.status] : undefined;
          const busy = busyType === type;

          return (
            <li
              key={type}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border-subtle px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="text-xs font-semibold text-text-primary">
                  {ACCOUNT_DOCUMENT_LABELS[type] ?? type}
                </p>
                {doc && style ? (
                  <span
                    className={`mt-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${style.cls}`}
                  >
                    <style.Icon className="h-3 w-3" />
                    {style.label}
                  </span>
                ) : (
                  <span className="mt-1 inline-block text-[10px] italic text-text-secondary">
                    Not provided
                  </span>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                {doc && (
                  <button
                    onClick={() => handleOpen(doc)}
                    className="flex items-center gap-1 rounded-lg border border-border-subtle px-2.5 py-1.5 text-[10px] font-bold text-text-secondary transition-colors hover:bg-surface-container-low"
                  >
                    <ExternalLink className="h-3 w-3" /> View
                  </button>
                )}
                <button
                  onClick={() => inputs.current[type]?.click()}
                  disabled={busy}
                  className="flex items-center gap-1 rounded-lg bg-secondary px-2.5 py-1.5 text-[10px] font-bold text-white transition-colors hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Upload className="h-3 w-3" />
                  {busy ? "Uploading..." : doc ? "Replace" : "Upload"}
                </button>
                <input
                  ref={(el) => {
                    inputs.current[type] = el;
                  }}
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    handleFile(type, e.target.files?.[0]);
                    // Clear the value so picking the SAME file again still fires
                    // a change event.
                    e.target.value = "";
                  }}
                />
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-3 text-[10px] leading-relaxed text-text-secondary">
        PDF, PNG or JPG, up to 10MB each. Previous versions are kept so an auditor can see what
        changed.
      </p>
    </div>
  );
}
