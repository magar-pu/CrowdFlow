"use client";

import AnalyticsView from "@/components/admin/analytics/AnalyticsView";
import { useAdminData } from "../AdminDataContext";

export default function AdminAnalyticsPage() {
  const { events, users, transactions } = useAdminData();

  return <AnalyticsView events={events} users={users} transactions={transactions} />;
}
