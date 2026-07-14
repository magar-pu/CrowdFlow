"use client";

import { useRouter } from "next/navigation";
import CreateEventWizard from "../../components/CreateEventWizard/CreateEventWizard";
import { useEorganizerData } from "../../EorganizerDataContext";

export default function EorganizerCreateEventPage() {
  const router = useRouter();
  const { handleCreateEvent } = useEorganizerData();

  return (
    <CreateEventWizard
      onCancel={() => router.push('/eorganizer/events')}
      onSubmitSuccess={(newEvent) => {
        handleCreateEvent(newEvent);
        router.push('/eorganizer/events');
      }}
    />
  );
}
