"use client";

import { useParams } from "next/navigation";
import AuditorReviewShell, { useAuditorReview } from "../../../components/AuditorReviewShell";
import { TabDocuments } from "../../../components/ReviewDetailView";

function ReviewDocumentsTab() {
  const {
    submission,
    handleVerifySubmissionDocAction,
    handleRejectSubmissionDocAction,
    handleOpenDocumentFile,
    handleAddRevisionAction,
  } = useAuditorReview();

  return (
    <TabDocuments
      sub={submission}
      onVerify={(name) => handleVerifySubmissionDocAction(submission.id, name)}
      onReject={(name) => handleRejectSubmissionDocAction(submission.id, name)}
      onOpenFile={handleOpenDocumentFile}
      onAddRevision={handleAddRevisionAction}
    />
  );
}

export default function AuditorReviewDocumentsPage() {
  const params = useParams<{ id: string }>();
  return (
    <AuditorReviewShell reviewId={params.id} activeTab="documents">
      <ReviewDocumentsTab />
    </AuditorReviewShell>
  );
}
