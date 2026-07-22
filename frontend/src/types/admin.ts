export interface Event {
  id: string;
  name: string;
  date: string;
  venue: string;
  location: string;
  status: 'Active' | 'Draft' | 'In Review' | 'Rejected' | 'Completed';
  image: string;
  capacity: number;
  ticketsSold: number;
  totalRevenue: number;
  category: string;
  description: string;
}

// Venue and EventType intentionally use snake_case keys (unlike every other
// type in this file) because they come straight from the `event` package's
// GET /api/venues and GET /api/event-types routes, not the admin package's
// camelCase /api/v1/* routes. Don't "fix" the casing here — it'll break parsing.
export interface Venue {
  venue_id: number;
  name: string;
  address: string;
  city: string;
  province: string;
  total_capacity: number;
}

export interface EventType {
  event_type_id: number;
  event_type: string;
}

// EventDetail is the raw event-package shape (snake_case, real FKs) used to
// pre-fill and submit the workspace's editable Details tab - distinct from
// the display-mapped Event above, which has no venue_id/event_type_id/raw
// dates to round-trip through a form. Comes from GET /api/events/{id}.
export interface EventDetail {
  event_id: number;
  title: string;
  description: string;
  starts_at: string;
  ends_at: string;
  category: string;
  event_type_id: number;
  status: 'draft' | 'pending_review' | 'approved' | 'rejected';
  entertainment_tax_rate: number;
  entertainment_tax_passed_to_buyer: boolean;
  cover_image_url: string;
  venue?: Venue;
}

export interface UpdateEventPayload {
  title: string;
  description: string;
  venue_id: number;
  event_type_id: number;
  starts_at: string;
  ends_at: string;
  entertainment_tax_rate: number;
  entertainment_tax_passed_to_buyer: boolean;
}

export interface EventStatusLogEntry {
  id: string;
  actorName: string;
  fromStatus: 'draft' | 'pending_review' | 'approved' | 'rejected';
  toStatus: 'draft' | 'pending_review' | 'approved' | 'rejected';
  notes: string;
  createdAt: string;
}

// PlatformRole is the admin frontend's display union for a single role, as
// mapped from the DB's roles table by backend mapPlatformRole. "Mixed" is a
// synthesized value (not a real DB role) shown when a user holds more than one
// console role - see roleAssignments on User.
export type PlatformRole =
  | 'Buyer'
  | 'Seller'
  | 'Organizer'
  | 'Auditor'
  | 'Gate Scanner'
  | 'Admin'
  | 'Mixed';

// RoleAssignment is one row of a user's user_roles: the role plus the event it
// is scoped to (null/omitted for a platform-wide grant like Admin or Organizer).
// roleId is the DB roles.id, used to revoke this exact assignment.
export interface RoleAssignment {
  roleId: number;
  role: PlatformRole;
  eventId: number | null;
  eventName?: string | null;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: PlatformRole;
  // Full list of the user's role assignments (platform-wide + event-scoped).
  // Optional so older/mock payloads without it still parse; when present and
  // holding >1 console role, `role` is 'Mixed'.
  roleAssignments?: RoleAssignment[];
  status: 'Verified' | 'Pending' | 'Suspended';
  joinedAt: string;
  transactionsCount: number;
  profilePic: string;
}

export interface Scanner {
  id: string;
  name: string;
  deviceName: string;
  status: 'Online' | 'Offline' | 'Scanning';
  scansCount: number;
  lastSync: string;
  batteryLevel: number;
  assignedSection: string;
}

export interface Transaction {
  id: string;
  customerName: string;
  eventName: string;
  amount: number;
  method: 'Credit Card' | 'Apple Pay' | 'Crypto' | 'Bank Transfer';
  status: 'Success' | 'Pending' | 'Refunded';
  date: string;
}

export interface Payout {
  id: string;
  organizerName: string;
  eventName: string;
  amount: number;
  status: 'Processed' | 'Pending' | 'Failed';
  requestedDate: string;
}

export interface VerificationApplication {
  id: string;
  name: string;
  email: string;
  businessType: string;
  documentType: string;
  submittedAt: string;
  status: 'Pending' | 'Approved' | 'Rejected';
}

export interface SecurityAlert {
  id: string;
  title: string;
  type: 'Price Cap' | 'Duplicate Identity' | 'High Resell Rate' | 'Suspicious IP';
  description: string;
  severity: 'high' | 'medium' | 'low';
  timestamp: string;
}

export interface Activity {
  id: string;
  userName: string;
  action: string;
  detail: string;
  timestamp: string;
}

export interface TicketTier {
  id: string;
  name: string;
  description: string;
  price: number;
  capacity: number;
  sold: number;
  priceCap: number;
  color: string;
}

export interface VenueSection {
  id: string;
  name: string;
  capacity: number;
  occupied: number;
  color: string;
}

export interface APIError {
  code: string;
  message: string;
  details?: any;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: APIError;
}
