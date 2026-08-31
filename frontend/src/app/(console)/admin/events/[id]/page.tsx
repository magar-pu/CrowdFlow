"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import EventWorkspaceView from "@/components/admin/workspace/EventWorkspaceView";
import { useAdminData } from "../../AdminDataContext";

export default function AdminEventWorkspacePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const {
    events,
    ticketTiers,
    transactions,
    workspaceLoading,
    workspaceError,
    openWorkspace,
    handleUpdateTiers,
    handleDeleteTier,
    handleSetEventDraft,
    handleSetEventPendingReview,
    handleApproveEvent,
    handleRejectEvent,
    refreshEventDetails,
  } = useAdminData();

  // Load this event's tiers/sections and mark it as the active workspace
  // (so the tier mutations target it) whenever the id in the URL changes.
  useEffect(() => {
    if (params.id) openWorkspace(params.id);
  }, [params.id, openWorkspace]);

  const selectedEvent = events.find((e) => e.id === params.id);

  return (
    <div className="space-y-4">
      {workspaceError && (
        <div className="rounded-lg border border-danger/20 bg-danger/5 px-4 py-3 text-xs font-semibold text-danger">
          {workspaceError}
        </div>
      )}
      {workspaceLoading || !selectedEvent ? (
        <div className="py-24 text-center text-sm text-text-secondary">Loading event workspace...</div>
      ) : (
        <EventWorkspaceView
          event={selectedEvent}
          ticketTiers={ticketTiers}
          transactions={transactions}
          onBack={() => router.push('/admin/events')}
          onUpdateTiers={handleUpdateTiers}
          onDeleteTier={handleDeleteTier}
          onSetDraft={handleSetEventDraft}
          onSetPendingReview={handleSetEventPendingReview}
          onApproveEvent={handleApproveEvent}
          onRejectEvent={handleRejectEvent}
          onDetailsSaved={refreshEventDetails}
        />
      )}
    </div>
  );
}
