"use client";

import { useRouter } from "next/navigation";
import DashboardView from "./components/DashboardView";
import { useAuditorData } from "./AuditorDataContext";

export default function AuditorDashboardPage() {
  const router = useRouter();
  const { submissions, documents, activity } = useAuditorData();

  return (
    <DashboardView
      submissions={submissions}
      documents={documents}
      activity={activity}
      onNavigateToView={(v) => router.push(`/auditor/${v}`)}
    />
  );
}
