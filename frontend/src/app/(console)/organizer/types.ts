export type AppView =
  | 'dashboard'
  | 'events'
  | 'orders'
  | 'attendees'
  | 'finance'
  | 'reports'
  | 'co-organizers'
  | 'settings'
  | 'create-event'
  | 'workspace';

export interface EventItem {
  id: string;
  name: string;
  category: string;
  description: string;
  date: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  // The venue is set in the event workspace, not the creation wizard, so a
  // draft can legitimately have none: venueId is 0 and the rest are empty.
  venueId: number;
  location: string;
  locationAddress: string;
  venueName: string;
  venueCity: string;
  capacity: number;
  sold: number;
  revenue: number;
  // "Approved" means an auditor cleared the event but the organizer has not put
  // it on the public listing yet. "Live" means approved AND published.
  status: "Live" | "Approved" | "Scheduled" | "Draft" | "Rejected" | "Need Revision" | "In Review" | "Archived";
  image: string;
  /**
   * True when this event belongs to another organizer who delegated it to you
   * as a co-organizer. The console lists owned and delegated events together —
   * they are managed identically — so the card has to say which is which.
   */
  delegated: boolean;
  /** The owner's name. Only rendered when `delegated`. */
  ownerName: string;
}

/**
 * What the creation wizard produces: the event's identity and schedule, nothing
 * else. The venue, ticket tiers, layout and seating are all configured in the
 * event workspace afterwards.
 */
export type CreateEventDraft = Pick<
  EventItem,
  | 'name'
  | 'category'
  | 'description'
  | 'date'
  | 'startDate'
  | 'startTime'
  | 'endDate'
  | 'endTime'
  | 'capacity'
  | 'status'
  | 'image'
>;

export interface TicketTier {
  id: string;
  name: string;
  price: number;
  sold: number;
  capacity: number;
  // "Scheduled" and "Expired" describe the sales WINDOW, not stock. A tier
  // outside its window is not buyable and is absent from the public listing,
  // so the console must not show it as "On Sale".
  status?: "Selling Fast" | "On Sale" | "Sold Out" | "Scheduled" | "Expired";
  color?: string;
  salesStart?: string;
  salesEnd?: string;
  description?: string;
  zoneId?: string;
  zoneName?: string;
}

export interface VenueElement {
  id: string;
  kind: 'zone' | 'infra';
  subtype: 'VIP' | 'Festival' | 'Grandstand' | 'Stage' | 'Exit' | 'Restroom' | 'Bar';
  label: string;
  capacity?: number;
  x: number;
  y: number;
}

export interface ScannerDevice {
  id: string;
  name: string;
  staff: string;
  staffAvatar?: string;
  gate: string;
  status: "online" | "offline";
  battery: number;
  lastSync: string;
  scans: number;
  role: "QR Scanner" | "Manual Validation" | "Supervisor";
  permissions: string[];
  deviceToken?: string;
}

export interface Staff {
  id: string;
  name: string;
  role: string;
  avatar: string;
  status: "active" | "inactive";
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

export interface Gate {
  id: string;
  name: string;
  scans: number;
  status: "online" | "offline";
  staffCount: number;
}

export interface Order {
  id: string;
  customerName: string;
  customerEmail: string;
  customerAvatar?: string;
  eventName: string;
  ticketType: string;
  paymentMethod: string;
  lastFourDigits?: string;
  amount: number;
  status: 'Paid' | 'Pending' | 'Failed' | 'Refunded';
  time: string;
}

export interface DocumentStatus {
  name: string;
  type: string;
  status: 'VERIFIED' | 'WAITING REVIEW' | 'READY';
  category?: 'Permits & Licenses' | 'Vendor & Venue Contracts' | 'Artist & Talent Agreements' | 'Supporting Documents';
}

export interface SavedVenue {
  id: string;
  name: string;
  city: string;
  capacity: number;
}

export interface Transaction {
  id: string;
  attendee: string;
  email: string;
  ticketType: string;
  amount: number;
  time: string;
  status: "completed" | "pending" | "failed";
}

export interface LogEntry {
  id: string;
  timestamp: string;
  device: string;
  staff: string;
  gate: string;
  type: "scan_success" | "scan_failed" | "device_online" | "device_offline";
  message: string;
}
