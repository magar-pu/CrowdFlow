"use client";

import React, { useState } from "react";
import { AuditorView, EventSubmission, DocumentReview } from "./types";
import { INITIAL_SUBMISSIONS, INITIAL_DOCUMENT_REVIEWS, ACTIVITY_LOG } from "./data";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import MobileNavDrawer from "./components/MobileNavDrawer";
import MobileBottomNav from "./components/MobileBottomNav";
import DashboardView from "./components/DashboardView";
import ReviewsView from "./components/ReviewsView";
import DocumentsView from "./components/DocumentsView";
import SettingsView from "./components/SettingsView";
import DocumentDetailView from "./components/DocumentDetailView";

const VIEW_TITLES: Record<AuditorView, string> = {
  dashboard: 'Dashboard',
  reviews: 'Reviews',
  documents: 'Documents',
  settings: 'Settings',
  'view-document': 'Document Verification',
};

export default function AuditorPage() {
  const [currentView, setCurrentView] = useState<AuditorView>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [submissions, setSubmissions] = useState<EventSubmission[]>(INITIAL_SUBMISSIONS);
  const [documents, setDocuments] = useState<DocumentReview[]>(INITIAL_DOCUMENT_REVIEWS);
  
  const [selectedSubmission, setSelectedSubmission] = useState<EventSubmission | null>(null);
  const [viewingDocument, setViewingDocument] = useState<{
    id: string;
    fileName: string;
    category: string;
    status: string;
    eventName: string;
    organizerName: string;
    fromView: 'reviews' | 'documents';
    submissionId?: string;
  } | null>(null);

  const pendingReviewsCount = submissions.filter(s => s.status === 'Pending').length;
  const pendingDocumentsCount = documents.filter(d => d.status === 'WAITING REVIEW').length;

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

  return (
    <div id="crowdflow-auditor" className="min-h-screen bg-surface text-text-primary flex font-sans select-none antialiased w-full">
      <Sidebar
        currentView={currentView}
        setView={setCurrentView}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        pendingReviewsCount={pendingReviewsCount}
        pendingDocumentsCount={pendingDocumentsCount}
      />

      <MobileNavDrawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        currentView={currentView}
        setView={setCurrentView}
        pendingReviewsCount={pendingReviewsCount}
        pendingDocumentsCount={pendingDocumentsCount}
      />

      <MobileBottomNav currentView={currentView} setView={setCurrentView} pendingReviewsCount={pendingReviewsCount} />

      <div
        className={`flex min-h-screen w-full flex-1 flex-col bg-surface transition-[padding] duration-300 ${
          isSidebarCollapsed ? 'lg:pl-[88px]' : 'lg:pl-[280px]'
        }`}
      >
        <Header
          title={VIEW_TITLES[currentView]}
          subtitle="CROWDFLOW AUDITOR"
          onOpenMenu={() => setIsMobileMenuOpen(true)}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />

        <main className="mx-auto w-full max-w-[1440px] flex-1 overflow-y-auto px-4 pb-24 pt-5 sm:px-6 md:p-8 space-y-6">
          {currentView === 'dashboard' && (
            <DashboardView
              submissions={submissions}
              documents={documents}
              activity={ACTIVITY_LOG}
              onNavigateToView={(v) => setCurrentView(v)}
            />
          )}
          {currentView === 'reviews' && (
            <ReviewsView
              submissions={submissions}
              selectedSubmission={selectedSubmission}
              setSelectedSubmission={setSelectedSubmission}
              onApprove={handleApprove}
              onReject={handleReject}
              onRequestChanges={handleRequestChanges}
              onVerifyDocument={handleVerifySubmissionDocument}
              onRejectDocument={handleRejectSubmissionDocument}
              onViewDocument={(doc) => {
                setViewingDocument({
                  id: doc.name,
                  fileName: doc.name,
                  category: doc.category,
                  status: doc.status,
                  eventName: selectedSubmission?.eventName || '',
                  organizerName: selectedSubmission?.organizerName || '',
                  fromView: 'reviews',
                  submissionId: selectedSubmission?.id
                });
                setCurrentView('view-document');
              }}
            />
          )}
          {currentView === 'documents' && (
            <DocumentsView
              documents={documents}
              onVerify={handleVerifyDocument}
              onReject={handleRejectDocument}
              onViewDocument={(doc) => {
                setViewingDocument({
                  id: doc.id,
                  fileName: doc.fileName,
                  category: doc.category,
                  status: doc.status,
                  eventName: doc.eventName,
                  organizerName: doc.organizerName,
                  fromView: 'documents'
                });
                setCurrentView('view-document');
              }}
            />
          )}
          {currentView === 'settings' && <SettingsView />}
          {currentView === 'view-document' && viewingDocument && (
            <DocumentDetailView
              document={viewingDocument}
              onBack={() => {
                setCurrentView(viewingDocument.fromView);
              }}
              onVerify={() => {
                if (viewingDocument.fromView === 'reviews' && viewingDocument.submissionId) {
                  handleVerifySubmissionDocument(viewingDocument.submissionId, viewingDocument.fileName);
                  setViewingDocument(prev => prev ? { ...prev, status: 'VERIFIED' } : null);
                  setSelectedSubmission(prev => {
                    if (!prev) return null;
                    const updatedDocs = prev.documents.map(d => d.name === viewingDocument.fileName ? { ...d, status: 'VERIFIED' as const } : d);
                    const allVerified = updatedDocs.every(d => d.status === 'VERIFIED');
                    const updatedChecklist = prev.checklist.map(c => 
                      c.label === 'Document Verification' ? { ...c, done: allVerified } : c
                    );
                    return { ...prev, documents: updatedDocs, checklist: updatedChecklist };
                  });
                } else {
                  handleVerifyDocument(viewingDocument.id);
                  setViewingDocument(prev => prev ? { ...prev, status: 'VERIFIED' } : null);
                }
              }}
              onReject={() => {
                if (viewingDocument.fromView === 'reviews' && viewingDocument.submissionId) {
                  handleRejectSubmissionDocument(viewingDocument.submissionId, viewingDocument.fileName);
                  setViewingDocument(prev => prev ? { ...prev, status: 'REJECTED' } : null);
                  setSelectedSubmission(prev => {
                    if (!prev) return null;
                    const updatedDocs = prev.documents.map(d => d.name === viewingDocument.fileName ? { ...d, status: 'REJECTED' as const } : d);
                    const updatedChecklist = prev.checklist.map(c => 
                      c.label === 'Document Verification' ? { ...c, done: false } : c
                    );
                    return { ...prev, documents: updatedDocs, checklist: updatedChecklist };
                  });
                } else {
                  handleRejectDocument(viewingDocument.id);
                  setViewingDocument(prev => prev ? { ...prev, status: 'REJECTED' } : null);
                }
              }}
            />
          )}
        </main>
      </div>
    </div>
  );
}
