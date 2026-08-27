"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import {
  EventSubmission, DocumentReview, RevisionEntry, OrganizerVerification,
  PayoutRequest, OrganizerStatus, PayoutStatus, AuditorActivity,
} from "./types";
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
  revisePayout,
  updatePayoutNotes,
  listAuditorNotifications,
  AuditorNotification,
  DashboardStats
} from "@/lib/api/auditor";
import { mapPayoutListItem } from "./payoutMapping";

interface AuditorDataValue {
  submissions: EventSubmission[];
  documents: DocumentReview[];
  organizers: OrganizerVerification[];
  payouts: PayoutRequest[];
  activity: AuditorActivity[];
  notifications: AuditorNotification[];
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
  handleAddRevision: (submissionId: string, revision: RevisionEntry) => void;
  handleUpdateOrganizerStatus: (id: string, status: OrganizerStatus, notes: string, feedback: string) => void;
  handleUpdateOrganizerChecklist: (id: string, checklist: OrganizerVerification["checklist"]) => void;
  handleUpdatePayoutStatus: (id: string, status: PayoutStatus, notes: string, financeNotes: string) => Promise<{ success: boolean; error?: string }>;
  handleUpdatePayoutChecklists: (
    id: string,
    financialChecklist: PayoutRequest["financialChecklist"],
    complianceChecklist: PayoutRequest["complianceChecklist"]
  ) => void;
}

const AuditorDataContext = createContext<AuditorDataValue | null>(null);

export function AuditorDataProvider({ children }: { children: React.ReactNode }) {
  // Deliberately empty, NOT seeded with mock rows. Seeding meant an empty
  // queue still rendered fake submissions with non-numeric ids ("SUB-3021"),
  // and clicking one asked the API for a review id it could never parse — so
  // a working, idle console looked like a broken one.
  const [submissions, setSubmissions] = useState<EventSubmission[]>([]);
  const [documents, setDocuments] = useState<DocumentReview[]>([]);
  const [organizers, setOrganizers] = useState<OrganizerVerification[]>([]);
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [activity, setActivity] = useState<AuditorActivity[]>([]);
  const [notifications, setNotifications] = useState<AuditorNotification[]>([]);
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
        // Mapped, not spread. A bare spread left the PayoutRequest fields the
        // list endpoint does not return undefined, and the table crashed on the
        // first row it rendered.
        setPayouts(payoutsRes.data.map(mapPayoutListItem));
      }

      // Load notifications
      const notifsRes = await listAuditorNotifications();
      if (notifsRes.success && notifsRes.data) {
        setNotifications(notifsRes.data);
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
  const pendingDocumentsCount = notifications.filter(n => !n.isRead).length;
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

  // Every branch must issue a request. Previously only Approved/Rejected/On Hold
  // were handled, so 'Need Revision' — and Save Draft, which passes the payout's
  // CURRENT status — fell through with `res` undefined and reported
  // "Failed to update payout status: unknown error" while sending nothing at
  // all. A save that silently does nothing but claims to have failed is worse
  // than either outcome on its own.
  const handleUpdatePayoutStatus = async (id: string, status: PayoutStatus, notes: string, financeNotes: string) => {
    try {
      let res;
      if (status === 'Approved') {
        res = await approvePayout(id, notes, financeNotes);
      } else if (status === 'Rejected') {
        res = await rejectPayout(id, financeNotes || "Payout details invalid", notes);
      } else if (status === 'On Hold') {
        res = await holdPayout(id, financeNotes || "Verification pending");
      } else if (status === 'Need Revision') {
        res = await revisePayout(id, financeNotes || "Revision required", notes);
      } else {
        // Save Draft: keep the status, persist the notes.
        res = await updatePayoutNotes(id, notes, financeNotes);
      }

      if (res && res.success) {
        fetchDashboard();
        return { success: true };
      }
      return { success: false, error: res?.error?.message || "Failed to update payout status." };
    } catch (err) {
      console.error("Error updating payout status:", err);
      return { success: false, error: "Failed to update payout status." };
    }
  };

  // Updates the LIST copy only. The detail page keeps its own state, because
  // this handler used to be the sole store: the page rendered a local object
  // fetched from getPayout, so toggling a checklist mutated a different object
  // and the box never even ticked. Checklists are not persisted anywhere yet.
  const handleUpdatePayoutChecklists = (
    id: string,
    financialChecklist: PayoutRequest['financialChecklist'],
    complianceChecklist: PayoutRequest['complianceChecklist']
  ) => {
    setPayouts(prev => prev.map(p => p.id === id ? { ...p, financialChecklist, complianceChecklist } : p));
  };

  const value: AuditorDataValue = {
    submissions, documents, organizers, payouts, activity, notifications, stats, isLoading,
    fetchDashboard,
    pendingReviewsCount, pendingDocumentsCount, pendingOrganizersCount,
    handleApprove, handleReject, handleRequestChanges,
    handleVerifyDocument, handleRejectDocument,
    handleVerifySubmissionDocument, handleRejectSubmissionDocument,
    handleAddRevision,
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
