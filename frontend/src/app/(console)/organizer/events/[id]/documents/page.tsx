"use client";

import { useParams } from "next/navigation";
import EventWorkspaceShell from "../../../components/EventWorkspaceShell";
import WorkspaceDocuments from "../../../components/Workspace/WorkspaceDocuments";
import { useOrganizerData } from "../../../OrganizerDataContext";

// Statuses where the organizer no longer owns the paperwork: it is either sitting
// with an auditor or has already been approved. Anything else (draft, needs
// revision, rejected) is theirs to change.
const LOCKED_STATUSES = new Set([
  "pending_review",
  "pending review",
  "in review",
  "approved",
  "live",
  "scheduled",
]);

export default function OrganizerEventDocumentsPage() {
  const params = useParams<{ id: string }>();
  const eventIdNum = Number(params.id);
  const valid = !isNaN(eventIdNum);

  const { events } = useOrganizerData();
  const event = events.find((e) => e.id === params.id);
  const readOnly = LOCKED_STATUSES.has((event?.status ?? "").toLowerCase());

  return (
    <EventWorkspaceShell eventId={params.id} activeTab="documents">
      {valid && (
        <div className="mt-6">
          <WorkspaceDocuments eventId={eventIdNum} readOnly={readOnly} />
        </div>
      )}
    </EventWorkspaceShell>
  );
}
