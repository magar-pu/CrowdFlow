import { PayoutRequest, PayoutStatus } from "./types";

// Shared mapping between the payout API and the console's PayoutRequest shape.
//
// The list and detail endpoints return the same AuditorPayout envelope but
// populate different fields, and the console previously spread the LIST response
// straight into state. That left `revenue`/`netRevenue` undefined, so the first
// rendered row threw on `p.revenue.toLocaleString()` and the whole Payouts tab
// went blank — visible only once a filter actually matched a row.

// mapPayoutStatus converts the payouts.status enum to the console's vocabulary.
//
// The DB enum is {pending, processed, failed}. 'on_hold' is accepted here
// because auditor.HoldPayout writes it, but the enum has no such label, so that
// action currently fails at the database.
export function mapPayoutStatus(raw: unknown): PayoutStatus {
  switch (String(raw ?? "").toLowerCase()) {
    case "processed":
    case "paid":
      return "Paid";
    case "failed":
    case "rejected":
      return "Rejected";
    case "on_hold":
    case "on hold":
      return "On Hold";
    case "under_review":
    case "under review":
      return "Under Review";
    case "approved":
      return "Approved";
    case "processing":
      return "Processing";
    case "need_revision":
    case "need revision":
      return "Need Revision";
    default:
      return "Pending";
  }
}

// mapPayoutListItem builds a PayoutRequest from a LIST row. Fields the list
// endpoint does not compute are left at zero/empty rather than being invented —
// this feeds a screen that authorises money leaving the platform, and the table
// renders an em dash for anything absent.
export function mapPayoutListItem(raw: any): PayoutRequest {
  const sales = raw?.salesSummary ?? {};
  return {
    id: String(raw?.id ?? ""),
    invoiceNumber: "",
    organizerName: raw?.organizerName || "",
    organizerEmail: raw?.organizerEmail || "",
    eventName: raw?.eventName || "",
    eventDate: raw?.eventDate || "",
    venue: "",
    completionStatus: "",
    revenue: sales.grossRevenue ?? 0,
    netRevenue: sales.netRevenue ?? 0,
    requestedAmount: raw?.requestedAmount ?? 0,
    requestDate: raw?.requestDate || "",
    status: mapPayoutStatus(raw?.status),
    currentAuditor: "",
    organizerCompany: raw?.organizerName || "",
    organizerPhone: "",
    organizerBusinessLicense: "",
    organizerStatus: "Pending",
    organizerPreviousViolations: 0,
    ticketCapacity: 0,
    salesSummary: {
      ticketsSold: sales.ticketsSold ?? 0,
      grossRevenue: sales.grossRevenue ?? 0,
      platformFee: sales.platformFee ?? 0,
      paymentGatewayFee: sales.paymentGatewayFee ?? 0,
      entertainmentTax: sales.entertainmentTax ?? 0,
      vat: 0,
      refundAmount: sales.refundAmount ?? 0,
      chargebackAmount: 0,
      otherAdjustments: 0,
      netRevenue: sales.netRevenue ?? 0,
    },
    // The auditor's own verification steps: unticked until they do the work.
    financialChecklist: {
      revenueMatch: false,
      ticketSalesMatch: false,
      refundCalculated: false,
      chargebackApplied: false,
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
    bankName: "",
    bankAccountNumber: "",
    bankAccountHolder: "",
    swiftCode: "",
    bankVerificationStatus: "Unverified",
    fraudDetection: {
      duplicatePayout: raw?.fraudDetection?.duplicatePayout ?? false,
      suspiciousRevenue: raw?.fraudDetection?.suspiciousRevenue ?? false,
      unusualRefundRate: raw?.fraudDetection?.unusualRefundRate ?? false,
      highChargeback: raw?.fraudDetection?.highChargeback ?? false,
      multipleBankChanges: false,
      abnormalTicketSales: false,
      hasAlert: raw?.fraudDetection?.hasAlert ?? false,
      alertMessage: raw?.fraudDetection?.alertMessage ?? "",
    },
    internalNotes: raw?.internalNotes || "",
    financeNotes: "",
    timeline: [],
    revisionHistory: [],
    attachments: [],
  };
}
