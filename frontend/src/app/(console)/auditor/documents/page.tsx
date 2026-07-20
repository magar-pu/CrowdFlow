"use client";

import { useRouter } from "next/navigation";
import DocumentsView from "../components/DocumentsView";
import { useAuditorData } from "../AuditorDataContext";

export default function AuditorDocumentsPage() {
  const router = useRouter();
  const { documents, handleVerifyDocument, handleRejectDocument } = useAuditorData();

  return (
    <DocumentsView
      documents={documents}
      onVerify={handleVerifyDocument}
      onReject={handleRejectDocument}
      onViewDocument={(doc) => router.push(`/auditor/documents/${doc.id}`)}
    />
  );
}
