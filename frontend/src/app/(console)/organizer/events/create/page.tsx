"use client";

import { useRouter } from "next/navigation";
import CreateEventWizard from "../../components/CreateEventWizard/CreateEventWizard";
import { useOrganizerData } from "../../OrganizerDataContext";

export default function OrganizerCreateEventPage() {
  const router = useRouter();
  const { handleCreateEvent } = useOrganizerData();

  return (
    <CreateEventWizard
      onCancel={() => router.push('/organizer/events')}
      onSubmitSuccess={(newEvent) => {
        handleCreateEvent(newEvent);
        router.push('/organizer/events');
      }}
    />
  );
}
