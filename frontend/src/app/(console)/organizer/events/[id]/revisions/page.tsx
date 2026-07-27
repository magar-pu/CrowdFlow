"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import EventWorkspaceShell from "../../../components/EventWorkspaceShell";
import { useOrganizerData } from "../../../OrganizerDataContext";
import { getEventRevisions, publishOrganizerEvent, respondToEventRevision, EventRevisionFeedback } from "@/lib/api/eorganizer";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  Send,
  Upload,
  UserCheck,
  X,
  ShieldAlert,
  ChevronRight,
  RefreshCw,
  Save,
  MessageSquare,
  Sparkles,
  FileCheck,
  Edit3,
  ArrowRight
} from "lucide-react";

export default function OrganizerEventRevisionsPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const revIdParam = searchParams.get("revId");
  const eventIdNum = Number(params.id);

  const { fetchData } = useOrganizerData();

  const [feedback, setFeedback] = useState<EventRevisionFeedback | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // EO Active Item Selection State
  // The organizer picks which revision point to work on; the response form only
  // appears once a point has been selected.
  const [selectedRevisionId, setSelectedRevisionId] = useState<number | null>(
    revIdParam ? Number(revIdParam) : null
  );

  useEffect(() => {
    if (revIdParam) {
      setSelectedRevisionId(Number(revIdParam));
    }
  }, [revIdParam]);

  // Per-item Response State
  const [itemComments, setItemComments] = useState<Record<number, string>>({});
  const [itemActions, setItemActions] = useState<Record<number, string>>({});
  const [itemFiles, setItemFiles] = useState<Record<number, File | null>>({});

  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getEventRevisions(eventIdNum);
      if (res.success && res.data) {
        setFeedback(res.data);
      }
    } catch (err) {
      console.error("Failed to load revisions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [eventIdNum]);

  const handleFileSelect = (revId: number, file: File | null) => {
    setItemFiles((prev) => ({ ...prev, [revId]: file }));
  };

  const handleSendItemRevision = async (revId: number) => {
    setIsSubmitting(true);
    try {
      const comment = itemComments[revId] || "The requested fix has been applied as instructed by the auditor.";
      const actionTaken = itemActions[revId] || "Uploaded the supporting file and updated the related information.";
      const proofFile = itemFiles[revId] ? itemFiles[revId]?.name : undefined;

      const res = await respondToEventRevision(eventIdNum, revId, comment, actionTaken, proofFile);
      if (res.success) {
        setToast({
          message: "Your revision was sent back to the auditor.",
          type: "success"
        });
        setSelectedRevisionId(null);
        await fetchData();
        await loadData();
      } else {
        setToast({
          message: "Failed to send revision: " + (res.error?.message || "A server error occurred"),
          type: "error"
        });
      }
    } catch (err) {
      setToast({ message: "Something went wrong while sending the revision to the auditor.", type: "error" });
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setToast(null), 4000);
    }
  };

  const revisionsList = feedback?.revisions || [];
  const activeRevisions = revisionsList.filter(r => r.status !== 'Resolved');
  const stats = {
    total: revisionsList.length,
    open: revisionsList.filter(r => ['Sent', 'Viewed', 'In Progress', 'Draft'].includes(r.status || '')).length,
    resubmitted: revisionsList.filter(r => r.status === 'Resubmitted' || r.status === 'In Review').length,
    resolved: revisionsList.filter(r => r.status === 'Resolved' || r.status === 'Verified').length,
    critical: revisionsList.filter(r => r.priority === 'Critical' || r.priority === 'High').length,
  };

  return (
    <EventWorkspaceShell eventId={params.id} activeTab="revisions">
      <div className="space-y-6 text-left animate-fade-in pb-16">
        
        {/* Floating Toast Notification */}
        {toast && (
          <div className={`fixed top-5 right-5 z-50 p-4 rounded-2xl shadow-2xl border font-bold text-xs flex items-center gap-3 animate-scale-in ${
            toast.type === "success" ? "bg-slate-900 text-white border-slate-700" : "bg-rose-950 text-white border-rose-800"
          }`}>
            {toast.type === "success" ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
            <span>{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-2 text-slate-400 hover:text-white cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ── Revision Metrics Dashboard ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { label: 'Total Requests', value: stats.total, color: 'text-text-primary' },
            { label: 'Needs Your Action', value: stats.open, color: 'text-amber-600' },
            { label: 'Sent Back', value: stats.resubmitted, color: 'text-secondary' },
            { label: 'Approved', value: stats.resolved, color: 'text-success' },
            { label: 'High Priority', value: stats.critical, color: 'text-danger' },
          ].map(s => (
            <div key={s.label} className="bg-white border border-border-subtle rounded-2xl p-4 shadow-xs text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[9px] font-mono text-text-secondary uppercase tracking-wider mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── Auditor Feedback & Overall Status Banner ── */}
        <div className="bg-white border border-border-subtle rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-subtle pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-mono font-bold text-text-secondary uppercase">Audit Stage</span>
                <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-secondary/10 text-secondary border border-secondary/20">
                  {feedback?.stage || "Document Verification"}
                </span>
              </div>
              <h2 className="text-lg font-bold text-text-primary">Revision Requests from the Auditor</h2>
              <p className="text-xs text-text-secondary mt-0.5">
                Select one of the revision points below to open its response form and send your fix back to the auditor.
              </p>
            </div>
          </div>

          {feedback?.auditorNotes && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                <UserCheck className="w-4 h-4 text-amber-700" />
                <span>Auditor&apos;s Key Notes ({feedback.assignedAuditorName || "Auditor Team"})</span>
              </div>
              <p className="text-xs text-amber-900/90 leading-relaxed pl-6">{feedback.auditorNotes}</p>
            </div>
          )}
        </div>

        {/* ── Auditor Revision Items List ── */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600" />
            Revision Points from the Auditor ({revisionsList.length})
          </h3>

          {loading ? (
            <div className="p-8 bg-white border border-border-subtle rounded-2xl text-center text-xs text-text-secondary font-bold">
              Loading the auditor&apos;s notes…
            </div>
          ) : revisionsList.length === 0 ? (
            <div className="p-10 bg-white border border-border-subtle rounded-2xl text-center space-y-3 shadow-xs">
              <CheckCircle2 className="w-10 h-10 text-success mx-auto" />
              <h4 className="text-sm font-bold text-text-primary">No Active Revision Requests</h4>
              <p className="text-xs text-text-secondary max-w-md mx-auto leading-relaxed">
                The auditor hasn&apos;t requested any revisions for this event. The response form only appears once they ask for a fix.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {revisionsList.map((r) => {
                const isSelected = selectedRevisionId === r.id;
                const currentFile = itemFiles[r.id];

                return (
                  <div
                    key={r.id}
                    className={`bg-white border rounded-2xl transition-all overflow-hidden ${
                      isSelected
                        ? "border-secondary ring-2 ring-secondary/20 shadow-md"
                        : "border-border-subtle hover:border-border-strong shadow-xs"
                    }`}
                  >
                    {/* Item Header Banner */}
                    <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div className="flex flex-col gap-1 shrink-0 pt-0.5">
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold border ${
                            r.priority === 'Critical' || r.priority === 'High'
                              ? 'bg-danger/10 text-danger border-danger/20'
                              : 'bg-warning/10 text-warning border-warning/20'
                          }`}>
                            {r.priority} Priority
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold border ${
                            r.status === 'Resolved' || r.status === 'Verified'
                              ? 'bg-success/10 text-success border-success/20'
                              : r.status === 'Resubmitted' || r.status === 'In Review'
                              ? 'bg-secondary/10 text-secondary border-secondary/20'
                              : 'bg-amber-500/10 text-amber-700 border-amber-500/30'
                          }`}>
                            {r.status || 'Pending EO'}
                          </span>
                        </div>

                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-bold text-text-primary">{r.title}</h4>
                            <span className="text-[9px] font-mono text-text-secondary px-2 py-0.5 bg-surface-container rounded border border-border-subtle">
                              {r.category}
                            </span>
                          </div>
                          <p className="text-xs text-text-secondary leading-relaxed">
                            <strong className="text-text-primary">Auditor instruction:</strong> {r.requiredAction}
                          </p>
                        </div>
                      </div>

                      {/* Select Item to Revise Action Button */}
                      {r.status !== 'Resolved' && (
                        <button
                          onClick={() => setSelectedRevisionId(isSelected ? null : r.id)}
                          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                            isSelected
                              ? "bg-surface-container text-text-primary border border-border-subtle"
                              : "bg-secondary text-white hover:bg-secondary/90 shadow-sm"
                          }`}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>{isSelected ? "Close Revision Form" : "Select & Fix This Point"}</span>
                        </button>
                      )}
                    </div>

                    {/* ── EXPANDED REVISION RESPONSE FORM (only after the organizer selects a point) ── */}
                    {isSelected && (
                      <div className="border-t border-border-subtle bg-surface-container-low/50 p-6 space-y-5 animate-fade-in">
                        <div className="flex items-center gap-2 text-xs font-bold text-secondary border-b border-border-subtle pb-3">
                          <Sparkles className="w-4 h-4 text-secondary" />
                          <span>Revision Response Form (Point #{r.id}: {r.title})</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div className="bg-white p-3.5 rounded-xl border border-border-subtle space-y-1">
                            <span className="text-[9px] font-mono font-bold text-text-secondary uppercase">Auditor&apos;s Findings</span>
                            <p className="text-text-primary leading-relaxed">{r.description}</p>
                          </div>
                          <div className="bg-primary/5 p-3.5 rounded-xl border border-primary/10 space-y-1">
                            <span className="text-[9px] font-mono font-bold text-primary uppercase">Requirement You Must Meet</span>
                            <p className="text-primary font-bold leading-relaxed">{r.requiredAction}</p>
                          </div>
                        </div>

                        {/* Organizer's written explanation */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-mono font-bold text-text-secondary uppercase">
                            Your Explanation to the Auditor
                          </label>
                          <textarea
                            value={itemComments[r.id] || ""}
                            onChange={(e) => setItemComments({ ...itemComments, [r.id]: e.target.value })}
                            rows={3}
                            placeholder="Describe in detail what you changed to address this point…"
                            className="w-full p-3.5 border border-border-subtle rounded-xl text-xs bg-white outline-none focus:border-secondary focus:ring-1 focus:ring-secondary/20 resize-none"
                          />
                        </div>

                        {/* Specific corrective action */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-mono font-bold text-text-secondary uppercase">
                            Specific Corrective Action Taken
                          </label>
                          <input
                            value={itemActions[r.id] || ""}
                            onChange={(e) => setItemActions({ ...itemActions, [r.id]: e.target.value })}
                            placeholder="e.g. Re-uploaded a clear, current copy of the official ID…"
                            className="w-full px-3.5 py-2.5 border border-border-subtle rounded-xl text-xs bg-white outline-none focus:border-secondary focus:ring-1 focus:ring-secondary/20"
                          />
                        </div>

                        {/* Supporting document upload */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-mono font-bold text-text-secondary uppercase">
                            Attach Supporting Evidence (Optional)
                          </label>
                          <input
                            type="file"
                            ref={(el) => { fileInputRefs.current[r.id] = el; }}
                            onChange={(e) => handleFileSelect(r.id, e.target.files?.[0] || null)}
                            accept="image/*,.pdf"
                            className="hidden"
                          />
                          <div
                            onClick={() => fileInputRefs.current[r.id]?.click()}
                            className="border-2 border-dashed border-border-subtle rounded-xl p-4 text-center hover:border-secondary/50 transition-colors cursor-pointer bg-white"
                          >
                            {currentFile ? (
                              <div className="flex items-center justify-between p-2 bg-surface-container rounded-lg border border-border-subtle text-xs">
                                <div className="flex items-center gap-2 truncate">
                                  <FileText className="w-4 h-4 text-secondary shrink-0" />
                                  <span className="font-bold text-text-primary truncate">{currentFile.name}</span>
                                  <span className="text-[10px] text-text-secondary font-mono">({Math.round(currentFile.size / 1024)} KB)</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleFileSelect(r.id, null);
                                  }}
                                  className="p-1 hover:bg-surface-container-high rounded text-text-secondary hover:text-danger cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <>
                                <Upload className="w-5 h-5 text-text-secondary mx-auto mb-1" />
                                <p className="text-xs text-text-secondary">Click to upload a supporting file or screenshot</p>
                                <p className="text-[9px] text-text-secondary font-mono mt-0.5">PNG, JPG, PDF up to 10MB</p>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Submit Item Button */}
                        <div className="flex justify-end gap-3 pt-2">
                          <button
                            type="button"
                            onClick={() => setSelectedRevisionId(null)}
                            className="px-4 py-2.5 border border-border-subtle text-text-secondary rounded-xl text-xs font-bold hover:bg-white transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSendItemRevision(r.id)}
                            disabled={isSubmitting}
                            className="flex items-center gap-2 px-6 py-2.5 bg-secondary hover:bg-secondary/90 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>{isSubmitting ? "Sending…" : "Send Revision to Auditor"}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </EventWorkspaceShell>
  );
}
