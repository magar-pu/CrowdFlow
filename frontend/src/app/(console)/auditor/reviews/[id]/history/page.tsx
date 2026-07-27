"use client";

import { useParams } from "next/navigation";
import AuditorReviewShell, { useAuditorReview } from "../../../components/AuditorReviewShell";
import { TabHistory } from "../../../components/ReviewDetailView";

function ReviewHistoryTab() {
  const { submission } = useAuditorReview();
  return <TabHistory sub={submission} />;
}

export default function AuditorReviewHistoryPage() {
  const params = useParams<{ id: string }>();
  return (
    <AuditorReviewShell reviewId={params.id} activeTab="history">
      <ReviewHistoryTab />
    </AuditorReviewShell>
  );
}
