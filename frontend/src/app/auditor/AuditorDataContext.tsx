"use client";

import React, { createContext, useContext, useState } from "react";
import {
  EventSubmission, DocumentReview, RevisionEntry, OrganizerVerification,
  PayoutRequest, OrganizerStatus, PayoutStatus, ReviewStage, AuditorActivity,
} from "./types";
import { INITIAL_SUBMISSIONS, INITIAL_DOCUMENT_REVIEWS, ACTIVITY_LOG, INITIAL_ORGANIZERS, INITIAL_PAYOUTS } from "./data";

interface AuditorDataValue {
  submissions: EventSubmission[];
  documents: DocumentReview[];
  organizers: OrganizerVerification[];
  payouts: PayoutRequest[];
  activity: AuditorActivity[];

  pendingReviewsCount: number;
  pendingDocumentsCount: number;
  pendingOrganizersCount: number;

  handleApprove: (id: string) => void;
  handleReject: (id: string, reason: string) => void;
  handleRequestChanges: (id: string, notes: string) => void;
  handleVerifyDocument: (id: string) => void;
  handleRejectDocument: (id: string) => void;
  handleVerifySubmissionDocument: (submissionId: string, docName: string) => void;
  handleRejectSubmissionDocument: (submissionId: string, docName: string) => void;
  handleChangeSubmissionStage: (submissionId: string, stage: ReviewStage) => void;
  handleAddRevision: (submissionId: string, revision: RevisionEntry) => void;
  handleUpdateOrganizerStatus: (id: string, status: OrganizerStatus, notes: string, feedback: string) => void;
  handleUpdateOrganizerChecklist: (id: string, checklist: OrganizerVerification["checklist"]) => void;
  handleUpdatePayoutStatus: (id: string, status: PayoutStatus, notes: string, financeNotes: string) => void;
  handleUpdatePayoutChecklists: (
    id: string,
    financialChecklist: PayoutRequest["financialChecklist"],
    complianceChecklist: PayoutRequest["complianceChecklist"]
  ) => void;
}

const AuditorDataContext = createContext<AuditorDataValue | null>(null);

export function AuditorDataProvider({ children }: { children: React.ReactNode }) {
  const [submissions, setSubmissions] = useState<EventSubmission[]>(INITIAL_SUBMISSIONS);
  const [documents, setDocuments] = useState<DocumentReview[]>(INITIAL_DOCUMENT_REVIEWS);
  const [organizers, setOrganizers] = useState<OrganizerVerification[]>(INITIAL_ORGANIZERS);
  const [payouts, setPayouts] = useState<PayoutRequest[]>(INITIAL_PAYOUTS);

  const pendingReviewsCount = submissions.filter(s => s.status === 'Pending').length;
  const pendingDocumentsCount = documents.filter(d => d.status === 'WAITING REVIEW').length;
  const pendingOrganizersCount = organizers.filter(o => o.status === 'Pending').length;

  const handleApprove = (id: string) => {
    setSubmissions(prev => prev.map(s => s.id === id ? { ...s, status: 'Approved', stage: 'Final Approval' } : s));
  };

  const handleReject = (id: string, reason: string) => {
    setSubmissions(prev => prev.map(s => s.id === id ? { ...s, status: 'Rejected', notes: reason } : s));
  };

  const handleRequestChanges = (id: string, notes: string) => {
    setSubmissions(prev => prev.map(s => s.id === id ? { ...s, status: 'Changes Requested', notes } : s));
  };

  const handleVerifyDocument = (id: string) => {
    setDocuments(prev => prev.map(d => d.id === id ? { ...d, status: 'VERIFIED' } : d));
  };

  const handleRejectDocument = (id: string) => {
    setDocuments(prev => prev.map(d => d.id === id ? { ...d, status: 'REJECTED' } : d));
  };

  const handleVerifySubmissionDocument = (submissionId: string, docName: string) => {
    setSubmissions(prev => prev.map(s => {
      if (s.id === submissionId) {
        const updatedDocs = s.documents.map(d => d.name === docName ? { ...d, status: 'VERIFIED' as const } : d);
        const allVerified = updatedDocs.every(d => d.status === 'VERIFIED');
        const updatedChecklist = s.checklist.map(c =>
          c.label === 'Document Verification' ? { ...c, done: allVerified } : c
        );
        return { ...s, documents: updatedDocs, checklist: updatedChecklist };
      }
      return s;
    }));
  };

  const handleRejectSubmissionDocument = (submissionId: string, docName: string) => {
    setSubmissions(prev => prev.map(s => {
      if (s.id === submissionId) {
        const updatedDocs = s.documents.map(d => d.name === docName ? { ...d, status: 'REJECTED' as const } : d);
        const updatedChecklist = s.checklist.map(c =>
          c.label === 'Document Verification' ? { ...c, done: false } : c
        );
        return { ...s, documents: updatedDocs, checklist: updatedChecklist };
      }
      return s;
    }));
  };

  const handleChangeSubmissionStage = (submissionId: string, stage: ReviewStage) => {
    setSubmissions(prev => prev.map(s => s.id === submissionId ? { ...s, stage } : s));
  };

  const handleAddRevision = (submissionId: string, revision: RevisionEntry) => {
    setSubmissions(prev => prev.map(s => {
      if (s.id === submissionId) {
        return { ...s, revisions: [...s.revisions, revision] };
      }
      return s;
    }));
  };

  const handleUpdateOrganizerStatus = (id: string, status: OrganizerStatus, notes: string, feedback: string) => {
    setOrganizers(prev => prev.map(o => {
      if (o.id === id) {
        const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 16);
        return {
          ...o,
          status,
          internalNotes: notes,
          organizerFeedback: feedback,
          history: [
            ...o.history,
            { action: `Status Updated to ${status}`, actor: 'Priya Nair', timestamp, details: feedback || `Internal notes updated: ${notes}` }
          ]
        };
      }
      return o;
    }));
  };

  const handleUpdateOrganizerChecklist = (id: string, checklist: OrganizerVerification['checklist']) => {
    setOrganizers(prev => prev.map(o => o.id === id ? { ...o, checklist } : o));
  };

  const handleUpdatePayoutStatus = (id: string, status: PayoutStatus, notes: string, financeNotes: string) => {
    setPayouts(prev => prev.map(p => {
      if (p.id === id) {
        const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 16);
        return {
          ...p,
          status,
          internalNotes: notes,
          financeNotes,
          timeline: [
            ...p.timeline,
            { stage: `Status Updated to ${status}`, actor: 'Priya Nair', timestamp, details: financeNotes || `Internal notes: ${notes}` }
          ]
        };
      }
      return p;
    }));
  };

  const handleUpdatePayoutChecklists = (
    id: string,
    financialChecklist: PayoutRequest['financialChecklist'],
    complianceChecklist: PayoutRequest['complianceChecklist']
  ) => {
    setPayouts(prev => prev.map(p => p.id === id ? { ...p, financialChecklist, complianceChecklist } : p));
  };

  const value: AuditorDataValue = {
    submissions, documents, organizers, payouts, activity: ACTIVITY_LOG,
    pendingReviewsCount, pendingDocumentsCount, pendingOrganizersCount,
    handleApprove, handleReject, handleRequestChanges,
    handleVerifyDocument, handleRejectDocument,
    handleVerifySubmissionDocument, handleRejectSubmissionDocument,
    handleChangeSubmissionStage, handleAddRevision,
    handleUpdateOrganizerStatus, handleUpdateOrganizerChecklist,
    handleUpdatePayoutStatus, handleUpdatePayoutChecklists,
  };

  return <AuditorDataContext.Provider value={value}>{children}</AuditorDataContext.Provider>;
}

export function useAuditorData(): AuditorDataValue {
  const ctx = useContext(AuditorDataContext);
  if (!ctx) throw new Error("useAuditorData must be used within AuditorDataProvider");
  return ctx;
}
