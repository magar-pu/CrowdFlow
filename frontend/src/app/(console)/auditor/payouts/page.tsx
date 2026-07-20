"use client";

import { useRouter } from "next/navigation";
import PayoutsView from "../components/PayoutsView";
import { useAuditorData } from "../AuditorDataContext";

export default function AuditorPayoutsPage() {
  const router = useRouter();
  const { payouts } = useAuditorData();

  return (
    <PayoutsView
      payouts={payouts}
      onSelectPayout={(p) => router.push(`/auditor/payouts/${p.id}`)}
      onViewPayoutHistory={(p) => router.push(`/auditor/payouts/${p.id}#activity-log-section`)}
    />
  );
}
