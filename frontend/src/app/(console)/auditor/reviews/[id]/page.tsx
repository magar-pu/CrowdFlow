"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import ReviewDetailView from "../../components/ReviewDetailView";
import DocumentDetailView from "../../components/DocumentDetailView";
import { useAuditorData } from "../../AuditorDataContext";
import {
  getEventReview,
  approveEventReview,
  rejectEventReview,
  requestEventChanges,
  verifyReviewDocument,
  rejectReviewDocument,
  updateEventReviewStage,
  addEventRevision
} from "@/lib/api/auditor";
import { EventSubmission } from "../../types";

export default function AuditorReviewDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { fetchDashboard } = useAuditorData();

  const [submission, setSubmission] = useState<EventSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewingDoc, setViewingDoc] = useState<{ id?: number | string; name: string; category: string; status: string } | null>(null);

  const loadDetail = async () => {
    try {
      setLoading(true);
      const res = await getEventReview(params.id);
      if (res.success && res.data) {
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
            name: doc.name || "document.pdf",
            category: doc.category || "Supporting Documents",
            uploadDate: doc.uploadDate || "2026-07-20",
            status: doc.status || "READY",
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
            affectedSection: "General Details",
            priority: "Medium" as any,
            status: (r.status || "Draft") as any,
            requestedBy: "Priya Nair",
            requestDate: r.createdAt || "Just now",
            deadline: r.deadline || "3 Days",
            title: r.title || "",
            description: r.description || "",
            requiredAction: r.requiredAction || "",
            severity: "Medium" as any,
            area: "Document" as any,
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
      }
    } catch (err) {
      console.error("Failed to load event review details:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
  }, [params.id]);

  const handleApproveAction = async (id: string, notes: string = "") => {
    const res = await approveEventReview(id, notes);
    if (res.success) {
      await loadDetail();
      if (fetchDashboard) fetchDashboard();
    } else {
      alert("Failed to approve submission: " + (res.error?.message || "unknown error"));
    }
  };

  const handleRejectAction = async (id: string, reason: string) => {
    const res = await rejectEventReview(id, reason, "Rejected by Auditor");
    if (res.success) {
      await loadDetail();
      if (fetchDashboard) fetchDashboard();
    } else {
      alert("Failed to reject submission: " + (res.error?.message || "unknown error"));
    }
  };

  const handleRequestChangesAction = async (id: string, notes: string) => {
    const res = await requestEventChanges(id, notes);
    if (res.success) {
      await loadDetail();
      if (fetchDashboard) fetchDashboard();
    } else {
      alert("Failed to request changes: " + (res.error?.message || "unknown error"));
    }
  };

  const handleVerifySubmissionDocAction = async (submissionId: string, docName: string) => {
    const doc = submission?.documents.find(d => d.name === docName);
    if (!doc?.id) return;
    const res = await verifyReviewDocument(submissionId, doc.id);
    if (res.success) {
      await loadDetail();
    } else {
      alert("Failed to verify document: " + (res.error?.message || "unknown error"));
    }
  };

  const handleRejectSubmissionDocAction = async (submissionId: string, docName: string, reason: string = "Invalid document details") => {
    const doc = submission?.documents.find(d => d.name === docName);
    if (!doc?.id) return;
    const res = await rejectReviewDocument(submissionId, doc.id, reason);
    if (res.success) {
      await loadDetail();
    } else {
      alert("Failed to reject document: " + (res.error?.message || "unknown error"));
    }
  };

  const handleChangeSubmissionStageAction = async (submissionId: string, stage: any) => {
    const res = await updateEventReviewStage(submissionId, stage);
    if (res.success) {
      await loadDetail();
    } else {
      alert("Failed to update stage: " + (res.error?.message || "unknown error"));
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
      await loadDetail();
    } else {
      alert("Failed to add revision: " + (res.error?.message || "unknown error"));
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
        <p className="text-sm font-bold text-text-primary">Submission not found</p>
        <p className="text-xs text-text-secondary mt-1">"{params.id}" does not match any event submission.</p>
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

  return (
    <ReviewDetailView
      submission={submission}
      onBack={() => router.push('/auditor/reviews')}
      onApprove={handleApproveAction}
      onReject={handleRejectAction}
      onRequestChanges={handleRequestChangesAction}
      onVerifyDocument={handleVerifySubmissionDocAction}
      onRejectDocument={handleRejectSubmissionDocAction}
      onViewDocument={(doc) => setViewingDoc(doc)}
      onChangeStage={handleChangeSubmissionStageAction}
      onAddRevision={handleAddRevisionAction}
    />
  );
}
