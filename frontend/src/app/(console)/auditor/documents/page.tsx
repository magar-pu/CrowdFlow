"use client";

import NotificationsView from "../components/NotificationsView";
import { useAuditorData } from "../AuditorDataContext";

export default function AuditorDocumentsPage() {
  const { notifications, fetchDashboard } = useAuditorData();

  return (
    <NotificationsView
      notifications={notifications}
      fetchNotifications={fetchDashboard}
    />
  );
}
