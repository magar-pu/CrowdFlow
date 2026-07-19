import { EventItem, TicketTier, Gate, ScannerDevice, Staff, VenueSection, Transaction, LogEntry, Order } from "./types";

export const INITIAL_EVENTS: EventItem[] = [
  {
    id: "EVT-101",
    name: "Global Tech Summit 2024",
    category: "Conference",
    description: "Join thousands of technology leaders, developers, and creators for our flagship event. This year we explore next-generation neural networks, WebGPU graphics pipelines, and spatial interface guidelines.",
    date: "Oct 12 - 15, 2024",
    startDate: "2024-10-12",
    startTime: "09:00 AM",
    endDate: "2024-10-15",
    endTime: "05:00 PM",
    locationType: "physical",
    location: "Moscone Center, SF",
    locationAddress: "Moscone Center, SF",
    venueName: "Moscone Center, SF",
    capacity: 5000,
    sold: 4850,
    revenue: 1240000,
    status: "Live",
    image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop&q=80",
  },
  {
    id: "EVT-102",
    name: "Aurora Music Festival",
    category: "Festival",
    description: "Under the northern lights with pure melodies. Join top artists for an immersive audiovisual concert experience.",
    date: "Nov 05 - 07, 2024",
    startDate: "2024-11-05",
    startTime: "04:00 PM",
    endDate: "2024-11-07",
    endTime: "11:00 PM",
    locationType: "physical",
    location: "Zilker Park, ATX",
    locationAddress: "Zilker Park, ATX",
    venueName: "Zilker Park, ATX",
    capacity: 15000,
    sold: 12200,
    revenue: 890000,
    status: "Scheduled",
    image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80",
  },
  {
    id: "EVT-103",
    name: "Executive Leadership Retreat",
    category: "Workshop",
    description: "High level strategic alignments for executives in a peaceful winter scenery.",
    date: "Dec 01 - 03, 2024",
    startDate: "2024-12-01",
    startTime: "08:00 AM",
    endDate: "2024-12-03",
    endTime: "03:00 PM",
    locationType: "physical",
    location: "The Ritz-Carlton, Maui",
    locationAddress: "The Ritz-Carlton, Maui",
    venueName: "The Ritz-Carlton, Maui",
    capacity: 100,
    sold: 45,
    revenue: 112500,
    status: "Draft",
    image: "https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&auto=format&fit=crop&q=80",
  }
];

export const INITIAL_TICKET_TIERS: TicketTier[] = [
  {
    id: "ticket-1",
    name: "VIP All-Access",
    price: 350,
    sold: 320,
    capacity: 350,
    status: "Selling Fast",
    color: "#D4AF37",
    maxPerOrder: 4,
    salesStart: "2024-10-01",
    salesEnd: "2024-11-10",
    description: "Includes premium backstage lounge, priority seating, and custom physical badge."
  },
  {
    id: "ticket-2",
    name: "General Admission",
    price: 150,
    sold: 1222,
    capacity: 1350,
    status: "On Sale",
    color: "#3B82F6",
    maxPerOrder: 8,
    salesStart: "2024-10-05",
    salesEnd: "2024-11-12",
    description: "Full access to all standard general event stages."
  },
  {
    id: "ticket-3",
    name: "Student Pass",
    price: 75,
    sold: 300,
    capacity: 300,
    status: "Sold Out",
    color: "#10B981",
    maxPerOrder: 2,
    salesStart: "2024-10-10",
    salesEnd: "2024-11-12",
    description: "Discounted entry for verified active university students."
  }
];

export const INITIAL_GATES: Gate[] = [
  { id: "gate-a", name: "Gate A", scans: 320, status: "online", staffCount: 2 },
  { id: "gate-b", name: "Gate B", scans: 281, status: "online", staffCount: 1 },
  { id: "gate-vip", name: "VIP Entrance", scans: 0, status: "offline", staffCount: 1 }
];

export const INITIAL_DEVICES: ScannerDevice[] = [
  {
    id: "device-1",
    name: "Scanner A-1",
    staff: "Alex Chen",
    staffAvatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80",
    gate: "Gate A",
    status: "online",
    battery: 85,
    lastSync: "3s ago",
    scans: 124,
    role: "QR Scanner",
    permissions: ["Scan Tickets", "View Attendee Info"]
  },
  {
    id: "device-2",
    name: "Scanner B-1",
    staff: "Sarah Connor",
    staffAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80",
    gate: "Gate B",
    status: "online",
    battery: 92,
    lastSync: "Just now",
    scans: 95,
    role: "QR Scanner",
    permissions: ["Scan Tickets"]
  },
  {
    id: "device-3",
    name: "VIP Handheld",
    staff: "Marcus Aurelius",
    staffAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80",
    gate: "VIP Entrance",
    status: "offline",
    battery: 45,
    lastSync: "2h ago",
    scans: 0,
    role: "Supervisor",
    permissions: ["Scan Tickets", "Override Errors", "Refund Desk"]
  }
];

export const STAFF_MEMBERS: Staff[] = [
  { id: "staff-1", name: "Alex Chen", role: "QR Scanner", avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80", status: "active" },
  { id: "staff-2", name: "Sarah Connor", role: "QR Scanner", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80", status: "active" },
  { id: "staff-3", name: "Marcus Aurelius", role: "Supervisor", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80", status: "active" },
  { id: "staff-4", name: "Selena Kyle", role: "Marshal", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80", status: "inactive" }
];

export const INITIAL_VENUE_SECTIONS: VenueSection[] = [
  { id: "v-vip", name: "VIP Stage Front", type: "seats", capacity: 350, sold: 320, price: 350, x: 180, y: 110, width: 240, height: 60, rows: 6, cols: 10, gate: "VIP Entrance" },
  { id: "v-ga-a", name: "GA Field North", type: "standing", capacity: 800, sold: 650, price: 150, x: 60, y: 190, width: 140, height: 110, gate: "Gate A" },
  { id: "v-ga-b", name: "GA Field South", type: "standing", capacity: 850, sold: 572, price: 150, x: 400, y: 190, width: 140, height: 110, gate: "Gate B" },
  { id: "v-bleachers", name: "Grandstand Bleachers", type: "seats", capacity: 1000, sold: 900, price: 90, x: 130, y: 320, width: 340, height: 70, rows: 7, cols: 20, gate: "Gate A" }
];

export const RECENT_TRANSACTIONS: Transaction[] = [
  { id: "TXN-8801", attendee: "Charlotte Bennett", email: "char@bennett.net", ticketType: "VIP All-Access", amount: 350, time: "10m ago", status: "completed" },
  { id: "TXN-8802", attendee: "Liam Vance", email: "liam@vance.org", ticketType: "General Admission", amount: 150, time: "18m ago", status: "completed" },
  { id: "TXN-8803", attendee: "Tariq Mahmood", email: "tariq@mahmood.in", ticketType: "Student Pass", amount: 75, time: "24m ago", status: "completed" },
  { id: "TXN-8804", attendee: "Yuki Tanaka", email: "yuki@tanaka.co.jp", ticketType: "General Admission", amount: 150, time: "42m ago", status: "pending" },
  { id: "TXN-8805", attendee: "Nils Sjöberg", email: "nils@sjoberg.se", ticketType: "VIP All-Access", amount: 350, time: "1h ago", status: "failed" }
];

export const ACTIVITY_LOGS: LogEntry[] = [
  { id: "log-1", timestamp: "20:41:05", device: "Scanner A-1", staff: "Alex Chen", gate: "Gate A", type: "scan_success", message: "Ticket valid. Alice Cooper checked in." },
  { id: "log-2", timestamp: "20:39:48", device: "Scanner B-1", staff: "Sarah Connor", gate: "Gate B", type: "scan_success", message: "Ticket valid. Bob Dylan checked in." },
  { id: "log-3", timestamp: "20:35:12", device: "Scanner A-1", staff: "Alex Chen", gate: "Gate A", type: "scan_failed", message: "Duplicate Ticket. Code ALREADY USED at Gate B 2m ago." },
  { id: "log-4", timestamp: "20:30:00", device: "Scanner B-1", staff: "Sarah Connor", gate: "Gate B", type: "device_online", message: "Scanner device B-1 registered. Status: ONLINE." }
];

export const INITIAL_ORDERS: Order[] = [
  {
    id: "ORD-9901",
    customerName: "Alice Cooper",
    customerEmail: "alice@cooper.org",
    customerAvatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop&q=80",
    eventName: "Global Tech Summit 2024",
    ticketType: "VIP All-Access",
    paymentMethod: "Credit Card",
    lastFourDigits: "4321",
    amount: 350,
    status: "Paid",
    time: "Oct 10, 2024 10:32 AM"
  },
  {
    id: "ORD-9902",
    customerName: "Bob Dylan",
    customerEmail: "bob@dylan.com",
    customerAvatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&auto=format&fit=crop&q=80",
    eventName: "Aurora Music Festival",
    ticketType: "General Admission",
    paymentMethod: "Bank Transfer",
    lastFourDigits: "8765",
    amount: 150,
    status: "Paid",
    time: "Nov 02, 2024 04:15 PM"
  },
  {
    id: "ORD-9903",
    customerName: "Charlie Sheen",
    customerEmail: "charlie@sheen.tv",
    customerAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80",
    eventName: "Executive Leadership Retreat",
    ticketType: "VIP All-Access",
    paymentMethod: "Credit Card",
    lastFourDigits: "1111",
    amount: 1250,
    status: "Pending",
    time: "Dec 01, 2024 08:00 AM"
  }
];
