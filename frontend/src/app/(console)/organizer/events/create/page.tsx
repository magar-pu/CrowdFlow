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
      onSubmitSuccess={async (newEvent, coverFile) => {
        const newId = await handleCreateEvent(newEvent, coverFile);
        // Land the organizer inside the new event's workspace, where tickets,
        // venue/seating and submission actually live — not back on the list.
        router.push(newId ? `/organizer/events/${newId}` : '/organizer/events');
      }}
    />
  );
}
