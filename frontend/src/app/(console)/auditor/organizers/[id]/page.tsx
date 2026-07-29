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

          // Absent fields stay absent. Every `|| "<plausible value>"` below was
          // a fabrication the auditor could not tell from a real answer — a
          // fake NIK, a fake NPWP, a fake NIB, a fake BCA account number and a
          // stock photo as the applicant's logo, identical for every organizer
          // on the platform. The view now drops empty rows, so "" renders as
          // nothing rather than as a lie.
          //
          // Fields the backend does not return AT ALL (npwp, businessLicense,
          // registrationNumber, picPosition, picNationalId, industry,
          // eventCategory, yearsInBusiness, previousEventsCount,
          // estimatedAnnualRevenue) are simply not mapped — they were removed
          // from the view and from OrganizerVerification.
          const mapped: OrganizerVerification = {
            id: String(raw.id),
            name: raw.name || "Unknown applicant",
            companyName: raw.companyName || "Unknown company",
            logo: raw.logo || "",
            status: raw.status || "Pending",
            registrationDate: raw.registrationDate || "",
            lastActivity: raw.lastActivity || "",
            province: raw.province || "",
            businessType: raw.businessType || "",
            address: raw.address || "",
            picName: raw.picName || raw.name || "",
            picEmail: raw.picEmail || "",
            picPhone: raw.picPhone || "",
            bankName: raw.bankName || "",
            bankAccountHolder: raw.bankAccountHolder || "",
            bankAccountNumber: raw.bankAccountNumber || "",
            // No fallback. GetOrganizer did not return this field at all, so the
            // old `|| "Pending"` meant the profile showed "Pending" for every
            // organizer forever — including accounts an auditor had verified,
            // which the payout screen displayed correctly at the same time.
            bankVerificationStatus:
              raw.bankVerificationStatus === "verified" ? "Verified" : "Unverified",
            checklist: raw.checklist || {
              businessLicenseValid: isNibVerified || isSiupVerified,
              npwpValid: isNpwpVerified,
              picIdentityVerified: isKtpVerified,
              bankAccountVerified: false,
              addressVerified: false,
              emailVerified: true,
              phoneVerified: true,
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
              // The object key, kept for reference only. Opening a document goes
              // through the signed-URL endpoint; this is never a usable href.
              // The old "/placeholder-document.pdf" fallback turned a missing
              // document into a working link to an unrelated file.
              fileUrl: d.fileUrl || ""
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
