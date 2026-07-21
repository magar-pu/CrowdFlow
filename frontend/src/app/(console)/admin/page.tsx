"use client";

import { useRouter } from "next/navigation";
import DashboardView from "@/components/admin/dashboard/DashboardView";
import { useAdminData } from "./AdminDataContext";

export default function AdminDashboardPage() {
  const router = useRouter();
  const {
    events,
    users,
    transactions,
    verifications,
    securityAlerts,
    activities,
    handleApproveVerification,
    handleRejectVerification,
  } = useAdminData();

  return (
    <DashboardView
      events={events}
      users={users}
      transactions={transactions}
      verifications={verifications}
      alerts={securityAlerts}
      activities={activities}
      onApproveVerification={handleApproveVerification}
      onRejectVerification={handleRejectVerification}
      onViewChange={(view) => router.push(view === 'dashboard' ? '/admin' : `/admin/${view}`)}
    />
  );
}
