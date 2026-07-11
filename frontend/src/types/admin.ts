export interface Event {
  id: string;
  name: string;
  date: string;
  venue: string;
  location: string;
  status: 'Active' | 'Draft' | 'Completed';
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

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'Buyer' | 'Seller' | 'Organizer' | 'Admin';
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
