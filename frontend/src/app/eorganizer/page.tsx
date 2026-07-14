"use client";

import { useRouter } from "next/navigation";
import DashboardView from "./components/DashboardView";

export default function EorganizerDashboardPage() {
  const router = useRouter();

  return (
    <DashboardView
      onCreateEvent={() => router.push('/eorganizer/events/create')}
      onNavigateToView={(v) => router.push(`/eorganizer/${v}`)}
    />
  );
}
