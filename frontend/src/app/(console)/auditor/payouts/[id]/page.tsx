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
        const raw = res.data;
        const mappedPayout: PayoutRequest = {
          id: String(raw.id),
          invoiceNumber: `INV-2026-${1000 + raw.id}`,
          organizerName: raw.organizerName || "Unknown Organizer",
          organizerEmail: raw.organizerEmail || "org@crowdflow.com",
          eventName: raw.eventName || "Event Name",
          eventDate: raw.eventDate || "2026-10-10",
          venue: "Default Venue",
          completionStatus: "Completed",
          revenue: raw.salesSummary?.grossRevenue || 0,
          netRevenue: raw.salesSummary?.netRevenue || 0,
          requestedAmount: raw.requestedAmount || 0,
          requestDate: raw.requestDate || "Just now",
          status: (raw.status === "processed" || raw.status === "Processed" ? "Paid" : raw.status === "failed" || raw.status === "Failed" ? "Rejected" : raw.status === "on_hold" || raw.status === "On Hold" ? "On Hold" : "Pending") as any,
          riskLevel: (raw.riskLevel || "Low") as any,
          riskScore: raw.riskScore || 20,
          currentAuditor: "Priya Nair",
          organizerCompany: raw.organizerName || "Organizer Company",
          organizerPhone: (raw as any).organizerPhone || "+62 812-3456-7890",
          organizerBusinessLicense: (raw as any).organizerBusinessLicense || "BL-2026-ID-00123",
          organizerStatus: ((raw as any).organizerStatus === "approved" || (raw as any).organizerStatus === "Approved" || (raw as any).organizerStatus === "verified" || (raw as any).organizerStatus === "Verified" ? "Verified" : "Pending") as any,
          organizerPreviousViolations: 0,
          ticketCapacity: 1000,
          salesSummary: {
            ticketsSold: raw.salesSummary?.ticketsSold || 0,
            grossRevenue: raw.salesSummary?.grossRevenue || 0,
            platformFee: raw.salesSummary?.platformFee || 0,
            paymentGatewayFee: raw.salesSummary?.paymentGatewayFee || 0,
            entertainmentTax: raw.salesSummary?.entertainmentTax || 0,
            vat: 0.0,
            refundAmount: raw.salesSummary?.refundAmount || 0,
            chargebackAmount: 0.0,
            otherAdjustments: 0.0,
            netRevenue: raw.salesSummary?.netRevenue || 0,
          },
          financialChecklist: {
            revenueMatch: true,
            ticketSalesMatch: true,
            refundCalculated: true,
            chargebackApplied: true,
            platformFeeCorrect: true,
            taxCorrect: true,
            netRevenueCorrect: true,
          },
          complianceChecklist: {
            eventApproved: true,
            organizerVerified: true,
            requiredDocumentsComplete: true,
            noActiveInvestigation: true,
            noPendingRevision: true,
          },
          bankName: raw.bankName || "Bank Central Asia (BCA)",
          bankAccountNumber: raw.bankAccountNumber || "8024927501",
          bankAccountHolder: raw.bankAccountHolder || raw.organizerName || "",
          swiftCode: "CENIDJA",
          bankVerificationStatus: "Verified",
          fraudDetection: {
            duplicatePayout: raw.fraudDetection?.duplicatePayout || false,
            suspiciousRevenue: raw.fraudDetection?.suspiciousRevenue || false,
            unusualRefundRate: raw.fraudDetection?.unusualRefundRate || false,
            highChargeback: raw.fraudDetection?.highChargeback || false,
            multipleBankChanges: false,
            abnormalTicketSales: false,
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
          attachments: [
            { name: "invoice.pdf", type: "Invoice" },
            { name: "revenue-report.xlsx", type: "Revenue Report" },
          ],
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
    const res = await handleUpdatePayoutStatus(id, status, notes, financeNotes);
    if (res.success) await loadDetail();
    return res;
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
