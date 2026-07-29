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
  | 'view-payout'
  | 'events';


export type OrganizerStatus = 'Pending' | 'Verified' | 'Need Revision' | 'Rejected' | 'Suspended';

/**
 * An organizer application as the auditor console renders it.
 *
 * Fields removed rather than kept optional, because nothing anywhere produces
 * them — not the application form, not organizer_applications, not
 * GetOrganizer:
 *
 *   companyType, businessLicense, npwp, registrationNumber,
 *   picPosition, picNationalId, picSelfieUrl,
 *   industry, eventCategory, yearsInBusiness, previousEventsCount,
 *   estimatedAnnualRevenue
 *
 * Each was rendered from a hardcoded fallback in the detail page's mapper, so
 * every organizer showed the same invented NIB, NPWP, NIK and revenue figure.
 * Leaving them declared would let that come back; a compile error is the point.
 * If any of them is ever genuinely collected, add it back with the column that
 * backs it.
 */
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

  // Company details
  address: string;

  // PIC Info
  picName: string;
  picEmail: string;
  picPhone: string;

  // Bank details
  bankName: string;
  bankAccountHolder: string;
  bankAccountNumber: string;
  /** 'Pending' is gone: it was only ever produced by a mapper fallback covering
   *  a field the backend never sent. The column holds verified|unverified. */
  bankVerificationStatus: 'Verified' | 'Unverified';
  
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

  // Documents
  documents?: ReviewDocument[];
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
  // The event's real lifecycle status (events.status), not a completion state —
  // there is no column recording whether an event actually took place. Empty
  // renders as "Not provided".
  completionStatus: string;
  revenue: number;
  netRevenue: number;
  requestedAmount: number;
  requestDate: string;
  status: PayoutStatus;
  currentAuditor: string;

  // Organizer profile (denormalized from Organizer Verification module)
  organizerCompany: string;
  organizerPhone: string;
  organizerBusinessLicense: string;
  organizerStatus: OrganizerStatus;
  organizerPreviousViolations: number;

  // Event details
  ticketCapacity: number;
  /** 0 when the organizer holds the role without ever filing an application. */
  applicationId: number;
  eventId: number;

  // Sales summary, derived from paid/refunded `orders`.
  // Chargebacks and manual adjustments were removed: no table records either,
  // so they could only ever render a fake 0 on a money-release screen.
  salesSummary: {
    ticketsSold: number;
    grossRevenue: number;
    platformFee: number;
    paymentGatewayFee: number;
    /** VAT actually charged on the two fees. The rate is per-order, not a fixed 11%. */
    ppn: number;
    entertainmentTax: number;
    refundAmount: number;
    netRevenue: number;
  };

  // Checklists
  financialChecklist: {
    revenueMatch: boolean;
    ticketSalesMatch: boolean;
    refundCalculated: boolean;
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
  bankVerificationStatus: 'Verified' | 'Pending' | 'Unverified';
  /** Who confirmed the account, and when. Empty on rows grandfathered in by
   *  migration 0022 — those were verified by nobody, and naming an actor would
   *  fabricate an audit trail. */
  bankVerifiedBy: string;
  bankVerifiedAt: string;

  // Fraud checks. Only conditions the backend can actually evaluate:
  // a second approved payout for the event, and a request exceeding net revenue.
  fraudDetection: {
    duplicatePayout: boolean;
    suspiciousRevenue: boolean;
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

export interface ChecklistItem {
  label: string;
  done: boolean;
}

/**
 * Which table a review document came from. IDs are unique only WITHIN a source —
 * organizer_documents and event_documents are separate SERIAL sequences — so an
 * id on its own does not identify a document. Always pair it with the source.
 */
export type ReviewDocumentSource = 'organizer' | 'event';

/**
 * Stable identity for a review document. An id alone is NOT unique — both tables
 * can hold an id of 5 — so every lookup, mutation and optimistic update keys on
 * the source/id pair.
 */
export function docKey(doc: { id?: string | number; source?: ReviewDocumentSource }): string {
  return `${doc.source ?? 'organizer'}:${doc.id}`;
}

export interface ReviewDocument {
  id?: string | number;
  /** Absent on legacy payloads; treated as 'organizer'. */
  source?: ReviewDocumentSource;
  /** Auditor's rejection reason (per-event documents only). */
  reviewNotes?: string;
  name: string;
  category: 'Permits & Licenses' | 'Vendor & Venue Contracts' | 'Artist & Talent Agreements' | 'Supporting Documents' | 'Business License' | 'Insurance' | 'Tax Document' | 'Emergency Plan';
  status: 'VERIFIED' | 'WAITING REVIEW' | 'READY' | 'REJECTED' | 'MISSING';
  uploadDate?: string;
  expiredDate?: string;
  uploadedBy?: string;
  fileUrl?: string;
}

export interface OrganizerDetail {
  /** organizer_applications.id — 0 when the organizer has no application row. */
  applicationId: number;
  companyName: string;
  /**
   * Not a licence number: no such column exists. The backend reports the
   * verification state of the organizer's NIB/SIUP document here.
   */
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

export interface TicketTier {
  /** Free-text tier name from ticket_tiers, not a fixed vocabulary. */
  category: string;
  price: number;
  /** Real sellable capacity: painted seats for a seated tier, else allocation_limit. */
  seats: number;
  sold: number;
  /** True when stock comes from event_seats_matrix rather than allocation_limit. */
  assignedSeating: boolean;
  status: 'Active' | 'Sold Out' | 'Pending' | 'Available';
}

export interface FinanceDetail {
  projectedRevenue: number;
  platformFee: number;
  gatewayFee: number;
  taxAmount: number;
  netPayout: number;
  /** events.entertainment_tax_rate — the only per-event tax figure stored. */
  taxRate: number;
  ticketTiers: TicketTier[];
  payout: {
    bank: string;
    accountName: string;
    accountNumber: string;
    verified: boolean;
    estimatedPayout: number;
    /** False when the organizer has provided no bank details at all. */
    hasAccount: boolean;
  };
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

// These strings are sent to the organizer verbatim as the rejection reason, so
// they must match the language of the rest of the console.
export const DOCUMENT_REJECTION_REASONS = [
  'Document is blurry',
  'Document has expired',
  'Document is incomplete',
  'Information does not match',
  'Company name differs',
  'Invalid date',
  'Missing signature',
  'Missing official stamp',
  'Wrong file format',
  'Document appears forged or suspicious',
  'Other',
] as const;

export interface RevisionTimelineEntry {
  id: string;
  actor: string;
  role: string;
  action: string;
  timestamp: string;
}

export interface RevisionDocumentChange {
  documentType: string;
  label: string;
  uploadedAt: string;
}

export interface OrganizerRevisionResponse {
  comment: string;
  /**
   * Event documents the organizer re-uploaded in response to this point,
   * snapshotted when they replied. Empty means they answered without changing
   * any paperwork — a meaningful answer, not missing data.
   */
  documentsChanged: RevisionDocumentChange[];
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
  complianceScore: number;
  missingDocs: number;
  assignedAuditor: string;
  checklist: ChecklistItem[];
  documents: ReviewDocument[];
  venue: string;
  /** Flat venue address from the review payload; mapped into venueDetail.address. */
  venueAddress?: string;
  date: string;
  capacity: number;
  ticketSold: number;
  notes?: string;
  organizerDetail: OrganizerDetail;
  venueDetail: VenueDetail;
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
