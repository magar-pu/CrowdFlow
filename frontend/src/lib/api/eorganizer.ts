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
  status: string;
  image: string;
}

export interface DashboardResponse {
  stats: DashboardStats;
  recentOrders: RecentOrder[];
  recentEvents: RecentEvent[];
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
  locationType: string;
  location: string;
  locationAddress: string;
  venueName: string;
  capacity: number;
  sold: number;
  revenue: number;
  status: string;
  image: string;
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

export async function listOrganizerEvents(): Promise<ApiResponse<OrganizerEvent[]>> {
  return apiRequest<OrganizerEvent[]>("/api/organizer/events", {
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

export async function createOrganizerEvent(event: Omit<OrganizerEvent, "id" | "sold" | "revenue">): Promise<ApiResponse<OrganizerEvent>> {
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

export async function getVenueLayout(eventId: number): Promise<ApiResponse<VenueSection[]>> {
  return apiRequest<VenueSection[]>(`/api/organizer/events/${eventId}/venue`, {
    method: "GET",
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

// Orders & Refunds
export async function listOrders(): Promise<ApiResponse<OrganizerOrder[]>> {
  return apiRequest<OrganizerOrder[]>("/api/organizer/orders", {
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
