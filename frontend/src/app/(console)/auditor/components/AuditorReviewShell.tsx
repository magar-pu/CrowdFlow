"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, AlertTriangle, X, Info, FileText, MapPin, ShieldAlert, DollarSign, Clock } from "lucide-react";
import { useAuditorData } from "../AuditorDataContext";
import DocumentDetailView from "./DocumentDetailView";
import {
  getEventReview,
  approveEventReview,
  rejectEventReview,
  requestEventChanges,
  verifyReviewDocument,
  rejectReviewDocument,
  verifyEventReviewDocument,
  rejectEventReviewDocument,
  getReviewDocumentUrl,
  updateEventReviewStage,
  addEventRevision
} from "@/lib/api/auditor";
import { EventSubmission, ReviewDocument, docKey, ReviewStage } from "../types";

export type ReviewTab = 'overview' | 'documents' | 'venue' | 'logistics' | 'finance' | 'history' | 'revision';

export const REVIEW_TABS: { key: ReviewTab; label: string; icon: React.ReactNode }[] = [
  { key: 'overview', label: 'Overview', icon: <Info className="w-3.5 h-3.5" /> },
  { key: 'documents', label: 'Documents', icon: <FileText className="w-3.5 h-3.5" /> },
  { key: 'venue', label: 'Venue & Layout', icon: <MapPin className="w-3.5 h-3.5" /> },
  { key: 'logistics', label: 'Logistics & Safety', icon: <ShieldAlert className="w-3.5 h-3.5" /> },
  { key: 'finance', label: 'Financial Audit', icon: <DollarSign className="w-3.5 h-3.5" /> },
  { key: 'history', label: 'Audit History', icon: <Clock className="w-3.5 h-3.5" /> },
  { key: 'revision', label: 'Revision Control', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
];

const riskColors: Record<string, string> = {
  Low: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
  Medium: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
  High: 'bg-rose-500/10 text-rose-700 border-rose-500/20',
  Critical: 'bg-rose-600 text-white border-rose-700',
};

function mapDocStatus(backendStatus: string): "VERIFIED" | "WAITING REVIEW" | "READY" | "REJECTED" | "MISSING" {
  switch (backendStatus?.toLowerCase()) {
    case 'verified': return 'VERIFIED';
    case 'rejected': return 'REJECTED';
    case 'missing': return 'MISSING';
    case 'pending':
    case 'pending_verification':
      return 'WAITING REVIEW';
    default: return 'READY';
  }
}

function findDoc(docs: ReviewDocument[] | undefined, keyOrName: string): ReviewDocument | undefined {
  return docs?.find((d) => docKey(d) === keyOrName || d.name === keyOrName);
}

interface AuditorReviewContextType {
  submission: EventSubmission;
  loadDetail: () => Promise<void>;
  handleApproveAction: (id: string, notes?: string) => Promise<void>;
  handleRejectAction: (id: string, reason: string) => Promise<void>;
  handleRequestChangesAction: (id: string, notes: string) => Promise<void>;
  handleVerifySubmissionDocAction: (submissionId: string, docKeyOrName: string) => Promise<void>;
  handleRejectSubmissionDocAction: (submissionId: string, docKeyOrName: string, reason?: string) => Promise<void>;
  handleOpenDocumentFile: (doc: ReviewDocument) => Promise<void>;
  handleChangeSubmissionStageAction: (submissionId: string, stage: ReviewStage) => Promise<void>;
  handleAddRevisionAction: (submissionId: string, revision: any) => Promise<void>;
  setViewingDoc: (doc: { id?: number | string; name: string; category: string; status: string } | null) => void;
  setToast: (toast: { message: string; type: "success" | "error" } | null) => void;
}

const AuditorReviewContext = createContext<AuditorReviewContextType | null>(null);

export function useAuditorReview() {
  const ctx = useContext(AuditorReviewContext);
  if (!ctx) throw new Error("useAuditorReview must be used within AuditorReviewShell");
  return ctx;
}

interface AuditorReviewShellProps {
  reviewId: string;
  activeTab: ReviewTab;
  children: React.ReactNode;
}

export default function AuditorReviewShell({ reviewId, activeTab, children }: AuditorReviewShellProps) {
  const router = useRouter();
  const { fetchDashboard } = useAuditorData();

  const [submission, setSubmission] = useState<EventSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [viewingDoc, setViewingDoc] = useState<{ id?: number | string; name: string; category: string; status: string } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const [mode, setMode] = useState<'view' | 'reject' | 'changes'>('view');
  const [reason, setReason] = useState('');

  const loadDetail = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const res = await getEventReview(reviewId);
      if (!res.success || !res.data) {
        setLoadError(res.error?.message ?? "Failed to load this event review.");
        return;
      }
      const raw = res.data;
      const mappedSubmission: EventSubmission = {
        id: String(raw.id),
        eventName: raw.eventName || "New Event",
        organizerName: raw.organizerName || "Unknown Organizer",
        organizerAvatar: raw.organizerAvatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100",
        bannerUrl: raw.bannerUrl || "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800",
        category: raw.category || "Festival",
        submittedAt: raw.submittedAt || "2026-07-20 00:00",
        lastUpdated: raw.lastUpdated || "2026-07-20 00:00",
        stage: raw.stage || "Submitted",
        status: raw.status || "Pending",
        riskLevel: raw.riskLevel || "Low",
        complianceScore: raw.complianceScore ?? 100,
        missingDocs: raw.missingDocs ?? 0,
        assignedAuditor: raw.assignedAuditor || "Priya Nair",
        checklist: raw.checklist || [
          { label: "Event Info", done: true },
          { label: "Venue Layout", done: true },
          { label: "Organizer Profile", done: true },
          { label: "Ticket Configuration", done: true },
        ],
        documents: (raw.documents || []).map((doc: any) => ({
          id: String(doc.id),
          source: doc.source === "event" ? "event" : "organizer",
          name: doc.name || "document.pdf",
          category: doc.category || "Supporting Documents",
          uploadDate: doc.uploadDate || "2026-07-20",
          status: mapDocStatus(doc.status),
          reviewNotes: doc.reviewNotes || "",
          fileUrl: doc.fileUrl || "",
        })),
        venue: raw.venue || "Default Venue",
        date: raw.date || "2026-10-10 18:00",
        capacity: raw.capacity || 1000,
        ticketSold: raw.ticketSold || 0,
        notes: raw.notes || "",
        organizerDetail: raw.organizerDetail || {
          companyName: raw.organizerName || "Organizer Company",
          businessLicense: "BL-2026-ID-00123",
          pic: raw.organizerName || "Marcus Chen",
          email: "organizer@crowdflow.my.id",
          phone: "+62 812-3456-7890",
          address: "Jakarta, Indonesia",
        },
        venueDetail: raw.venueDetail || {
          name: raw.venue || "Default Venue",
          address: (raw as any).venueDetail?.address || raw.venue || "Jakarta, Indonesia",
          capacity: raw.capacity || 1000,
          manager: "Venue Manager",
          contact: "+62 812-9876-5432",
          website: "https://crowdflow.my.id",
          googleMaps: "https://maps.google.com",
          complianceScore: 100,
          checklist: [
            { label: "Venue Ownership Verified", done: true },
            { label: "Maximum Capacity Verified", done: true },
            { label: "Seating Configuration Valid", done: true },
            { label: "Emergency Exit Verified", done: true },
          ],
        },
        logistics: raw.logistics || {
          vendorCount: 0,
          securityCount: 10,
          medicalTeam: 2,
          emergencyTeam: 2,
          vendors: [],
          emergencyPlan: [
            { label: "Ambulance", done: true },
            { label: "Fire Truck", done: false },
            { label: "Emergency Exit", done: true },
            { label: "Evacuation Route", done: true },
          ],
        },
        finance: raw.finance ? {
          projectedRevenue: raw.finance.projectedRevenue || 0,
          platformFee: raw.finance.platformFee || 0,
          gatewayFee: raw.finance.gatewayFee || 0,
          taxAmount: raw.finance.taxAmount || 0,
          netPayout: raw.finance.netPayout || 0,
          ticketTiers: (raw.finance.ticketTiers || []).map((t: any) => ({
            category: t.category || "General",
            price: t.price || 0,
            seats: t.seats || 0,
            status: t.status || "Available",
          })),
          taxConfig: raw.finance.taxConfig ? {
            entertainmentTax: raw.finance.taxConfig.entertainmentTax || 0,
            ppn: raw.finance.taxConfig.ppn || 11,
            region: raw.finance.taxConfig.region || "Indonesia",
            taxPercentage: raw.finance.taxConfig.taxPercentage || 11,
            regionMatch: raw.finance.taxConfig.regionMatch || true,
            taxApplied: raw.finance.taxConfig.taxApplied || true,
            ppnApplied: raw.finance.taxConfig.ppnApplied || true,
          } : {
            entertainmentTax: 10,
            ppn: 11,
            region: "Indonesia",
            taxPercentage: 21,
            regionMatch: true,
            taxApplied: true,
            ppnApplied: true,
          },
          payout: raw.finance.payout ? {
            bank: raw.finance.payout.bank || "Bank Central Asia (BCA)",
            accountName: raw.finance.payout.accountName || raw.organizerName || "",
            accountNumber: raw.finance.payout.accountNumber || "8024927501",
            verified: raw.finance.payout.verified || true,
            estimatedPayout: raw.finance.payout.estimatedPayout || 0,
          } : {
            bank: "Bank Central Asia (BCA)",
            accountName: raw.organizerName || "Organizer Company",
            accountNumber: "8024927501",
            verified: true,
            estimatedPayout: 0,
          },
          complianceChecklist: [
            { label: "Ticket Price Verified", done: true },
            { label: "Revenue Calculation", done: true },
            { label: "Platform Fee Applied", done: true },
            { label: "Tax Calculation", done: true },
          ],
        } : {
          projectedRevenue: 0,
          platformFee: 0,
          gatewayFee: 0,
          taxAmount: 0,
          netPayout: 0,
          ticketTiers: [],
          taxConfig: {
            entertainmentTax: 10,
            ppn: 11,
            region: "Indonesia",
            taxPercentage: 21,
            regionMatch: true,
            taxApplied: true,
            ppnApplied: true,
          },
          payout: {
            bank: "Bank Central Asia (BCA)",
            accountName: raw.organizerName || "Organizer Company",
            accountNumber: "8024927501",
            verified: true,
            estimatedPayout: 0,
          },
          complianceChecklist: [],
        },
        history: raw.history && (raw.history as any).activityTimeline ? {
          activityTimeline: ((raw.history as any).activityTimeline || []).map((h: any, idx: number) => ({
            id: h.id || `h-${idx}`,
            user: h.user || "System",
            role: h.role || "Auto",
            action: h.action || "State Transition",
            detail: h.detail || "",
            timestamp: h.timestamp || "Just now",
          })),
          versions: ((raw.history as any).versions || []).map((v: any, idx: number) => ({
            version: v.version || (idx + 1),
            changedBy: v.changedBy || "Organizer",
            timestamp: v.timestamp || "Just now",
            summary: v.summary || "",
          })),
        } : {
          activityTimeline: ((raw.history as any) || []).map((h: any, idx: number) => ({
            id: `h-${idx}`,
            user: h.actorName || "System",
            role: h.actorName === "System" ? "Auto" : "User",
            action: h.toStatus || "Status Changed",
            detail: h.notes || `Transitioned from ${h.fromStatus} to ${h.toStatus}`,
            timestamp: h.createdAt || "Just now",
          })),
          versions: [],
        },
        revisions: (raw.revisions || []).map((r: any) => ({
          id: String(r.id),
          category: (r.category || "Other") as any,
          affectedSection: r.requiredAction || "General Details",
          priority: (r.priority || "Medium") as any,
          status: (r.status || "Draft") as any,
          requestedBy: r.requestedBy || "Auditor",
          requestDate: r.createdAt || "Just now",
          deadline: r.deadline || "3 Days",
          title: r.title || "",
          description: r.description || "",
          requiredAction: r.requiredAction || "",
          severity: (r.priority || "Medium") as any,
          area: (r.category || "Document") as any,
          organizerResponse: (r.organizerComment || r.organizerActionTaken || r.organizerFile) ? {
            comment: [r.organizerComment, r.organizerActionTaken].filter(Boolean).join(" | ") || "Perbaikan telah diunggah oleh EO.",
            uploadedFiles: r.organizerFile ? [r.organizerFile] : [],
            respondedAt: r.respondedAt || "Baru saja"
          } : undefined,
          revisionTimeline: [],
        })),
        complianceHistory: raw.complianceHistory || {
          previousAudits: 5,
          previousViolations: 0,
          previousRevisions: 2,
          previousApprovedEvents: 3,
        },
      };
      setSubmission(mappedSubmission);
    } catch (err) {
      console.error("Failed to load event review details:", err);
      setLoadError("Failed to load this event review. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
  }, [reviewId]);

  const handleApproveAction = async (id: string, notes: string = "") => {
    const res = await approveEventReview(id, notes);
    if (res.success) {
      setToast({ message: "✅ Event berhasil disetujui (Approved)!", type: "success" });
      setTimeout(() => setToast(null), 4000);
      await loadDetail();
      if (fetchDashboard) fetchDashboard();
    } else {
      setToast({ message: "Gagal menyetujui event: " + (res.error?.message || "unknown error"), type: "error" });
      setTimeout(() => setToast(null), 4000);
    }
  };

  const handleRejectAction = async (id: string, reasonStr: string) => {
    const res = await rejectEventReview(id, reasonStr, "Rejected by Auditor");
    if (res.success) {
      setToast({ message: "❌ Event telah ditolak (Rejected)!", type: "error" });
      setTimeout(() => setToast(null), 4000);
      await loadDetail();
      if (fetchDashboard) fetchDashboard();
    } else {
      setToast({ message: "Gagal menolak event: " + (res.error?.message || "unknown error"), type: "error" });
      setTimeout(() => setToast(null), 4000);
    }
  };

  const handleRequestChangesAction = async (id: string, notes: string) => {
    const res = await requestEventChanges(id, notes);
    if (res.success) {
      setToast({ message: "⚠️ Permintaan revisi telah dikirim ke Organizer!", type: "success" });
      setTimeout(() => setToast(null), 4000);
      await loadDetail();
      if (fetchDashboard) fetchDashboard();
    } else {
      setToast({ message: "Gagal meminta revisi: " + (res.error?.message || "unknown error"), type: "error" });
      setTimeout(() => setToast(null), 4000);
    }
  };

  const handleOpenDocumentFile = async (doc: ReviewDocument) => {
    if (!doc.id) return;
    const tab = window.open("", "_blank", "noopener,noreferrer");

    const res = await getReviewDocumentUrl(reviewId, doc.id, doc.source ?? "organizer");
    if (!res.success || !res.data) {
      tab?.close();
      setToast({ message: "Could not open this document: " + (res.error?.message || "unknown error"), type: "error" });
      return;
    }

    if (tab) {
      tab.location.assign(res.data.url);
    } else {
      window.location.assign(res.data.url);
    }
  };

  const handleVerifySubmissionDocAction = async (submissionId: string, docKeyOrName: string) => {
    const doc = findDoc(submission?.documents, docKeyOrName);
    const targetDocId = doc?.id;
    if (!targetDocId) return;

    const res =
      doc.source === "event"
        ? await verifyEventReviewDocument(submissionId, targetDocId)
        : await verifyReviewDocument(submissionId, targetDocId);
    if (res.success) {
      setSubmission((prev) => {
        if (!prev) return null;
        const updatedDocs = prev.documents.map((d) =>
          docKey(d) === docKey(doc) ? { ...d, status: "VERIFIED" as const } : d
        );
        return { ...prev, documents: updatedDocs };
      });
      setToast({ message: "Document verified successfully.", type: "success" });
      await loadDetail();
    } else {
      setToast({ message: "Failed to verify document: " + (res.error?.message || "unknown error"), type: "error" });
    }
  };

  const handleRejectSubmissionDocAction = async (submissionId: string, docKeyOrName: string, reasonStr: string = "Invalid document details") => {
    const doc = findDoc(submission?.documents, docKeyOrName);
    const targetDocId = doc?.id;
    if (!targetDocId) return;

    const res =
      doc.source === "event"
        ? await rejectEventReviewDocument(submissionId, targetDocId, reasonStr)
        : await rejectReviewDocument(submissionId, targetDocId, reasonStr);
    if (res.success) {
      setSubmission((prev) => {
        if (!prev) return null;
        const updatedDocs = prev.documents.map((d) =>
          docKey(d) === docKey(doc) ? { ...d, status: "REJECTED" as const, reviewNotes: reasonStr } : d
        );
        return { ...prev, documents: updatedDocs };
      });
      setToast({ message: "Document rejected.", type: "error" });
      await loadDetail();
    } else {
      setToast({ message: "Failed to reject document: " + (res.error?.message || "unknown error"), type: "error" });
    }
  };

  const handleChangeSubmissionStageAction = async (submissionId: string, stage: any) => {
    const res = await updateEventReviewStage(submissionId, stage);
    if (res.success) {
      setToast({ message: `Stage updated to "${stage}"`, type: "success" });
      setTimeout(() => setToast(null), 3000);
      await loadDetail();
    } else {
      setToast({ message: "Failed to update stage: " + (res.error?.message || "unknown error"), type: "error" });
      setTimeout(() => setToast(null), 4000);
    }
  };

  const handleAddRevisionAction = async (submissionId: string, revision: any) => {
    const res = await addEventRevision(submissionId, {
      category: revision.category,
      title: revision.title,
      description: revision.description,
      requiredAction: revision.requiredAction,
      priority: revision.priority,
      deadline: revision.deadline
    });

    if (res.success) {
      setSubmission((prev) => {
        if (!prev) return null;
        const exists = prev.revisions.some((r) => r.id === revision.id);
        const newRevisions = exists ? prev.revisions : [revision, ...prev.revisions];
        return {
          ...prev,
          status: "Changes Requested",
          revisions: newRevisions
        };
      });
      loadDetail();
      setToast({ message: "Revision Request Sent to Organizer Successfully!", type: "success" });
      setTimeout(() => setToast(null), 4000);
    } else {
      setToast({ message: `Failed to add revision: ${res.error?.message || "Unknown error"}`, type: "error" });
      setTimeout(() => setToast(null), 4000);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-border-subtle rounded-xl p-10 text-center animate-fade-in">
        <p className="text-sm font-bold text-text-primary">Loading event review details...</p>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="bg-white border border-border-subtle rounded-xl p-10 text-center animate-fade-in">
        <p className="text-sm font-bold text-text-primary">
          {loadError ? "Couldn't load this review" : "Submission not found"}
        </p>
        <p className="text-xs text-text-secondary mt-1">
          {loadError ?? `"${reviewId}" does not match any event submission.`}
        </p>
        <button
          onClick={() => router.push('/auditor/reviews')}
          className="mt-3 text-xs font-bold text-secondary hover:underline cursor-pointer"
        >
          Back to Reviews
        </button>
      </div>
    );
  }

  if (viewingDoc) {
    const doc = submission.documents.find((d) => d.name === viewingDoc.name);
    return (
      <DocumentDetailView
        document={{
          id: String(doc?.id || viewingDoc.name),
          fileName: viewingDoc.name,
          category: viewingDoc.category,
          status: doc?.status ?? viewingDoc.status,
          eventName: submission.eventName,
          organizerName: submission.organizerName,
        }}
        onBack={() => setViewingDoc(null)}
        onVerify={() => {
          handleVerifySubmissionDocAction(submission.id, viewingDoc.name);
          setViewingDoc(null);
        }}
        onReject={() => {
          handleRejectSubmissionDocAction(submission.id, viewingDoc.name);
          setViewingDoc(null);
        }}
      />
    );
  }

  const handleTabChange = (t: ReviewTab) => {
    const path = t === 'overview' ? `/auditor/reviews/${reviewId}` : `/auditor/reviews/${reviewId}/${t}`;
    router.push(path);
  };

  return (
    <AuditorReviewContext.Provider
      value={{
        submission,
        loadDetail,
        handleApproveAction,
        handleRejectAction,
        handleRequestChangesAction,
        handleVerifySubmissionDocAction,
        handleRejectSubmissionDocAction,
        handleOpenDocumentFile,
        handleChangeSubmissionStageAction,
        handleAddRevisionAction,
        setViewingDoc,
        setToast,
      }}
    >
      {toast && (
        <div className={`fixed top-5 right-5 z-50 p-4 rounded-2xl shadow-2xl border font-bold text-xs flex items-center gap-3 animate-scale-in ${
          toast.type === "success"
            ? "bg-slate-900 text-white border-slate-700"
            : "bg-rose-950 text-white border-rose-800"
        }`}>
          {toast.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          )}
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 text-slate-400 hover:text-white cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="flex flex-col min-h-full text-left animate-fade-in font-sans pb-32">
        {/* ── Breadcrumb + Title ── */}
        <div className="flex items-center justify-between pb-4 border-b border-border-subtle mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => router.push('/auditor/reviews')} className="p-2 border border-border-subtle bg-white hover:bg-surface-container-low text-text-secondary hover:text-text-primary rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold shadow-xs shrink-0">
              <ArrowLeft className="w-4 h-4" /> Back to Reviews
            </button>
            <div className="min-w-0">
              <div className="text-[10px] text-text-secondary font-mono uppercase tracking-wider flex items-center gap-1 flex-wrap">
                <span>Auditor Console</span><span>/</span><span>Event Reviews</span><span>/</span>
                <span className="text-text-primary font-bold truncate max-w-[120px] sm:max-w-xs">{submission.eventName}</span>
              </div>
              <h2 className="text-lg font-bold text-text-primary truncate mt-0.5">{submission.eventName}</h2>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${riskColors[submission.riskLevel]}`}>{submission.riskLevel} Risk</span>
            <span className="font-mono text-[10px] font-bold text-text-secondary bg-surface border border-border-subtle px-2.5 py-1 rounded-lg">{submission.id}</span>
          </div>
        </div>

        {/* ── Tab Bar ── */}
        <div className="flex gap-1 overflow-x-auto pb-1 mb-6 border-b border-border-subtle">
          {REVIEW_TABS.map(t => {
            const isRevision = t.key === 'revision' && submission.revisions.length > 0;
            return (
              <button
                key={t.key}
                onClick={() => handleTabChange(t.key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-t-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer border-b-2 relative ${activeTab === t.key ? 'text-primary border-primary bg-white' : 'text-text-secondary border-transparent hover:text-text-primary hover:bg-surface-container-low'}`}
              >
                {t.icon}{t.label}
                {isRevision && <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[9px] font-bold text-white">{submission.revisions.length}</span>}
              </button>
            );
          })}
        </div>

        {/* ── Tab Content ── */}
        <div className="flex-1">
          {children}
        </div>

        {/* ── Sticky Action Panel (always visible at bottom) ── */}
        <div className="fixed bottom-0 left-0 right-0 z-20 bg-white/95 border-t border-border-subtle backdrop-blur-md px-4 py-3 sm:px-6">
          <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-3 flex-wrap">
            {mode !== 'view' ? (
              <>
                <div className="flex-1 min-w-[200px]">
                  <textarea
                    placeholder={mode === 'reject' ? "Provide reason for rejection (required)..." : "Specify changes needed from organizer (required)..."}
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    className="w-full text-xs p-2 border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none h-12"
                  />
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => { setMode('view'); setReason(''); }}
                    className="px-3 py-1.5 border border-border-subtle text-text-secondary text-xs font-bold rounded-lg hover:bg-surface transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (!reason.trim()) return;
                      if (mode === 'reject') handleRejectAction(submission.id, reason);
                      else handleRequestChangesAction(submission.id, reason);
                      setMode('view'); setReason('');
                    }}
                    disabled={!reason.trim()}
                    className={`px-4 py-1.5 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-xs disabled:opacity-50 ${mode === 'reject' ? 'bg-danger hover:bg-danger/90' : 'bg-warning hover:bg-warning/90'}`}
                  >
                    Confirm {mode === 'reject' ? 'Rejection' : 'Revision Request'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono uppercase text-text-secondary">Current Status:</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${submission.status === 'Approved' ? 'bg-success/10 text-success' : submission.status === 'Rejected' ? 'bg-danger/10 text-danger' : submission.status === 'Changes Requested' ? 'bg-warning/10 text-warning' : 'bg-secondary/10 text-secondary'}`}>
                      {submission.status}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => setMode('changes')}
                    className="px-3 py-2 border border-warning/30 bg-warning/10 text-warning-dark hover:bg-warning/20 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" /> Request Changes
                  </button>
                  <button
                    onClick={() => setMode('reject')}
                    className="px-3 py-2 border border-danger/30 bg-danger/10 text-danger hover:bg-danger/20 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                  >
                    <X className="w-3.5 h-3.5" /> Reject Application
                  </button>
                  <button
                    onClick={() => handleApproveAction(submission.id)}
                    className="px-4 py-2 bg-success hover:bg-success/90 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Approve Event
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </AuditorReviewContext.Provider>
  );
}
