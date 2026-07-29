"use client";

import { useParams } from "next/navigation";
import AuditorReviewShell, { useAuditorReview } from "../../../components/AuditorReviewShell";
import { TabVenue } from "../../../components/ReviewDetailView";

function ReviewVenueTab() {
  const { submission } = useAuditorReview();
  return <TabVenue sub={submission} />;
}

export default function AuditorReviewVenuePage() {
  const params = useParams<{ id: string }>();
  return (
    <AuditorReviewShell reviewId={params.id} activeTab="venue">
      <ReviewVenueTab />
    </AuditorReviewShell>
  );
}
