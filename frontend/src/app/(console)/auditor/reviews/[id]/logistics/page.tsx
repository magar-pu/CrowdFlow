"use client";

import { useParams } from "next/navigation";
import AuditorReviewShell, { useAuditorReview } from "../../../components/AuditorReviewShell";
import { TabLogistics } from "../../../components/ReviewDetailView";

function ReviewLogisticsTab() {
  const { submission } = useAuditorReview();
  return <TabLogistics sub={submission} />;
}

export default function AuditorReviewLogisticsPage() {
  const params = useParams<{ id: string }>();
  return (
    <AuditorReviewShell reviewId={params.id} activeTab="logistics">
      <ReviewLogisticsTab />
    </AuditorReviewShell>
  );
}
