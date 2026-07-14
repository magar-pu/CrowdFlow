"use client";

import { useParams, useRouter } from "next/navigation";
import DocumentDetailView from "../../components/DocumentDetailView";
import { useAuditorData } from "../../AuditorDataContext";

export default function AuditorDocumentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { documents, handleVerifyDocument, handleRejectDocument } = useAuditorData();

  const doc = documents.find((d) => d.id === params.id);

  if (!doc) {
    return (
      <div className="bg-white border border-border-subtle rounded-xl p-10 text-center animate-fade-in">
        <p className="text-sm font-bold text-text-primary">Document not found</p>
        <p className="text-xs text-text-secondary mt-1">"{params.id}" does not match any document review.</p>
        <button
          onClick={() => router.push('/auditor/documents')}
          className="mt-3 text-xs font-bold text-secondary hover:underline cursor-pointer"
        >
          Back to Documents
        </button>
      </div>
    );
  }

  return (
    <DocumentDetailView
      document={doc}
      onBack={() => router.push('/auditor/documents')}
      onVerify={() => handleVerifyDocument(doc.id)}
      onReject={() => handleRejectDocument(doc.id)}
    />
  );
}
