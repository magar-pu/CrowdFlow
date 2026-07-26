"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import EventWorkspaceShell from "../../components/EventWorkspaceShell";
import WorkspaceOverview, { type Range } from "../../components/Workspace/WorkspaceOverview";
import { useOrganizerData } from "../../OrganizerDataContext";
import {
  listEventOrders,
  getEventAnalytics,
  type AnalyticsPoint,
  type OrganizerOrder,
} from "@/lib/api/eorganizer";

export default function OrganizerEventOverviewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { events, logs } = useOrganizerData();
  const event = events.find((e) => e.id === params.id);
  const eventId = Number(params.id);

  const [orders, setOrders] = useState<OrganizerOrder[]>([]);
  const [points, setPoints] = useState<AnalyticsPoint[]>([]);
  const [range, setRange] = useState<Range>("30d");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!Number.isInteger(eventId) || eventId <= 0) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [ordersRes, analyticsRes] = await Promise.all([
      listEventOrders(eventId),
      getEventAnalytics(eventId, range),
    ]);
    setOrders(ordersRes.success && ordersRes.data ? ordersRes.data : []);
    setPoints(analyticsRes.success && analyticsRes.data ? analyticsRes.data.points : []);
    setLoading(false);
  }, [eventId, range]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <EventWorkspaceShell eventId={params.id} activeTab="overview">
      {event && (
        <WorkspaceOverview
          event={event}
          orders={orders}
          points={points}
          range={range}
          onRangeChange={setRange}
          loading={loading}
          logs={logs}
          onSwitchTab={(tab) => router.push(tab === 'overview' ? `/organizer/events/${params.id}` : `/organizer/events/${params.id}/${tab}`)}
        />
      )}
    </EventWorkspaceShell>
  );
}
