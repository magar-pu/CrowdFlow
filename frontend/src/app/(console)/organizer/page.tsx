"use client";

import { useRouter } from "next/navigation";
import DashboardView from "./components/DashboardView";

export default function OrganizerDashboardPage() {
  const router = useRouter();

  return (
    <DashboardView
      onCreateEvent={() => router.push('/organizer/events/create')}
      onNavigateToView={(v) => router.push(`/organizer/${v}`)}
    />
  );
}
