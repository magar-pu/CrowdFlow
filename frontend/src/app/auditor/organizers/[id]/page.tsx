"use client";

import { useParams, useRouter } from "next/navigation";
import OrganizerDetailView from "../../components/OrganizerDetailView";
import { useAuditorData } from "../../AuditorDataContext";

export default function AuditorOrganizerDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { organizers, handleUpdateOrganizerStatus, handleUpdateOrganizerChecklist } = useAuditorData();

  const organizer = organizers.find((o) => o.id === params.id);

  if (!organizer) {
    return (
      <div className="bg-white border border-border-subtle rounded-xl p-10 text-center animate-fade-in">
        <p className="text-sm font-bold text-text-primary">Organizer not found</p>
        <p className="text-xs text-text-secondary mt-1">"{params.id}" does not match any organizer.</p>
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
    />
  );
}
