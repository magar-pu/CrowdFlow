"use client";

import { useParams } from "next/navigation";
import AuditorReviewShell, { useAuditorReview } from "../../../components/AuditorReviewShell";
import { TabRevision } from "../../../components/ReviewDetailView";

function ReviewRevisionTab() {
  const { submission, handleAddRevisionAction, loadDetail } = useAuditorReview();
  return (
    <TabRevision
      sub={submission}
      onAddRevision={handleAddRevisionAction}
      onRefresh={loadDetail}
    />
  );
}

export default function AuditorReviewRevisionPage() {
  const params = useParams<{ id: string }>();
  return (
    <AuditorReviewShell reviewId={params.id} activeTab="revision">
      <ReviewRevisionTab />
    </AuditorReviewShell>
  );
}
