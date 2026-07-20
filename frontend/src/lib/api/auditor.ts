import { apiRequest } from "@/utils/api";
import { ApiResponse } from "@/types/api";
import { EventSubmission, AuditorActivity, OrganizerVerification } from "@/app/auditor/types";

export interface DashboardStats {
  pendingReviews: number;
  approved: number;
  rejected: number;
  pendingOrganizers: number;
  documentsWaiting: number;
  pendingPayouts: number;
  pendingPayoutAmount: number;
  fraudAlerts: number;
  avgReviewTimeHours: number;
}

export interface DashboardResponse {
  stats: DashboardStats;
  recentActivity: AuditorActivity[];
  reviewQueue: EventSubmission[];
}

/**
 * Fetch auditor dashboard summary, including counters, recent activity, and top pending reviews.
 */
export async function getDashboardData(): Promise<ApiResponse<DashboardResponse>> {
  return apiRequest<DashboardResponse>("/api/auditor/dashboard", {
    method: "GET",
  });
}

/**
 * Fetch paginated list of auditor activities.
 */
export async function listActivity(page: number = 1, limit: number = 10): Promise<ApiResponse<AuditorActivity[]>> {
  return apiRequest<AuditorActivity[]>(`/api/auditor/activity?page=${page}&limit=${limit}`, {
    method: "GET",
  });
}

export interface ListEventReviewsFilters {
  status?: string;
  riskLevel?: string;
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * Fetch paginated and filtered event reviews queue.
 */
export async function listEventReviews(filters: ListEventReviewsFilters = {}): Promise<ApiResponse<EventSubmission[]>> {
  const params = new URLSearchParams();
  if (filters.status) params.append("status", filters.status);
  if (filters.riskLevel) params.append("riskLevel", filters.riskLevel);
  if (filters.search) params.append("search", filters.search);
  if (filters.page) params.append("page", String(filters.page));
  if (filters.limit) params.append("limit", String(filters.limit));

  return apiRequest<EventSubmission[]>(`/api/auditor/reviews?${params.toString()}`, {
    method: "GET",
  });
}

/**
 * Get detailed submission review for a single event.
 */
export async function getEventReview(id: number | string): Promise<ApiResponse<EventSubmission>> {
  return apiRequest<EventSubmission>(`/api/auditor/reviews/${id}`, {
    method: "GET",
  });
}

/**
 * Approve event submission.
 */
export async function approveEventReview(id: number | string, notes: string): Promise<ApiResponse<void>> {
  return apiRequest<void>(`/api/auditor/reviews/${id}/approve`, {
    method: "POST",
    body: JSON.stringify({ notes }),
  });
}

/**
 * Reject event submission.
 */
export async function rejectEventReview(id: number | string, reason: string, notes: string): Promise<ApiResponse<void>> {
  return apiRequest<void>(`/api/auditor/reviews/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason, notes }),
  });
}

/**
 * Request event changes (re-verify docs / venue validation stage).
 */
export async function requestEventChanges(id: number | string, notes: string): Promise<ApiResponse<void>> {
  return apiRequest<void>(`/api/auditor/reviews/${id}/request-changes`, {
    method: "POST",
    body: JSON.stringify({ notes }),
  });
}

/**
 * Update event review stage.
 */
export async function updateEventReviewStage(id: number | string, stage: string): Promise<ApiResponse<void>> {
  return apiRequest<void>(`/api/auditor/reviews/${id}/stage`, {
    method: "PATCH",
    body: JSON.stringify({ stage }),
  });
}

export interface AddRevisionPayload {
  category: string;
  title: string;
  description: string;
  requiredAction: string;
  priority?: string;
  deadline?: string;
}

/**
 * Add revision ticket to event.
 */
export async function addEventRevision(id: number | string, payload: AddRevisionPayload): Promise<ApiResponse<void>> {
  return apiRequest<void>(`/api/auditor/reviews/${id}/revisions`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * Verify document inside event review context.
 */
export async function verifyReviewDocument(eventId: number | string, docId: number | string): Promise<ApiResponse<void>> {
  return apiRequest<void>(`/api/auditor/reviews/${eventId}/documents/${docId}/verify`, {
    method: "PATCH",
  });
}

/**
 * Reject document inside event review context.
 */
export async function rejectReviewDocument(eventId: number | string, docId: number | string, reason: string): Promise<ApiResponse<void>> {
  return apiRequest<void>(`/api/auditor/reviews/${eventId}/documents/${docId}/reject`, {
    method: "PATCH",
    body: JSON.stringify({ reason }),
  });
}

export interface ListDocumentsFilters {
  status?: string;
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface AuditorDocument {
  id: number;
  applicationId: number;
  fileName: string;
  category: string;
  eventName: string;
  organizerName: string;
  status: 'WAITING REVIEW' | 'VERIFIED' | 'REJECTED';
  fileUrl: string;
  uploadedAt: string;
}

/**
 * Fetch list of all organizer documents in verification queue.
 */
export async function listDocuments(filters: ListDocumentsFilters = {}): Promise<ApiResponse<AuditorDocument[]>> {
  const params = new URLSearchParams();
  if (filters.status) params.append("status", filters.status);
  if (filters.category) params.append("category", filters.category);
  if (filters.search) params.append("search", filters.search);
  if (filters.page) params.append("page", String(filters.page));
  if (filters.limit) params.append("limit", String(filters.limit));

  return apiRequest<AuditorDocument[]>(`/api/auditor/documents?${params.toString()}`, {
    method: "GET",
  });
}

/**
 * Get details of a single verification document.
 */
export async function getDocument(docId: number | string): Promise<ApiResponse<AuditorDocument>> {
  return apiRequest<AuditorDocument>(`/api/auditor/documents/${docId}`, {
    method: "GET",
  });
}

/**
 * Verify document.
 */
export async function verifyDocument(docId: number | string): Promise<ApiResponse<void>> {
  return apiRequest<void>(`/api/auditor/documents/${docId}/verify`, {
    method: "PATCH",
  });
}

/**
 * Reject document.
 */
export async function rejectDocument(docId: number | string, reason: string): Promise<ApiResponse<void>> {
  return apiRequest<void>(`/api/auditor/documents/${docId}/reject`, {
    method: "PATCH",
    body: JSON.stringify({ reason }),
  });
}

export interface ListOrganizersFilters {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * Fetch list of all organizer applications in onboarding verification queue.
 */
export async function listOrganizers(filters: ListOrganizersFilters = {}): Promise<ApiResponse<OrganizerVerification[]>> {
  const params = new URLSearchParams();
  if (filters.status) params.append("status", filters.status);
  if (filters.search) params.append("search", filters.search);
  if (filters.page) params.append("page", String(filters.page));
  if (filters.limit) params.append("limit", String(filters.limit));

  return apiRequest<OrganizerVerification[]>(`/api/auditor/organizers?${params.toString()}`, {
    method: "GET",
  });
}

/**
 * Get details of a single organizer application.
 */
export async function getOrganizer(appId: number | string): Promise<ApiResponse<OrganizerVerification>> {
  return apiRequest<OrganizerVerification>(`/api/auditor/organizers/${appId}`, {
    method: "GET",
  });
}

/**
 * Approve organizer application.
 */
export async function approveOrganizer(appId: number | string, notes: string): Promise<ApiResponse<void>> {
  return apiRequest<void>(`/api/auditor/organizers/${appId}/approve`, {
    method: "POST",
    body: JSON.stringify({ notes }),
  });
}

/**
 * Reject organizer application.
 */
export async function rejectOrganizer(appId: number | string, reason: string, notes: string): Promise<ApiResponse<void>> {
  return apiRequest<void>(`/api/auditor/organizers/${appId}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason, notes }),
  });
}

/**
 * Update organizer application review status.
 */
export async function updateOrganizerStatus(appId: number | string, status: string, notes: string, feedback: string): Promise<ApiResponse<void>> {
  return apiRequest<void>(`/api/auditor/organizers/${appId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, internalNotes: notes, organizerFeedback: feedback }),
  });
}

export interface ListPayoutsFilters {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PayoutSalesDTO {
  ticketsSold: number;
  grossRevenue: number;
  platformFee: number;
  paymentGatewayFee: number;
  entertainmentTax: number;
  refundAmount: number;
  netRevenue: number;
}

export interface FraudSignalsDTO {
  duplicatePayout: boolean;
  suspiciousRevenue: boolean;
  unusualRefundRate: boolean;
  highChargeback: boolean;
  hasAlert: boolean;
  alertMessage: string;
}

export interface AuditorPayoutDTO {
  id: number;
  organizerName: string;
  organizerEmail: string;
  eventName: string;
  eventDate: string;
  requestedAmount: number;
  requestDate: string;
  status: string;
  riskLevel: string;
  riskScore: number;
  salesSummary: PayoutSalesDTO;
  bankName: string;
  bankAccountNumber: string;
  bankAccountHolder: string;
  fraudDetection: FraudSignalsDTO;
  internalNotes: string;
  timeline: { id: number; actor: string; action: string; detail: string; timestamp: string }[];
}

/**
 * Fetch list of all payout requests in queue.
 */
export async function listPayouts(filters: ListPayoutsFilters = {}): Promise<ApiResponse<AuditorPayoutDTO[]>> {
  const params = new URLSearchParams();
  if (filters.status) params.append("status", filters.status);
  if (filters.search) params.append("search", filters.search);
  if (filters.page) params.append("page", String(filters.page));
  if (filters.limit) params.append("limit", String(filters.limit));

  return apiRequest<AuditorPayoutDTO[]>(`/api/auditor/payouts?${params.toString()}`, {
    method: "GET",
  });
}

/**
 * Get details of a single payout request.
 */
export async function getPayout(payoutId: number | string): Promise<ApiResponse<AuditorPayoutDTO>> {
  return apiRequest<AuditorPayoutDTO>(`/api/auditor/payouts/${payoutId}`, {
    method: "GET",
  });
}

/**
 * Approve payout request.
 */
export async function approvePayout(payoutId: number | string, internalNotes: string, financeNotes: string): Promise<ApiResponse<void>> {
  return apiRequest<void>(`/api/auditor/payouts/${payoutId}/approve`, {
    method: "POST",
    body: JSON.stringify({ internalNotes, financeNotes }),
  });
}

/**
 * Reject payout request.
 */
export async function rejectPayout(payoutId: number | string, reason: string, internalNotes: string): Promise<ApiResponse<void>> {
  return apiRequest<void>(`/api/auditor/payouts/${payoutId}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason, internalNotes }),
  });
}

/**
 * Hold payout request.
 */
export async function holdPayout(payoutId: number | string, reason: string): Promise<ApiResponse<void>> {
  return apiRequest<void>(`/api/auditor/payouts/${payoutId}/hold`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}
