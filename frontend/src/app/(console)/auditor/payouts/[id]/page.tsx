"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import PayoutDetailView from "../../components/PayoutDetailView";
import { useAuditorData } from "../../AuditorDataContext";

export default function AuditorPayoutDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { payouts, handleUpdatePayoutStatus, handleUpdatePayoutChecklists } = useAuditorData();

  const payout = payouts.find((p) => p.id === params.id);

  useEffect(() => {
    if (window.location.hash === '#activity-log-section') {
      document.getElementById('activity-log-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  if (!payout) {
    return (
      <div className="bg-white border border-border-subtle rounded-xl p-10 text-center animate-fade-in">
        <p className="text-sm font-bold text-text-primary">Payout request not found</p>
        <p className="text-xs text-text-secondary mt-1">"{params.id}" does not match any payout request.</p>
        <button
          onClick={() => router.push('/auditor/payouts')}
          className="mt-3 text-xs font-bold text-secondary hover:underline cursor-pointer"
        >
          Back to Payouts
        </button>
      </div>
    );
  }

  return (
    <PayoutDetailView
      payout={payout}
      onBack={() => router.push('/auditor/payouts')}
      onUpdatePayoutStatus={handleUpdatePayoutStatus}
      onUpdatePayoutChecklists={handleUpdatePayoutChecklists}
    />
  );
}
