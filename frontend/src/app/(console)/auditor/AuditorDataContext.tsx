"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import {
  EventSubmission, DocumentReview, RevisionEntry, OrganizerVerification,
  PayoutRequest, OrganizerStatus, PayoutStatus, ReviewStage, AuditorActivity,
} from "./types";
import { INITIAL_SUBMISSIONS, INITIAL_DOCUMENT_REVIEWS, ACTIVITY_LOG, INITIAL_ORGANIZERS, INITIAL_PAYOUTS } from "./data";
import {
  getDashboardData,
  listEventReviews,
  listDocuments,
  verifyDocument,
  rejectDocument,
  listOrganizers,
  approveOrganizer,
  rejectOrganizer,
  updateOrganizerStatus,
  listPayouts,
  approvePayout,
  rejectPayout,
  holdPayout,
  DashboardStats
} from "@/lib/api/auditor";

interface AuditorDataValue {
  submissions: EventSubmission[];
  documents: DocumentReview[];
  organizers: OrganizerVerification[];
  payouts: PayoutRequest[];
  activity: AuditorActivity[];
  stats: DashboardStats | null;
  isLoading: boolean;
  fetchDashboard: () => Promise<void>;

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
  const [activity, setActivity] = useState<AuditorActivity[]>(ACTIVITY_LOG);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboard = async () => {
    try {
      setIsLoading(true);
      const res = await getDashboardData();
      if (res.success && res.data) {
        setStats(res.data.stats);
        setActivity(res.data.recentActivity);
      }
      // Load full queue
      const queueRes = await listEventReviews({ limit: 100 });
      if (queueRes.success && queueRes.data) {
        const queue = queueRes.data.map(item => ({
          ...item,
          id: String(item.id),
        })) as any[];
        setSubmissions(queue);
      }
      // Load documents queue
      const docsRes = await listDocuments({ limit: 100 });
      if (docsRes.success && docsRes.data) {
        const docList = docsRes.data.map(doc => ({
          ...doc,
          id: String(doc.id),
          fileName: doc.fileName,
          category: doc.category as any,
          eventName: doc.eventName,
          organizerName: doc.organizerName,
          status: doc.status,
          uploadedAt: doc.uploadedAt,
        })) as any[];
        setDocuments(docList);
      }
      // Load organizers applications
      const orgsRes = await listOrganizers({ limit: 100 });
      if (orgsRes.success && orgsRes.data) {
        const orgList = orgsRes.data.map(org => ({
          ...org,
          id: String(org.id),
        })) as any[];
        setOrganizers(orgList);
      }
      // Load payout requests
      const payoutsRes = await listPayouts({ limit: 100 });
      if (payoutsRes.success && payoutsRes.data) {
        const payoutList = payoutsRes.data.map((pay: any) => ({
          ...pay,
          id: String(pay.id),
        })) as any[];
        setPayouts(payoutList);
      }
    } catch (err) {
      console.error("Failed to load auditor dashboard metrics:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const pendingReviewsCount = stats ? stats.pendingReviews : submissions.filter(s => s.status === 'Pending').length;
  const pendingDocumentsCount = stats ? stats.documentsWaiting : documents.filter(d => d.status === 'WAITING REVIEW').length;
  const pendingOrganizersCount = stats ? stats.pendingOrganizers : organizers.filter(o => o.status === 'Pending').length;

  const handleApprove = (id: string) => {
    setSubmissions(prev => prev.map(s => s.id === id ? { ...s, status: 'Approved', stage: 'Final Approval' } : s));
  };

  const handleReject = (id: string, reason: string) => {
    setSubmissions(prev => prev.map(s => s.id === id ? { ...s, status: 'Rejected', notes: reason } : s));
  };

  const handleRequestChanges = (id: string, notes: string) => {
    setSubmissions(prev => prev.map(s => s.id === id ? { ...s, status: 'Changes Requested', notes } : s));
  };

  const handleVerifyDocument = async (id: string) => {
    try {
      const res = await verifyDocument(id);
      if (res.success) {
        setDocuments(prev => prev.map(d => d.id === id ? { ...d, status: 'VERIFIED' } : d));
        fetchDashboard();
      } else {
        alert("Failed to verify document: " + (res.error?.message || "unknown error"));
      }
    } catch (err) {
      console.error("Error verifying document:", err);
    }
  };

  const handleRejectDocument = async (id: string) => {
    try {
      const reason = prompt("Enter document rejection reason:") || "Document invalid or unreadable";
      const res = await rejectDocument(id, reason);
      if (res.success) {
        setDocuments(prev => prev.map(d => d.id === id ? { ...d, status: 'REJECTED' } : d));
        fetchDashboard();
      } else {
        alert("Failed to reject document: " + (res.error?.message || "unknown error"));
      }
    } catch (err) {
      console.error("Error rejecting document:", err);
    }
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

  const handleUpdateOrganizerStatus = async (id: string, status: OrganizerStatus, notes: string, feedback: string) => {
    try {
      let res;
      if (status === 'Verified') {
        res = await approveOrganizer(id, notes);
      } else if (status === 'Rejected') {
        res = await rejectOrganizer(id, notes, feedback);
      } else {
        res = await updateOrganizerStatus(id, status, notes, feedback);
      }

      if (res.success) {
        fetchDashboard();
      } else {
        alert("Failed to update organizer status: " + (res.error?.message || "unknown error"));
      }
    } catch (err) {
      console.error("Error updating organizer status:", err);
    }
  };

  const handleUpdateOrganizerChecklist = (id: string, checklist: OrganizerVerification['checklist']) => {
    setOrganizers(prev => prev.map(o => o.id === id ? { ...o, checklist } : o));
  };

  const handleUpdatePayoutStatus = async (id: string, status: PayoutStatus, notes: string, financeNotes: string) => {
    try {
      let res;
      if (status === 'Approved') {
        res = await approvePayout(id, notes, financeNotes);
      } else if (status === 'Rejected') {
        res = await rejectPayout(id, financeNotes || "Payout details invalid", notes);
      } else if (status === 'On Hold') {
        res = await holdPayout(id, financeNotes || "Verification pending");
      }

      if (res && res.success) {
        fetchDashboard();
      } else {
        alert("Failed to update payout status: " + (res?.error?.message || "unknown error"));
      }
    } catch (err) {
      console.error("Error updating payout status:", err);
    }
  };

  const handleUpdatePayoutChecklists = (
    id: string,
    financialChecklist: PayoutRequest['financialChecklist'],
    complianceChecklist: PayoutRequest['complianceChecklist']
  ) => {
    setPayouts(prev => prev.map(p => p.id === id ? { ...p, financialChecklist, complianceChecklist } : p));
  };

  const value: AuditorDataValue = {
    submissions, documents, organizers, payouts, activity, stats, isLoading,
    fetchDashboard,
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
