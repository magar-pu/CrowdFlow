"use client";

export type AuditorView =
  | 'dashboard'
  | 'reviews'
  | 'documents'
  | 'settings'
  | 'view-document'
  | 'view-review'
  | 'organizers'
  | 'payouts'
  | 'view-organizer'
  | 'view-payout';

export type OrganizerStatus = 'Pending' | 'Verified' | 'Need Revision' | 'Rejected' | 'Suspended';

export interface OrganizerVerification {
  id: string;
  name: string;
  companyName: string;
  logo: string;
  status: OrganizerStatus;
  registrationDate: string;
  lastActivity: string;
  province: string;
  businessType: string;
  riskScore: number; // 0-100
  riskCategory: 'Low' | 'Medium' | 'High' | 'Critical';
  
  // Company details
  companyType: string;
  businessLicense: string;
  npwp: string;
  address: string;
  registrationNumber: string;
  
  // PIC Info
  picName: string;
  picPosition: string;
  picEmail: string;
  picPhone: string;
  picNationalId: string;
  picSelfieUrl: string;
  
  // Business info
  industry: string;
  eventCategory: string;
  yearsInBusiness: number;
  previousEventsCount: number;
  estimatedAnnualRevenue: number;
  
  // Bank details
  bankName: string;
  bankAccountHolder: string;
  bankAccountNumber: string;
  bankVerificationStatus: 'Verified' | 'Pending' | 'Unverified';
  
  // Checklists
  checklist: {
    businessLicenseValid: boolean;
    npwpValid: boolean;
    picIdentityVerified: boolean;
    bankAccountVerified: boolean;
    addressVerified: boolean;
    emailVerified: boolean;
    phoneVerified: boolean;
  };
  
  // Risk assessment parameters
  riskAssessment: {
    identityMatch: boolean;
    companyValidation: boolean;
    fraudHistory: boolean;
    duplicateAccount: boolean;
    suspiciousActivity: boolean;
  };
  
  // Notes
  internalNotes: string;
  organizerFeedback: string;
  
  // History
  history: {
    action: string;
    actor: string;
    timestamp: string;
    details: string;
  }[];
}

export type PayoutStatus =
  | 'Pending'
  | 'Under Review'
  | 'Need Revision'
  | 'Approved'
  | 'Processing'
  | 'Paid'
  | 'Rejected'
  | 'On Hold';

export interface PayoutRequest {
  id: string;
  invoiceNumber: string;
  organizerName: string;
  organizerEmail: string;
  eventName: string;
  eventDate: string;
  venue: string;
  completionStatus: 'Completed' | 'Ongoing' | 'Cancelled';
  revenue: number;
  netRevenue: number;
  requestedAmount: number;
  requestDate: string;
  status: PayoutStatus;
  riskLevel: RiskLevel;
  riskScore: number; // 0-100
  currentAuditor: string;

  // Organizer profile (denormalized from Organizer Verification module)
  organizerCompany: string;
  organizerPhone: string;
  organizerBusinessLicense: string;
  organizerStatus: OrganizerStatus;
  organizerPreviousViolations: number;

  // Event details
  ticketCapacity: number;

  // Sales summary
  salesSummary: {
    ticketsSold: number;
    grossRevenue: number;
    platformFee: number;
    paymentGatewayFee: number;
    entertainmentTax: number;
    vat: number;
    refundAmount: number;
    chargebackAmount: number;
    otherAdjustments: number;
    netRevenue: number;
  };

  // Checklists
  financialChecklist: {
    revenueMatch: boolean;
    ticketSalesMatch: boolean;
    refundCalculated: boolean;
    chargebackApplied: boolean;
    platformFeeCorrect: boolean;
    taxCorrect: boolean;
    netRevenueCorrect: boolean;
  };

  complianceChecklist: {
    eventApproved: boolean;
    organizerVerified: boolean;
    requiredDocumentsComplete: boolean;
    noActiveInvestigation: boolean;
    noPendingRevision: boolean;
  };

  // Bank details
  bankName: string;
  bankAccountNumber: string;
  bankAccountHolder: string;
  swiftCode: string;
  bankVerificationStatus: 'Verified' | 'Pending' | 'Unverified';

  // Fraud checks
  fraudDetection: {
    duplicatePayout: boolean;
    suspiciousRevenue: boolean;
    unusualRefundRate: boolean;
    highChargeback: boolean;
    multipleBankChanges: boolean;
    abnormalTicketSales: boolean;
    hasAlert: boolean;
    alertMessage?: string;
  };

  internalNotes: string;
  financeNotes: string;

  // Activity Log (chronological free-form entries)
  timeline: {
    stage: string;
    actor: string;
    timestamp: string;
    details: string;
  }[];

  // Revision History (populated only if the payout was ever sent back for revision)
  revisionHistory: {
    date: string;
    reason: string;
    status: string;
    resolvedBy: string;
  }[];

  attachments: {
    name: string;
    type: 'Invoice' | 'Revenue Report' | 'Settlement Report' | 'Tax Report' | 'Supporting Document';
  }[];
}

export const PAYOUT_REJECTION_REASONS = [
  'Revenue mismatch',
  'Fraud detected',
  'Invalid bank account',
  'Missing documents',
  'Duplicate request',
  'Other',
] as const;

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

export type RevisionPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export type RevisionStatus =
  | 'Draft' | 'Sent' | 'Viewed' | 'In Progress'
  | 'Resubmitted' | 'Verified' | 'Resolved' | 'Rejected' | 'Expired';

export type RevisionCategory = 'Documents' | 'Venue' | 'Organizer' | 'Finance' | 'Logistics' | 'Other';

export const REVISION_SLA: Record<RevisionPriority, string> = {
  Low: '7 Days',
  Medium: '5 Days',
  High: '3 Days',
  Critical: '24 Hours',
};

export const DOCUMENT_SECTIONS = [
  'Business License', 'NPWP', 'Police Permit', 'Insurance',
  'Tax Document', 'Vendor Contract', 'Artist Contract',
  'Security Permit', 'Medical Permit', 'Fire Safety Permit', 'Other Document',
] as const;

export const VENUE_SECTIONS = [
  'Venue Capacity', 'Seating Layout', 'Emergency Exit', 'Parking Area',
  'Accessibility', 'Fire Safety', 'Medical Point', 'Security Room',
  'Crowd Flow', 'Structural Safety',
] as const;

export const ORGANIZER_SECTIONS = [
  'Company Information', 'Contact Person', 'Address', 'Business Information', 'Bank Account',
] as const;

export const FINANCE_SECTIONS = [
  'Ticket Price', 'Revenue Calculation', 'Platform Fee', 'Tax', 'Payout', 'Refund Policy',
] as const;

export const LOGISTICS_SECTIONS = [
  'Vendor', 'Security', 'Medical Team', 'Emergency Plan', 'Equipment', 'Stage', 'Lighting', 'Sound',
] as const;

export const DOCUMENT_REJECTION_REASONS = [
  'Dokumen buram',
  'Dokumen kadaluarsa',
  'Dokumen tidak lengkap',
  'Informasi tidak sesuai',
  'Nama perusahaan berbeda',
  'Tanggal tidak valid',
  'Tidak ada tanda tangan',
  'Tidak ada stempel resmi',
  'Format salah',
  'Dokumen palsu / mencurigakan',
  'Lainnya',
] as const;

export interface RevisionTimelineEntry {
  id: string;
  actor: string;
  role: string;
  action: string;
  timestamp: string;
}

export interface OrganizerRevisionResponse {
  comment: string;
  uploadedFiles: string[];
  respondedAt: string;
}

export interface RevisionEntry {
  id: string;
  category: RevisionCategory;
  affectedSection: string;
  priority: RevisionPriority;
  status: RevisionStatus;
  requestedBy: string;
  requestDate: string;
  deadline: string;
  title: string;
  description: string;
  requiredAction: string;
  attachment?: string;
  severity: 'Minor' | 'Medium' | 'Critical';
  area: 'Document' | 'Venue' | 'Finance' | 'Organizer' | 'Logistics';
  revisionTimeline: RevisionTimelineEntry[];
  organizerResponse?: OrganizerRevisionResponse;
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
