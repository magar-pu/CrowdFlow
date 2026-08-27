"use client";

import { useParams, useRouter } from "next/navigation";
import EventWorkspaceShell from "../../../components/EventWorkspaceShell";
import WorkspaceSettings from "../../../components/Workspace/WorkspaceSettings";
import { useOrganizerData } from "../../../OrganizerDataContext";
import {
  deleteOrganizerEvent,
  updateOrganizerEvent,
  withdrawOrganizerEvent,
  archiveOrganizerEvent,
  unarchiveOrganizerEvent,
} from "@/lib/api/eorganizer";

// Cover art is locked only while an auditor holds the event: swapping the image
// mid-review changes what they are reviewing. A live event stays editable —
// refreshing cover art on a running event is ordinary marketing, and the
// backend imposes no restriction of its own.
const COVER_LOCKED_STATUSES = new Set(["in review", "scheduled"]);

export default function OrganizerEventSettingsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { events, fetchData, pushToast } = useOrganizerData();
  const event = events.find((e) => e.id === params.id);
  const eventId = Number(params.id);

  const handleSaveGeneral = async (values: {
    name: string;
    category: string;
    description: string;
    startDate: string;
  }) => {
    const res = await updateOrganizerEvent(eventId, {
      name: values.name,
      category: values.category,
      description: values.description,
      // The update keeps the existing times; only the calendar day moves here.
      startDate: values.startDate,
      startTime: event?.startTime,
      endDate: event?.endDate,
      endTime: event?.endTime,
      // The update writes every column it receives, so a field left out of the
      // payload is blanked — carry the cover image through untouched.
      image: event?.image,
    });
    if (res.success) {
      pushToast("Event details saved", "success");
      await fetchData();
      return true;
    }
    pushToast(`Failed to save: ${res.error?.message ?? "Unknown error"}`, "warning");
    return false;
  };

  const isArchived = event?.status === "Archived";
  // The backend only deletes drafts; anything submitted has an audit trail.
  const canDelete = event?.status === "Draft";
  // "In Review" is how the console renders pending_review. Withdrawal is also
  // refused server-side once an auditor claims the event, which this cannot
  // know — the 409 is surfaced as a toast.
  const canWithdraw = event?.status === "In Review";
  // Mirrors the server rule: terminal events only.
  const canArchive = !isArchived && (event?.status === "Draft" || event?.status === "Rejected");
  const coverReadOnly = COVER_LOCKED_STATUSES.has((event?.status ?? "").toLowerCase());

  const handleDeleteEvent = async () => {
    const res = await deleteOrganizerEvent(eventId);
    if (res.success) {
      pushToast("Event deleted", "success");
      await fetchData();
      router.push("/organizer/events");
      return true;
    }
    pushToast(`Failed to delete: ${res.error?.message ?? "Unknown error"}`, "warning");
    return false;
  };

  const handleWithdrawEvent = async () => {
    const res = await withdrawOrganizerEvent(eventId);
    if (res.success) {
      pushToast("Event withdrawn from review and returned to draft", "success");
      // Stay in the workspace: the point of withdrawing is to keep editing.
      await fetchData();
      return true;
    }
    pushToast(res.error?.message ?? "Failed to withdraw event", "warning");
    return false;
  };

  const handleArchiveEvent = async () => {
    const res = await archiveOrganizerEvent(eventId);
    if (res.success) {
      pushToast("Event archived. Find it under Archived on the Events page.", "success");
      await fetchData();
      router.push("/organizer/events");
      return true;
    }
    pushToast(res.error?.message ?? "Failed to archive event", "warning");
    return false;
  };

  const handleUnarchiveEvent = async () => {
    const res = await unarchiveOrganizerEvent(eventId);
    if (res.success) {
      pushToast("Event restored to your active list", "success");
      await fetchData();
      return true;
    }
    pushToast(res.error?.message ?? "Failed to restore event", "warning");
    return false;
  };

  return (
    <EventWorkspaceShell eventId={params.id} activeTab="settings">
      {event && (
        <WorkspaceSettings
          eventId={eventId}
          eventName={event.name}
          initial={{
            category: event.category,
            description: event.description,
            startDate: event.startDate,
            image: event.image,
          }}
          onSaveGeneral={handleSaveGeneral}
          onDeleteEvent={handleDeleteEvent}
          canDelete={canDelete}
          onWithdrawEvent={handleWithdrawEvent}
          canWithdraw={canWithdraw}
          isArchived={isArchived}
          onArchiveEvent={handleArchiveEvent}
          onUnarchiveEvent={handleUnarchiveEvent}
          canArchive={canArchive}
          coverReadOnly={coverReadOnly}
          onCoverUploaded={fetchData}
        />
      )}
    </EventWorkspaceShell>
  );
}
