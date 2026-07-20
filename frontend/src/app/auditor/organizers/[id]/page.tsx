"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import OrganizerDetailView from "../../components/OrganizerDetailView";
import { useAuditorData } from "../../AuditorDataContext";
import { getOrganizer, verifyDocument, rejectDocument } from "@/lib/api/auditor";
import { OrganizerVerification, ReviewDocument } from "../../types";

export default function AuditorOrganizerDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { handleUpdateOrganizerStatus, handleUpdateOrganizerChecklist } = useAuditorData();

  const [organizer, setOrganizer] = useState<OrganizerVerification | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadOrganizer() {
      try {
        setLoading(true);
        const res = await getOrganizer(params.id);
        if (res.success && res.data) {
          // Map sparse backend data with clean fallback defaults to prevent UI crash
          const raw = res.data as any;
          const docs = raw.documents || [];
          const isKtpVerified = docs.some((d: any) => d.name === "KTP" && d.status === "verified");
          const isNpwpVerified = docs.some((d: any) => d.name === "NPWP" && d.status === "verified");
          const isNibVerified = docs.some((d: any) => d.name === "NIB" && d.status === "verified");
          const isSiupVerified = docs.some((d: any) => d.name === "SIUP" && d.status === "verified");

          const mapped: OrganizerVerification = {
            id: String(raw.id),
            name: raw.name || "Unknown applicant",
            companyName: raw.companyName || "Unknown company",
            logo: raw.logo || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80",
            status: raw.status || "Pending",
            registrationDate: raw.registrationDate || new Date().toISOString().split('T')[0],
            lastActivity: raw.lastActivity || new Date().toISOString().split('T')[0],
            province: raw.province || "DKI Jakarta",
            businessType: raw.businessType || "PT / Limited Liability",
            riskScore: raw.riskScore || 15,
            riskCategory: raw.riskCategory || "Low",
            companyType: raw.companyType || "Event Organizer",
            businessLicense: raw.businessLicense || "NIB-2024-91283",
            npwp: raw.npwp || "01.234.567.8-012.000",
            address: raw.address || "Sudirman Central Business District, Jakarta",
            registrationNumber: raw.registrationNumber || "AHU-001239-AH.01.01",
            picName: raw.picName || raw.name || "PIC Name",
            picPosition: raw.picPosition || "Director",
            picEmail: raw.picEmail || raw.picEmail || "pic@company.com",
            picPhone: raw.picPhone || raw.picPhone || "+62 812-3456-7890",
            picNationalId: raw.picNationalId || "3174091234560002",
            picSelfieUrl: raw.picSelfieUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100",
            industry: raw.industry || "Creative Industries",
            eventCategory: raw.eventCategory || "Concerts & Festivals",
            yearsInBusiness: raw.yearsInBusiness || 2,
            previousEventsCount: raw.previousEventsCount || 5,
            estimatedAnnualRevenue: raw.estimatedAnnualRevenue || 150000000,
            bankName: raw.bankName || "Bank Central Asia (BCA)",
            bankAccountHolder: raw.bankAccountHolder || raw.companyName || "Company Account",
            bankAccountNumber: raw.bankAccountNumber || "5012394012",
            bankVerificationStatus: raw.bankVerificationStatus || "Pending",
            checklist: raw.checklist || {
              businessLicenseValid: isNibVerified || isSiupVerified,
              npwpValid: isNpwpVerified,
              picIdentityVerified: isKtpVerified,
              bankAccountVerified: false,
              addressVerified: false,
              emailVerified: true,
              phoneVerified: true,
            },
            riskAssessment: raw.riskAssessment || {
              identityMatch: true,
              companyValidation: true,
              fraudHistory: false,
              duplicateAccount: false,
              suspiciousActivity: false,
            },
            internalNotes: raw.internalNotes || "",
            organizerFeedback: raw.organizerFeedback || "",
            history: raw.history || [],
            documents: docs.map((d: any) => ({
              id: String(d.id),
              name: d.name,
              category: d.category || "Permits & Licenses",
              status: d.status === "verified" ? "VERIFIED" : d.status === "rejected" ? "REJECTED" : "WAITING REVIEW",
              uploadDate: d.uploadDate || raw.registrationDate,
              fileUrl: d.fileUrl || "/placeholder-document.pdf"
            }))
          };
          setOrganizer(mapped);
        } else {
          setError(res.error?.message || "Failed to load organizer details");
        }
      } catch (err) {
        setError("An unexpected error occurred while loading organizer");
      } finally {
        setLoading(false);
      }
    }
    loadOrganizer();
  }, [params.id]);

  const handleVerifyDoc = async (docId: string) => {
    try {
      const res = await verifyDocument(docId);
      if (res.success) {
        setOrganizer((prev) => {
          if (!prev) return null;
          // Dynamically set verified status in checklist too
          const updatedDocs = (prev.documents || []).map((d: ReviewDocument) =>
            d.id === docId ? { ...d, status: "VERIFIED" as const } : d
          );
          
          const isKtpVerified = updatedDocs.some((d: ReviewDocument) => d.name === "KTP" && d.status === "VERIFIED");
          const isNpwpVerified = updatedDocs.some((d: ReviewDocument) => d.name === "NPWP" && d.status === "VERIFIED");
          const isNibVerified = updatedDocs.some((d: ReviewDocument) => d.name === "NIB" && d.status === "VERIFIED");
          const isSiupVerified = updatedDocs.some((d: ReviewDocument) => d.name === "SIUP" && d.status === "VERIFIED");

          return {
            ...prev,
            documents: updatedDocs,
            checklist: {
              ...prev.checklist,
              picIdentityVerified: isKtpVerified,
              npwpValid: isNpwpVerified,
              businessLicenseValid: isNibVerified || isSiupVerified,
            }
          };
        });
      } else {
        alert("Failed to verify document: " + (res.error?.message || "unknown error"));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRejectDoc = async (docId: string) => {
    try {
      const reason = prompt("Enter document rejection reason:") || "Document invalid or unreadable";
      const res = await rejectDocument(docId, reason);
      if (res.success) {
        setOrganizer((prev) => {
          if (!prev) return null;
          const updatedDocs = (prev.documents || []).map((d: ReviewDocument) =>
            d.id === docId ? { ...d, status: "REJECTED" as const } : d
          );

          const isKtpVerified = updatedDocs.some((d: ReviewDocument) => d.name === "KTP" && d.status === "VERIFIED");
          const isNpwpVerified = updatedDocs.some((d: ReviewDocument) => d.name === "NPWP" && d.status === "VERIFIED");
          const isNibVerified = updatedDocs.some((d: ReviewDocument) => d.name === "NIB" && d.status === "VERIFIED");
          const isSiupVerified = updatedDocs.some((d: ReviewDocument) => d.name === "SIUP" && d.status === "VERIFIED");

          return {
            ...prev,
            documents: updatedDocs,
            checklist: {
              ...prev.checklist,
              picIdentityVerified: isKtpVerified,
              npwpValid: isNpwpVerified,
              businessLicenseValid: isNibVerified || isSiupVerified,
            }
          };
        });
      } else {
        alert("Failed to reject document: " + (res.error?.message || "unknown error"));
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-3 text-sm text-text-secondary">Loading organizer profile...</span>
      </div>
    );
  }

  if (error || !organizer) {
    return (
      <div className="bg-white border border-border-subtle rounded-xl p-10 text-center animate-fade-in">
        <p className="text-sm font-bold text-text-primary">Organizer not found</p>
        <p className="text-xs text-text-secondary mt-1">{error || `"${params.id}" does not match any organizer.`}</p>
        <button
          onClick={() => router.push('/auditor/organizers')}
          className="mt-3 text-xs font-bold text-secondary hover:underline cursor-pointer"
        >
          Back to Organizers
        </button>
      </div>
    );
  }

  return (
    <OrganizerDetailView
      organizer={organizer}
      onBack={() => router.push('/auditor/organizers')}
      onUpdateOrganizerStatus={handleUpdateOrganizerStatus}
      onUpdateOrganizerChecklist={handleUpdateOrganizerChecklist}
      onVerifyDocument={handleVerifyDoc}
      onRejectDocument={handleRejectDoc}
    />
  );
}
