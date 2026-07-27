"use client";

import { useParams } from "next/navigation";
import AuditorReviewShell, { useAuditorReview } from "../../components/AuditorReviewShell";
import { TabOverview } from "../../components/ReviewDetailView";

function ReviewOverviewTab() {
  const { submission } = useAuditorReview();
  return <TabOverview sub={submission} />;
}

export default function AuditorReviewOverviewPage() {
  const params = useParams<{ id: string }>();
  return (
    <AuditorReviewShell reviewId={params.id} activeTab="overview">
      <ReviewOverviewTab />
    </AuditorReviewShell>
  );
}
