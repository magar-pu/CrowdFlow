"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import PayoutDetailView from "../../components/PayoutDetailView";
import { useAuditorData } from "../../AuditorDataContext";
import { getPayout } from "@/lib/api/auditor";
import { PayoutRequest } from "../../types";

export default function AuditorPayoutDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { handleUpdatePayoutStatus, handleUpdatePayoutChecklists } = useAuditorData();

  const [payout, setPayout] = useState<PayoutRequest | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDetail = async () => {
    try {
      setLoading(true);
      const res = await getPayout(params.id);
      if (res.success && res.data) {
        setPayout({
          ...res.data,
          id: String(res.data.id),
        } as any);
      }
    } catch (err) {
      console.error("Failed to load payout details:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
    if (window.location.hash === '#activity-log-section') {
      setTimeout(() => {
        document.getElementById('activity-log-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 500);
    }
  }, [params.id]);

  const handleUpdatePayoutStatusAction = async (id: string, status: any, notes: string, financeNotes: string) => {
    await handleUpdatePayoutStatus(id, status, notes, financeNotes);
    await loadDetail();
  };

  if (loading) {
    return (
      <div className="bg-white border border-border-subtle rounded-xl p-10 text-center animate-fade-in">
        <p className="text-sm font-bold text-text-primary">Loading payout details...</p>
      </div>
    );
  }

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
      onUpdatePayoutStatus={handleUpdatePayoutStatusAction}
      onUpdatePayoutChecklists={handleUpdatePayoutChecklists}
    />
  );
}
