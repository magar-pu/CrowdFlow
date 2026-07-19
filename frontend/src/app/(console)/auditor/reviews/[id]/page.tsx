"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ReviewDetailView from "../../components/ReviewDetailView";
import DocumentDetailView from "../../components/DocumentDetailView";
import { useAuditorData } from "../../AuditorDataContext";

export default function AuditorReviewDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const {
    submissions,
    handleApprove,
    handleReject,
    handleRequestChanges,
    handleVerifySubmissionDocument,
    handleRejectSubmissionDocument,
    handleChangeSubmissionStage,
    handleAddRevision,
  } = useAuditorData();

  const [viewingDoc, setViewingDoc] = useState<{ name: string; category: string; status: string } | null>(null);

  const submission = submissions.find((s) => s.id === params.id);

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
          id: viewingDoc.name,
          fileName: viewingDoc.name,
          category: viewingDoc.category,
          status: doc?.status ?? viewingDoc.status,
          eventName: submission.eventName,
          organizerName: submission.organizerName,
        }}
        onBack={() => setViewingDoc(null)}
        onVerify={() => {
          handleVerifySubmissionDocument(submission.id, viewingDoc.name);
          setViewingDoc(null);
        }}
        onReject={() => {
          handleRejectSubmissionDocument(submission.id, viewingDoc.name);
          setViewingDoc(null);
        }}
      />
    );
  }

  return (
    <ReviewDetailView
      submission={submission}
      onBack={() => router.push('/auditor/reviews')}
      onApprove={handleApprove}
      onReject={handleReject}
      onRequestChanges={handleRequestChanges}
      onVerifyDocument={handleVerifySubmissionDocument}
      onRejectDocument={handleRejectSubmissionDocument}
      onViewDocument={(doc) => setViewingDoc(doc)}
      onChangeStage={handleChangeSubmissionStage}
      onAddRevision={handleAddRevision}
    />
  );
}
