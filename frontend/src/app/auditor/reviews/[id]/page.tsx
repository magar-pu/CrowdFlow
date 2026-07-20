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
        setSubmission({
          ...res.data,
          id: String(res.data.id),
        } as any);
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
