import { 
  Event, User, Scanner, Transaction, Payout, 
  VerificationApplication, SecurityAlert, Activity, TicketTier, VenueSection 
} from './types';

export const initialEvents: Event[] = [
  {
    id: 'EV-101',
    name: 'Neon Nights Festival',
    date: '2026-08-15',
    venue: 'Carnival Ground Main Stage',
    location: 'Jakarta, Indonesia',
    status: 'Active',
    image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=600&auto=format&fit=crop',
    capacity: 15000,
    ticketsSold: 12450,
    totalRevenue: 1867500,
    category: 'Concert',
    description: 'The ultimate electronic music experience in the heart of Southeast Asia, featuring world-class DJs, immersive soundscapes, and stunning visual pyrotechnics.'
  },
  {
    id: 'EV-102',
    name: 'Global Tech Summit 2024',
    date: '2026-09-22',
    venue: 'Convention Center West Wing',
    location: 'San Francisco, USA',
    status: 'Active',
    image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=600&auto=format&fit=crop',
    capacity: 5000,
    ticketsSold: 4120,
    totalRevenue: 2060000,
    category: 'Conference',
    description: 'Where global visionaries, enterprise tech leaders, and groundbreaking startups meet to map the next decade of digital transformation, AI, and computing.'
  },
  {
    id: 'EV-103',
    name: 'Pro Tennis Open',
    date: '2026-07-28',
    venue: 'Grand Grass Arena',
    location: 'London, UK',
    status: 'Active',
    image: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?q=80&w=600&auto=format&fit=crop',
    capacity: 8000,
    ticketsSold: 7800,
    totalRevenue: 936000,
    category: 'Sports',
    description: 'Witness elite tennis champions battle it out on prime grass courts in this high-intensity, internationally televised summer championship.'
  },
  {
    id: 'EV-104',
    name: 'Grand Symphony Concert',
    date: '2026-11-05',
    venue: 'Royal Philharmonic Hall',
    location: 'Tokyo, Japan',
    status: 'Draft',
    image: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?q=80&w=600&auto=format&fit=crop',
    capacity: 2500,
    ticketsSold: 0,
    totalRevenue: 0,
    category: 'Classical',
    description: 'An evening of majestic classical music, featuring legendary conductor performances of Beethoven, Tchaikovsky, and modern cinematic masterpieces.'
  },
  {
    id: 'EV-105',
    name: 'Crypto Convention 2026',
    date: '2026-05-12',
    venue: 'Marina Financial Center',
    location: 'Dubai, UAE',
    status: 'Completed',
    image: 'https://images.unsplash.com/photo-1621761191319-c6fb62004040?q=80&w=600&auto=format&fit=crop',
    capacity: 6000,
    ticketsSold: 6000,
    totalRevenue: 1500000,
    category: 'Finance',
    description: 'The global flagship summit gathering blockchain innovators, institutional funds, and top web3 founders to shape future decentralized finance paradigms.'
  }
];

export const initialUsers: User[] = [
  {
    id: 'USR-001',
    name: 'Richie M.',
    email: 'richie@crowdflow.io',
    role: 'Admin',
    status: 'Verified',
    joinedAt: '2025-01-10',
    transactionsCount: 142,
    profilePic: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop'
  },
  {
    id: 'USR-002',
    name: 'Sarah Jenkins',
    email: 'sarah.j@gmail.com',
    role: 'Buyer',
    status: 'Verified',
    joinedAt: '2025-05-18',
    transactionsCount: 12,
    profilePic: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&auto=format&fit=crop'
  },
  {
    id: 'USR-003',
    name: 'Mark Thompson',
    email: 'm.thompson@outlook.com',
    role: 'Seller',
    status: 'Verified',
    joinedAt: '2025-08-22',
    transactionsCount: 38,
    profilePic: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150&auto=format&fit=crop'
  },
  {
    id: 'USR-004',
    name: 'Elena Rodriguez',
    email: 'elena@soundwave-events.com',
    role: 'Organizer',
    status: 'Verified',
    joinedAt: '2025-03-01',
    transactionsCount: 8,
    profilePic: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=150&auto=format&fit=crop'
  },
  {
    id: 'USR-005',
    name: 'David Wu',
    email: 'david.wu@yahoo.com',
    role: 'Buyer',
    status: 'Suspended',
    joinedAt: '2025-11-12',
    transactionsCount: 5,
    profilePic: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=150&auto=format&fit=crop'
  },
  {
    id: 'USR-006',
    name: 'Alex Rivera',
    email: 'alex@soniclabs.net',
    role: 'Organizer',
    status: 'Pending',
    joinedAt: '2026-06-28',
    transactionsCount: 0,
    profilePic: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=150&auto=format&fit=crop'
  }
];

export const initialScanners: Scanner[] = [
  {
    id: 'SC-801',
    name: 'Gate A Main Ingress',
    deviceName: 'Apple iPhone 15 Pro',
    status: 'Online',
    scansCount: 412,
    lastSync: '2 min ago',
    batteryLevel: 82,
    assignedSection: 'General Admission'
  },
  {
    id: 'SC-802',
    name: 'VIP Lounge Fast Track',
    deviceName: 'Samsung Galaxy S24 Ultra',
    status: 'Scanning',
    scansCount: 240,
    lastSync: 'Active',
    batteryLevel: 94,
    assignedSection: 'VIP Lounge'
  },
  {
    id: 'SC-803',
    name: 'Grandstands Balcony Access',
    deviceName: 'Google Pixel 8 Pro',
    status: 'Offline',
    scansCount: 120,
    lastSync: '1 hour ago',
    batteryLevel: 15,
    assignedSection: 'Grandstands Balcony'
  },
  {
    id: 'SC-804',
    name: 'Gate B Secondary Ingress',
    deviceName: 'Apple iPhone SE (Staff Edition)',
    status: 'Online',
    scansCount: 310,
    lastSync: '5 min ago',
    batteryLevel: 76,
    assignedSection: 'General Admission'
  }
];

export const initialTransactions: Transaction[] = [
  {
    id: 'TX-9371',
    customerName: 'Sarah Jenkins',
    eventName: 'Neon Nights Festival',
    amount: 150,
    method: 'Apple Pay',
    status: 'Success',
    date: '2026-07-03 10:15'
  },
  {
    id: 'TX-9372',
    customerName: 'Mark Thompson',
    eventName: 'Global Tech Summit 2024',
    amount: 500,
    method: 'Credit Card',
    status: 'Success',
    date: '2026-07-03 09:42'
  },
  {
    id: 'TX-9373',
    customerName: 'Elena Rodriguez',
    eventName: 'Pro Tennis Open',
    amount: 120,
    method: 'Bank Transfer',
    status: 'Success',
    date: '2026-07-02 18:20'
  },
  {
    id: 'TX-9374',
    customerName: 'David Wu',
    eventName: 'Neon Nights Festival',
    amount: 150,
    method: 'Crypto',
    status: 'Refunded',
    date: '2026-07-02 14:10'
  },
  {
    id: 'TX-9375',
    customerName: 'Aria Sterling',
    eventName: 'Neon Nights Festival',
    amount: 300,
    method: 'Credit Card',
    status: 'Pending',
    date: '2026-07-03 11:05'
  }
];

export const initialPayouts: Payout[] = [
  {
    id: 'PAY-8801',
    organizerName: 'Elena Rodriguez',
    eventName: 'Pro Tennis Open',
    amount: 45200,
    status: 'Pending',
    requestedDate: '2026-07-01'
  },
  {
    id: 'PAY-8802',
    organizerName: 'Digital Soundscape Inc.',
    eventName: 'Neon Nights Festival',
    amount: 185000,
    status: 'Processed',
    requestedDate: '2026-06-25'
  },
  {
    id: 'PAY-8803',
    organizerName: 'Global Summit Co.',
    eventName: 'Global Tech Summit 2024',
    amount: 98000,
    status: 'Pending',
    requestedDate: '2026-07-02'
  }
];

export const initialVerificationApplications: VerificationApplication[] = [
  {
    id: 'APP-501',
    name: 'Alex Rivera',
    email: 'alex@soniclabs.net',
    businessType: 'Live Production Company',
    documentType: 'Business License & Venue Agreement',
    submittedAt: 'Today, 08:30 AM',
    status: 'Pending'
  },
  {
    id: 'APP-502',
    name: 'Marina Bailey',
    email: 'marina.bailey@indiegrooves.org',
    businessType: 'Non-profit Music Collective',
    documentType: 'IRS 501(c)(3) Charter & ID Certificate',
    submittedAt: 'Yesterday, 04:15 PM',
    status: 'Pending'
  },
  {
    id: 'APP-503',
    name: 'John Miller',
    email: 'j.miller@millersports.co.uk',
    businessType: 'Professional Sports Promoter',
    documentType: 'UK Stadium Lease Contract & Insurance',
    submittedAt: '2 days ago',
    status: 'Pending'
  }
];

export const initialSecurityAlerts: SecurityAlert[] = [
  {
    id: 'ALT-101',
    title: 'Price Cap Violation',
    type: 'Price Cap',
    description: '12 secondary market ticket listings flagged on Resale hub exceeding the 120% standard price cap constraint.',
    severity: 'high',
    timestamp: '5 min ago'
  },
  {
    id: 'ALT-102',
    title: 'Duplicate Identity Flag',
    type: 'Duplicate Identity',
    description: '3 newly registered seller accounts shared identical hardware fingerprinting IDs and matching bank payouts.',
    severity: 'medium',
    timestamp: '18 min ago'
  },
  {
    id: 'ALT-103',
    title: 'Rapid Wallet Transfer',
    type: 'Suspicious IP',
    description: 'Multiple mass ticket purchases executing from identical hosting provider IP blocks within 4 seconds.',
    severity: 'high',
    timestamp: '1 hour ago'
  }
];

export const initialActivities: Activity[] = [
  {
    id: 'ACT-901',
    userName: 'Richie M.',
    action: 'Verified Organization',
    detail: 'Approved Sonic Labs Net LLC verification application.',
    timestamp: '10 min ago'
  },
  {
    id: 'ACT-902',
    userName: 'Electric Sky Concert',
    action: 'Status Approved',
    detail: 'Event approved by Admin, moving tickets to Presale tier.',
    timestamp: '1 hour ago'
  },
  {
    id: 'ACT-903',
    userName: 'Jordan Smith',
    action: 'Resale Listing',
    detail: 'Listed 4 General Admission tickets on the marketplace.',
    timestamp: '2 hours ago'
  },
  {
    id: 'ACT-904',
    userName: 'Refund System',
    action: 'Processed Refund',
    detail: 'Refund processed successfully for Transaction #TX-9374.',
    timestamp: '4 hours ago'
  }
];

export const initialTicketTiers: TicketTier[] = [
  {
    id: 'TIER-1',
    name: 'VIP All-Access Pass',
    price: 350,
    priceCap: 420,
    capacity: 1500,
    sold: 1420,
    color: 'border-pink-500 bg-pink-500/10 text-pink-400 hover:bg-pink-500/20'
  },
  {
    id: 'TIER-2',
    name: 'General Admission - Early Bird',
    price: 120,
    priceCap: 144,
    capacity: 4000,
    sold: 4000,
    color: 'border-cyan-500 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20'
  },
  {
    id: 'TIER-3',
    name: 'General Admission - Phase 2',
    price: 150,
    priceCap: 180,
    capacity: 7500,
    sold: 6210,
    color: 'border-indigo-500 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20'
  },
  {
    id: 'TIER-4',
    name: 'Behind The Scenes Package',
    price: 750,
    priceCap: 900,
    capacity: 200,
    sold: 142,
    color: 'border-amber-500 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
  }
];

export const initialVenueSections: VenueSection[] = [
  { id: 'SEC-A', name: 'VIP Front Row Seating', capacity: 300, occupied: 290, color: 'bg-pink-500' },
  { id: 'SEC-B', name: 'Main Floor GA Standing', capacity: 5000, occupied: 4120, color: 'bg-cyan-500' },
  { id: 'SEC-C', name: 'West Wing Balcony A', capacity: 1200, occupied: 940, color: 'bg-indigo-500' },
  { id: 'SEC-D', name: 'East Wing Balcony B', capacity: 1200, occupied: 820, color: 'bg-purple-500' },
  { id: 'SEC-E', name: 'Terrace Boxes', capacity: 500, occupied: 480, color: 'bg-amber-500' }
];
