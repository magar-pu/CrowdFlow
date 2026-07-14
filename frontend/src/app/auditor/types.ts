export type AuditorView = 'dashboard' | 'reviews' | 'documents' | 'settings';

export type ReviewStage = 'Submitted' | 'Document Verification' | 'Event Validation' | 'Final Approval';

export interface ChecklistItem {
  label: string;
  done: boolean;
}

export interface ReviewDocument {
  name: string;
  category: 'Permits & Licenses' | 'Vendor & Venue Contracts' | 'Artist & Talent Agreements' | 'Supporting Documents';
  status: 'VERIFIED' | 'WAITING REVIEW' | 'READY' | 'REJECTED';
}

export interface EventSubmission {
  id: string;
  eventName: string;
  organizerName: string;
  organizerAvatar: string;
  category: string;
  submittedAt: string;
  stage: ReviewStage;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Changes Requested';
  checklist: ChecklistItem[];
  documents: ReviewDocument[];
  venue: string;
  date: string;
  capacity: number;
  notes?: string;
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
