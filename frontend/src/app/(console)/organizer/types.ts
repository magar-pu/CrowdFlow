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
  locationType: 'physical' | 'virtual';
  location: string;
  locationAddress: string;
  venueName: string;
  capacity: number;
  sold: number;
  revenue: number;
  status: "Live" | "Scheduled" | "Draft" | "Rejected" | "Need Revision" | "In Review";
  image: string;
}

export interface TicketTier {
  id: string;
  name: string;
  price: number;
  sold: number;
  capacity: number;
  status?: "Selling Fast" | "On Sale" | "Sold Out";
  color?: string;
  maxPerOrder?: number;
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
