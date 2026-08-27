"use client";

import { useParams } from "next/navigation";
import AuditorReviewShell, { useAuditorReview } from "../../../components/AuditorReviewShell";
import { TabFinance } from "../../../components/ReviewDetailView";

function ReviewFinanceTab() {
  const { submission } = useAuditorReview();
  return <TabFinance sub={submission} />;
}

export default function AuditorReviewFinancePage() {
  const params = useParams<{ id: string }>();
  return (
    <AuditorReviewShell reviewId={params.id} activeTab="finance">
      <ReviewFinanceTab />
    </AuditorReviewShell>
  );
}
