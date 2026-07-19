"use client";

import { useRouter } from "next/navigation";
import ReviewsView from "../components/ReviewsView";
import { useAuditorData } from "../AuditorDataContext";

export default function AuditorReviewsPage() {
  const router = useRouter();
  const { submissions } = useAuditorData();

  return (
    <ReviewsView
      submissions={submissions}
      onSelectSubmission={(sub) => router.push(`/auditor/reviews/${sub.id}`)}
    />
  );
}
