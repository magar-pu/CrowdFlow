import { apiRequest } from "@/utils/api";
import { ApiResponse } from "@/types/api";

// TypeScript Interfaces matching Go Backend structs
export interface DashboardStats {
  totalRevenue: number;
  activeEvents: number;
  ticketsSold: number;
  grossSales: number;
  verificationQueue: number;
  activeResale: number;
}

export interface RecentOrder {
  id: string;
  customerName: string;
  customerEmail: string;
  eventName: string;
  ticketType: string;
  paymentMethod: string;
  amount: number;
  status: string;
  time: string;
}

export interface RecentEvent {
  id: string;
  name: string;
  category: string;
  location: string;
  venueName: string;
  capacity: number;
  sold: number;
  revenue: number;
  date?: string;
  status: string;
  image: string;
}

export interface DashboardResponse {
  stats: DashboardStats;
  recentOrders: RecentOrder[];
  recentEvents: RecentEvent[];
}

/** A venue created inline from the workspace, when the one the organizer wants
 *  isn't in the catalogue yet. Mirrors the backend NewVenueInput. */
export interface NewVenueInput {
  name: string;
  address: string;
  city: string;
  province?: string;
  postalCode?: string;
  totalCapacity?: number;
}

export interface OrganizerEvent {
  id: string;
  name: string;
  category: string;
  description: string;
  date: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  // 0 when no venue has been picked yet — the creation wizard doesn't ask for
  // one, it's set later in the workspace's Venue tab.
  venueId: number;
  location: string;
  locationAddress: string;
  venueName: string;
  venueCity: string;
  capacity: number;
  sold: number;
  revenue: number;
  status: string;
  image: string;
  /** Whether the organizer has put this approved event on the public listing. */
  published?: boolean;
}

/** The payload the creation wizard sends: identity + schedule only. */
export type CreateOrganizerEventInput = Pick<
  OrganizerEvent,
  | "name"
  | "category"
  | "description"
  | "date"
  | "startDate"
  | "startTime"
  | "endDate"
  | "endTime"
  | "capacity"
  | "status"
  | "image"
>;

/** The body of PUT /api/organizer/events/{id}/venue — one of the two. */
export interface SetEventVenueInput {
  venueId?: number;
  newVenue?: NewVenueInput;
}

export interface OrganizerTicketTier {
  id: string;
  name: string;
  price: number;
  sold: number;
  capacity: number;
  status?: string;
  maxPerOrder?: number;
  salesStart?: string;
  salesEnd?: string;
  description?: string;
}

export interface VenueSection {
  id: string;
  name: string;
  type: "seats" | "standing";
  capacity: number;
  sold: number;
  price: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rows?: number;
  cols?: number;
  gate: string;
}

export interface OrganizerOrder {
  id: string;
  customerName: string;
  customerEmail: string;
  eventName: string;
  ticketType: string;
  paymentMethod: string;
  amount: number;
  status: string;
  time: string;
}

export interface OrganizerRefund {
  id: string;
  orderId: string;
  customerName: string;
  eventName: string;
  amount: number;
  reason: string;
  status: string;
  time: string;
}

export interface OrganizerAttendee {
  id: string;
  name: string;
  email: string;
  ticketType: string;
  status: string;
  checkInTime?: string;
  seatNumber?: string;
}

export interface OrganizerFinance {
  grossSales: number;
  netRevenue: number;
  platformFeeTotal: number;
  gatewayFeeTotal: number;
  taxTotal: number;
  refundedAmount: number;
  payoutBalance: number;
}

export interface OrganizerPayout {
  id: number;
  eventId: number;
  eventName: string;
  amount: number;
  status: string;
  requestedAt: string;
  processedAt?: string;
}

export interface AnalyticsPoint {
  date: string;
  sales: number;
  tickets: number;
}

export interface OrganizerAnalytics {
  points: AnalyticsPoint[];
}

// eorganizer Dashboard & Panel API calls
export async function getDashboardData(): Promise<ApiResponse<DashboardResponse>> {
  return apiRequest<DashboardResponse>("/api/organizer/dashboard", {
    method: "GET",
  });
}

/**
 * Lists the organizer's events. `archived: true` returns the archive instead of
 * the active list — the two views are mutually exclusive, since an archived
 * event appearing next to live ones defeats the point of archiving.
 */
export async function listOrganizerEvents(archived = false): Promise<ApiResponse<OrganizerEvent[]>> {
  return apiRequest<OrganizerEvent[]>(`/api/organizer/events${archived ? "?archived=true" : ""}`, {
    method: "GET",
  });
}

export async function getOrganizerEvent(eventId: number): Promise<ApiResponse<OrganizerEvent>> {
  return apiRequest<OrganizerEvent>(`/api/organizer/events/${eventId}`, {
    method: "GET",
  });
}

export async function deleteOrganizerEvent(eventId: number): Promise<ApiResponse<void>> {
  return apiRequest<void>(`/api/organizer/events/${eventId}`, {
    method: "DELETE",
  });
}

/**
 * Pulls an event back out of the auditor queue and returns it to draft.
 * Refused with 409 REVIEW_IN_PROGRESS once an auditor has claimed it.
 */
export async function withdrawOrganizerEvent(eventId: number): Promise<ApiResponse<void>> {
  return apiRequest<void>(`/api/organizer/events/${eventId}/withdraw`, {
    method: "POST",
  });
}

/**
 * Hides a terminal (draft or rejected) event from the active list without
 * touching its status, so the review trail survives. Reversible.
 */
export async function archiveOrganizerEvent(eventId: number): Promise<ApiResponse<void>> {
  return apiRequest<void>(`/api/organizer/events/${eventId}/archive`, {
    method: "POST",
  });
}

export async function unarchiveOrganizerEvent(eventId: number): Promise<ApiResponse<void>> {
  return apiRequest<void>(`/api/organizer/events/${eventId}/archive`, {
    method: "DELETE",
  });
}

/**
 * Puts an auditor-approved event on the public listing. The organizer has the
 * final call — approval makes an event eligible, it does not publish it.
 *
 * Note the path: PATCH .../publish already means "submit to the auditor".
 */
export async function listEventPublicly(eventId: number): Promise<ApiResponse<void>> {
  return apiRequest<void>(`/api/organizer/events/${eventId}/listing`, {
    method: "POST",
  });
}

/**
 * Withdraws the event from the public listing. It leaves browse/search and new
 * bookings are rejected; tickets already sold stay valid and direct links keep
 * working for the people holding them. Reversible without re-approval.
 */
export async function unlistEvent(eventId: number): Promise<ApiResponse<void>> {
  return apiRequest<void>(`/api/organizer/events/${eventId}/listing`, {
    method: "DELETE",
  });
}

// Event types drive the Category dropdown. The create endpoint resolves an
// event's category by NAME (event_types.event_type), so the dropdown submits
// the type name — not the id.
export interface EventType {
  event_type_id: number;
  event_type: string;
}

export async function listEventTypes(): Promise<ApiResponse<EventType[]>> {
  return apiRequest<EventType[]>("/api/v1/event-types", {
    method: "GET",
  });
}

export async function createOrganizerEvent(event: CreateOrganizerEventInput): Promise<ApiResponse<OrganizerEvent>> {
  return apiRequest<OrganizerEvent>("/api/organizer/events", {
    method: "POST",
    body: JSON.stringify(event),
  });
}

export async function updateOrganizerEvent(eventId: number, event: Partial<OrganizerEvent>): Promise<ApiResponse<void>> {
  return apiRequest<void>(`/api/organizer/events/${eventId}`, {
    method: "PUT",
    body: JSON.stringify(event),
  });
}

export async function publishOrganizerEvent(eventId: number): Promise<ApiResponse<void>> {
  return apiRequest<void>(`/api/organizer/events/${eventId}/publish`, {
    method: "PATCH",
  });
}

/**
 * PUT /api/organizer/events/{id}/venue — bind the event to a venue.
 *
 * This is where an event first gets a venue: the creation wizard captures only
 * identity and schedule. Pass venueId to pick from the catalogue, or newVenue to
 * create one inline.
 *
 * Changing an already-set venue clears the bound layout and its seat overlay
 * (they belong to the old venue's geometry); the backend refuses outright if any
 * seat is already sold or blocked.
 */
export async function setEventVenue(eventId: number, input: SetEventVenueInput): Promise<ApiResponse<void>> {
  return apiRequest<void>(`/api/organizer/events/${eventId}/venue`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

// Ticket Tier CRUD API calls
export async function listTicketTiers(eventId: number): Promise<ApiResponse<OrganizerTicketTier[]>> {
  return apiRequest<OrganizerTicketTier[]>(`/api/organizer/events/${eventId}/ticket-tiers`, {
    method: "GET",
  });
}

export async function createTicketTier(eventId: number, tier: Omit<OrganizerTicketTier, "id" | "sold">): Promise<ApiResponse<void>> {
  return apiRequest<void>(`/api/organizer/events/${eventId}/ticket-tiers`, {
    method: "POST",
    body: JSON.stringify(tier),
  });
}

export async function updateTicketTier(eventId: number, tierId: number, tier: Partial<OrganizerTicketTier>): Promise<ApiResponse<void>> {
  return apiRequest<void>(`/api/organizer/events/${eventId}/ticket-tiers/${tierId}`, {
    method: "PUT",
    body: JSON.stringify(tier),
  });
}

export async function deleteTicketTier(eventId: number, tierId: number): Promise<ApiResponse<void>> {
  return apiRequest<void>(`/api/organizer/events/${eventId}/ticket-tiers/${tierId}`, {
    method: "DELETE",
  });
}

// Seat overlay: paint the event's ticket tiers onto individual seats of its
// bound layout, which seeds the per-seat availability matrix booking reads
// from. The layout itself is an untiered, reusable template.
export interface TierSeating {
  ticket_tier_id: number;
  tier_name: string;
  seat_count: number;
  available: number;
  sold: number;
  blocked: number;
}

export interface EventSeating {
  layout_id: number | null;
  tiers: TierSeating[];
  total_seats: number;
  /** Seats in the bound layout with no tier yet — these block submission. */
  untiered_seats: number;
}

export interface SeatingAssignment {
  seat_ids: number[];
  ticket_tier_id: number;
}

export async function getEventSeating(eventId: number): Promise<ApiResponse<EventSeating>> {
  return apiRequest<EventSeating>(`/api/organizer/events/${eventId}/seating`, {
    method: "GET",
  });
}

export async function seedEventSeating(
  eventId: number,
  assignments: SeatingAssignment[]
): Promise<ApiResponse<{ message: string }>> {
  return apiRequest(`/api/organizer/events/${eventId}/seating`, {
    method: "PUT",
    body: JSON.stringify({ assignments }),
  });
}

// Orders & Refunds
export async function listOrders(): Promise<ApiResponse<OrganizerOrder[]>> {
  return apiRequest<OrganizerOrder[]>("/api/organizer/orders", {
    method: "GET",
  });
}

/** The workspace's Recent Transactions table: real orders for one event. */
export async function listEventOrders(eventId: number): Promise<ApiResponse<OrganizerOrder[]>> {
  return apiRequest<OrganizerOrder[]>(`/api/organizer/events/${eventId}/orders`, {
    method: "GET",
  });
}

export async function getOrderDetails(orderId: string): Promise<ApiResponse<OrganizerOrder>> {
  return apiRequest<OrganizerOrder>(`/api/organizer/orders/${orderId}`, {
    method: "GET",
  });
}

export async function listRefunds(): Promise<ApiResponse<OrganizerRefund[]>> {
  return apiRequest<OrganizerRefund[]>("/api/organizer/refunds", {
    method: "GET",
  });
}

// Attendees
export async function listAttendees(): Promise<ApiResponse<OrganizerAttendee[]>> {
  return apiRequest<OrganizerAttendee[]>("/api/organizer/attendees", {
    method: "GET",
  });
}

export async function listEventAttendees(eventId: number): Promise<ApiResponse<OrganizerAttendee[]>> {
  return apiRequest<OrganizerAttendee[]>(`/api/organizer/events/${eventId}/attendees`, {
    method: "GET",
  });
}

// Finance & Payouts
export async function getFinanceSummary(): Promise<ApiResponse<OrganizerFinance>> {
  return apiRequest<OrganizerFinance>("/api/organizer/finance", {
    method: "GET",
  });
}

export async function listPayouts(): Promise<ApiResponse<OrganizerPayout[]>> {
  return apiRequest<OrganizerPayout[]>("/api/organizer/payouts", {
    method: "GET",
  });
}

export async function createPayoutRequest(eventId: number, amount: number): Promise<ApiResponse<void>> {
  return apiRequest<void>("/api/organizer/payout-request", {
    method: "POST",
    body: JSON.stringify({ eventId, amount }),
  });
}

export async function getAnalytics(range: string = "30d"): Promise<ApiResponse<OrganizerAnalytics>> {
  return apiRequest<OrganizerAnalytics>(`/api/organizer/analytics?range=${range}`, {
    method: "GET",
  });
}

export async function getEventAnalytics(eventId: number, range: string = "30d"): Promise<ApiResponse<OrganizerAnalytics>> {
  return apiRequest<OrganizerAnalytics>(`/api/organizer/events/${eventId}/analytics?range=${range}`, {
    method: "GET",
  });
}

/** Live gate figures for one event, straight from ticket_checkins/scanner_logs. */
export interface EventCheckInStats {
  totalCheckedIn: number;
  totalTickets: number;
  /** Mean scanner round-trip in ms; 0 when nothing has been scanned yet. */
  avgScanMs: number;
  gates: GateCheckInStat[];
  devices: DeviceCheckInStat[];
  hourly: HourlyCheckInPoint[];
}

export interface DeviceCheckInStat {
  deviceId: number;
  scans: number;
}

export interface GateCheckInStat {
  gateId: number;
  gateName: string;
  status: string;
  scans: number;
  deviceCount: number;
}

export interface HourlyCheckInPoint {
  hour: string;
  scans: number;
}

export async function getEventCheckInStats(eventId: number): Promise<ApiResponse<EventCheckInStats>> {
  return apiRequest<EventCheckInStats>(`/api/organizer/events/${eventId}/checkin-stats`, {
    method: "GET",
  });
}

/* ------------------------------------------------------------------ *
 * Per-event documents
 *
 * Distinct from the ACCOUNT-level documents (KTP/NPWP/NIB) an organizer
 * submits once when applying. These are re-submitted per event and are what
 * the auditor evaluates before approving it.
 * ------------------------------------------------------------------ */

export type EventDocumentType =
  | "EVENT_PROPOSAL"
  | "CROWD_PERMIT"
  | "PIC_ID"
  | "VENUE_PERMIT";

export type EventDocumentStatus = "pending_verification" | "verified" | "rejected";

export interface EventDocument {
  id: number;
  event_id: number;
  document_type: EventDocumentType;
  file_name: string;
  file_size: number;
  content_type: string;
  status: EventDocumentStatus;
  /** Auditor's reason, present only when status is "rejected". */
  review_notes?: string;
  uploaded_at: string;
}

/**
 * A freshly minted view link. Deliberately NOT part of the list payload: a
 * presigned URL is a bearer credential — anyone holding it reads the file with no
 * identity check — so one is fetched only when a specific document is opened.
 */
export interface EventDocumentURL {
  url: string;
  /** Seconds until the link stops working. */
  expires_in: number;
}

export interface EventDocumentsResponse {
  documents: EventDocument[];
  /** Types that must be present before the event may be submitted for review. */
  required: EventDocumentType[];
  /** Required types still missing or rejected. */
  missing: EventDocumentType[];
  complete: boolean;
}

export async function listEventDocuments(eventId: number): Promise<ApiResponse<EventDocumentsResponse>> {
  return apiRequest<EventDocumentsResponse>(`/api/organizer/events/${eventId}/documents`, {
    method: "GET",
  });
}

/**
 * Uploads one document. Re-uploading a type REPLACES the existing file and resets
 * its review status, so there is no separate "update" call.
 *
 * Sends FormData deliberately — apiRequest leaves the Content-Type unset for
 * FormData so the browser can write the multipart boundary itself.
 */
export async function uploadEventDocument(
  eventId: number,
  documentType: EventDocumentType,
  file: File
): Promise<ApiResponse<EventDocument>> {
  const body = new FormData();
  body.append("document_type", documentType);
  body.append("file", file);

  return apiRequest<EventDocument>(`/api/organizer/events/${eventId}/documents`, {
    method: "POST",
    body,
  });
}

export interface EventCoverImage {
  imageUrl: string;
}

/**
 * Replaces the event's cover art. The file goes to the PUBLIC bucket (it is
 * rendered on the public event page), unlike event documents which are private.
 * Returns the persisted URL so the caller can drop its local blob: preview.
 */
export async function uploadEventCover(
  eventId: number,
  file: File
): Promise<ApiResponse<EventCoverImage>> {
  const body = new FormData();
  body.append("file", file);

  return apiRequest<EventCoverImage>(`/api/organizer/events/${eventId}/cover`, {
    method: "POST",
    body,
  });
}

/** Mints a short-lived link for one document. Call this on an explicit view action. */
export async function getEventDocumentUrl(
  eventId: number,
  docId: number
): Promise<ApiResponse<EventDocumentURL>> {
  return apiRequest<EventDocumentURL>(`/api/organizer/events/${eventId}/documents/${docId}/url`, {
    method: "GET",
  });
}

export async function deleteEventDocument(eventId: number, docId: number): Promise<ApiResponse<void>> {
  return apiRequest<void>(`/api/organizer/events/${eventId}/documents/${docId}`, {
    method: "DELETE",
  });
}

export async function createVenueSection(eventId: number, section: Omit<VenueSection, "id" | "sold">): Promise<ApiResponse<void>> {
  return apiRequest<void>(`/api/organizer/events/${eventId}/venue`, {
    method: "POST",
    body: JSON.stringify(section),
  });
}

export async function updateVenueSection(eventId: number, sectionId: number, section: Partial<VenueSection>): Promise<ApiResponse<void>> {
  return apiRequest<void>(`/api/organizer/events/${eventId}/venue/${sectionId}`, {
    method: "PUT",
    body: JSON.stringify(section),
  });
}

export async function deleteVenueSection(eventId: number, sectionId: number): Promise<ApiResponse<void>> {
  return apiRequest<void>(`/api/organizer/events/${eventId}/venue/${sectionId}`, {
    method: "DELETE",
  });
}

export interface CheckInResult {
  attendeeName: string;
  ticketType: string;
  seatNumber: string;
  status: string;
}

export async function checkInAttendee(eventId: number, qrToken: string): Promise<ApiResponse<CheckInResult>> {
  return apiRequest<CheckInResult>(`/api/organizer/events/${eventId}/checkin`, {
    method: "POST",
    body: JSON.stringify({ qr_token: qrToken }),
  });
}

export interface ApiNotification {
  id: number;
  userId: number;
  title: string;
  detail: string;
  resourceType?: string;
  resourceId?: string;
  isRead: boolean;
  createdAt: string;
}

export async function listNotifications(): Promise<ApiResponse<ApiNotification[]>> {
  return apiRequest<ApiNotification[]>("/api/notifications", {
    method: "GET",
  });
}

export async function markNotificationsRead(notificationIds?: number[]): Promise<ApiResponse<void>> {
  return apiRequest<void>("/api/notifications/read", {
    method: "PUT",
    body: notificationIds ? JSON.stringify({ notificationIds }) : undefined,
  });
}

export interface EventRevisionFeedback {
  eventId: number;
  eventStatus: string;
  auditorNotes?: string;
  assignedAuditorName?: string;
  stage?: string;
  revisions?: Array<{
    id: number;
    category: string;
    title: string;
    description: string;
    requiredAction: string;
    priority: string;
    status: string;
    organizerComment?: string;
    organizerActionTaken?: string;
    organizerFile?: string;
    respondedAt?: string;
  }>;
  statusLogs?: Array<{
    fromStatus: string;
    toStatus: string;
    notes?: string;
    createdAt: string;
  }>;
}

export async function getEventRevisions(eventId: number): Promise<ApiResponse<EventRevisionFeedback>> {
  return apiRequest<EventRevisionFeedback>(`/api/organizer/events/${eventId}/revisions`, {
    method: "GET",
  });
}

export async function respondToEventRevision(
  eventId: number,
  revId: number,
  comment: string,
  actionTaken: string,
  proofFile?: string
): Promise<ApiResponse<void>> {
  return apiRequest<void>(`/api/organizer/events/${eventId}/revisions/${revId}/respond`, {
    method: "POST",
    body: JSON.stringify({ comment, actionTaken, proofFile }),
  });
}
