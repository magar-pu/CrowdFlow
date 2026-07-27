"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import PayoutDetailView from "../../components/PayoutDetailView";
import { useAuditorData } from "../../AuditorDataContext";
import { getPayout } from "@/lib/api/auditor";
import { PayoutRequest } from "../../types";
import { mapPayoutStatus } from "../../payoutMapping";

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
        const raw = res.data;
        // This screen authorises the release of money. Any field the API does
        // not supply is left EMPTY so the console can render "Not provided" —
        // a plausible-looking default (a bank account, a licence number, a
        // reviewer's name) would be indistinguishable from verified fact to the
        // auditor approving the payout.
        const mappedPayout: PayoutRequest = {
          id: String(raw.id),
          invoiceNumber: "",
          organizerName: raw.organizerName || "",
          organizerEmail: raw.organizerEmail || "",
          eventName: raw.eventName || "",
          eventDate: raw.eventDate || "",
          venue: raw.venueName || "",
          completionStatus: raw.eventStatus || "",
          revenue: raw.salesSummary?.grossRevenue || 0,
          netRevenue: raw.salesSummary?.netRevenue || 0,
          requestedAmount: raw.requestedAmount || 0,
          requestDate: raw.requestDate || "",
          status: mapPayoutStatus(raw.status),
          currentAuditor: "",
          organizerCompany: raw.organizerName || "",
          organizerPhone: raw.organizerPhone || "",
          organizerBusinessLicense: raw.organizerBusinessLicense || "",
          organizerStatus: (raw.organizerStatus === "approved" || raw.organizerStatus === "Approved" || raw.organizerStatus === "verified" || raw.organizerStatus === "Verified" ? "Verified" : "Pending") as any,
          // Real: rejected events by the same organizer, this one excluded.
          organizerPreviousViolations: raw.organizerPreviousViolations || 0,
          ticketCapacity: raw.ticketCapacity || 0,
          // 0 when the organizer was granted the role directly and never filed
          // an application; the profile link is hidden in that case.
          applicationId: raw.applicationId || 0,
          eventId: raw.eventId || 0,
          salesSummary: {
            ticketsSold: raw.salesSummary?.ticketsSold || 0,
            grossRevenue: raw.salesSummary?.grossRevenue || 0,
            platformFee: raw.salesSummary?.platformFee || 0,
            paymentGatewayFee: raw.salesSummary?.paymentGatewayFee || 0,
            ppn: raw.salesSummary?.ppn || 0,
            entertainmentTax: raw.salesSummary?.entertainmentTax || 0,
            refundAmount: raw.salesSummary?.refundAmount || 0,
            netRevenue: raw.salesSummary?.netRevenue || 0,
          },
          // Unticked by default. These are the auditor's OWN verification
          // steps; shipping them pre-ticked meant the work appeared done
          // before anyone had looked. They are local-only state today (see
          // handleUpdatePayoutChecklists) and are not persisted.
          financialChecklist: {
            revenueMatch: false,
            ticketSalesMatch: false,
            refundCalculated: false,
            platformFeeCorrect: false,
            taxCorrect: false,
            netRevenueCorrect: false,
          },
          complianceChecklist: {
            eventApproved: false,
            organizerVerified: false,
            requiredDocumentsComplete: false,
            noActiveInvestigation: false,
            noPendingRevision: false,
          },
          bankName: raw.bankName || "",
          bankAccountNumber: raw.bankAccountNumber || "",
          bankAccountHolder: raw.bankAccountHolder || "",
          // Real, from organizer_applications.bank_verification_status. Resets
          // to unverified whenever the organizer edits the account, so a
          // destination that moved since the last check shows as unverified.
          bankVerificationStatus:
            raw.bankVerificationStatus === "verified" ? "Verified" : "Unverified",
          fraudDetection: {
            duplicatePayout: raw.fraudDetection?.duplicatePayout || false,
            suspiciousRevenue: raw.fraudDetection?.suspiciousRevenue || false,
            hasAlert: raw.fraudDetection?.hasAlert || false,
            alertMessage: raw.fraudDetection?.alertMessage || "",
          },
          internalNotes: raw.internalNotes || "",
          financeNotes: "",
          timeline: (raw.timeline || []).map((t: any) => ({
            stage: t.action || "Verification",
            actor: t.actor || "System",
            timestamp: t.timestamp || "Just now",
            details: t.detail || "",
          })),
          revisionHistory: [],
          // No payout attachment storage exists yet; the two entries that used
          // to sit here were filenames that resolved to nothing.
          attachments: [],
        };
        setPayout(mappedPayout);
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
