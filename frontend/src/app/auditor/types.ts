"use client";

export type AuditorView = 'dashboard' | 'reviews' | 'documents' | 'settings' | 'view-document' | 'view-review';

export type ReviewStage = 'Submitted' | 'Document Verification' | 'Event Validation' | 'Final Approval';

export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';

export interface ChecklistItem {
  label: string;
  done: boolean;
}

export interface ReviewDocument {
  name: string;
  category: 'Permits & Licenses' | 'Vendor & Venue Contracts' | 'Artist & Talent Agreements' | 'Supporting Documents' | 'Business License' | 'Insurance' | 'Tax Document' | 'Emergency Plan';
  status: 'VERIFIED' | 'WAITING REVIEW' | 'READY' | 'REJECTED' | 'MISSING';
  uploadDate?: string;
  expiredDate?: string;
  uploadedBy?: string;
}

export interface OrganizerDetail {
  companyName: string;
  businessLicense: string;
  pic: string;
  email: string;
  phone: string;
  address: string;
}

export interface VenueDetail {
  name: string;
  address: string;
  capacity: number;
  manager: string;
  contact: string;
  website: string;
  googleMaps: string;
  complianceScore: number;
  checklist: ChecklistItem[];
}

export interface Vendor {
  name: string;
  category: 'Stage' | 'Lighting' | 'Sound' | 'Food' | 'Merchandise' | 'Cleaning' | 'Security';
  status: 'Verified' | 'Pending' | 'Rejected';
  contact: string;
}

export interface LogisticsDetail {
  vendorCount: number;
  securityCount: number;
  medicalTeam: number;
  emergencyTeam: number;
  vendors: Vendor[];
  emergencyPlan: ChecklistItem[];
}

export interface TicketTier {
  category: 'VVIP' | 'VIP' | 'Festival' | 'Regular';
  price: number;
  seats: number;
  status: 'Active' | 'Sold Out' | 'Pending';
}

export interface FinanceDetail {
  projectedRevenue: number;
  platformFee: number;
  gatewayFee: number;
  taxAmount: number;
  netPayout: number;
  ticketTiers: TicketTier[];
  taxConfig: {
    entertainmentTax: number;
    ppn: number;
    region: string;
    taxPercentage: number;
    regionMatch: boolean;
    taxApplied: boolean;
    ppnApplied: boolean;
  };
  payout: {
    bank: string;
    accountName: string;
    accountNumber: string;
    verified: boolean;
    estimatedPayout: number;
  };
  complianceChecklist: ChecklistItem[];
}

export interface ActivityEntry {
  id: string;
  user: string;
  role: string;
  action: string;
  detail: string;
  timestamp: string;
}

export interface VersionEntry {
  version: number;
  changedBy: string;
  timestamp: string;
  summary: string;
}

export interface HistoryDetail {
  activityTimeline: ActivityEntry[];
  versions: VersionEntry[];
}

export interface RevisionEntry {
  id: string;
  requestedBy: string;
  requestDate: string;
  deadline: string;
  status: 'Open' | 'In Progress' | 'Resolved';
  area: 'Document' | 'Venue' | 'Finance' | 'Organizer' | 'Logistics';
  title: string;
  description: string;
  severity: 'Minor' | 'Medium' | 'Critical';
}

export interface ComplianceHistory {
  previousAudits: number;
  previousViolations: number;
  previousRevisions: number;
  previousApprovedEvents: number;
}

export interface EventSubmission {
  id: string;
  eventName: string;
  organizerName: string;
  organizerAvatar: string;
  bannerUrl?: string;
  category: string;
  submittedAt: string;
  lastUpdated: string;
  stage: ReviewStage;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Changes Requested';
  riskLevel: RiskLevel;
  complianceScore: number;
  missingDocs: number;
  assignedAuditor: string;
  checklist: ChecklistItem[];
  documents: ReviewDocument[];
  venue: string;
  date: string;
  capacity: number;
  ticketSold: number;
  notes?: string;
  organizerDetail: OrganizerDetail;
  venueDetail: VenueDetail;
  logistics: LogisticsDetail;
  finance: FinanceDetail;
  history: HistoryDetail;
  revisions: RevisionEntry[];
  complianceHistory: ComplianceHistory;
}

export interface DocumentReview {
  id: string;
  fileName: string;
  category: ReviewDocument['category'];
  eventName: string;
  organizerName: string;
  uploadedAt: string;
  status: 'VERIFIED' | 'WAITING REVIEW' | 'READY' | 'REJECTED';
}

export interface AuditorActivity {
  id: string;
  actor: string;
  action: string;
  detail: string;
  timestamp: string;
}
