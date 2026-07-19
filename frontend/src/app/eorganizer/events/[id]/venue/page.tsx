"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import EventWorkspaceShell from "../../../components/EventWorkspaceShell";
import WorkspaceVenue from "../../../components/Workspace/WorkspaceVenue";
import { getVenueLayout, createVenueSection, updateVenueSection, deleteVenueSection, VenueSection } from "@/lib/api/eorganizer";

export default function EorganizerEventVenuePage() {
  const params = useParams<{ id: string }>();
  const eventIdNum = Number(params.id);
  const [sections, setSections] = useState<VenueSection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLayout = async () => {
    setIsLoading(true);
    const res = await getVenueLayout(eventIdNum);
    if (res.success && res.data) {
      setSections(res.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (!isNaN(eventIdNum)) {
      fetchLayout();
    }
  }, [eventIdNum]);

  const handleAdd = async (sec: Omit<VenueSection, "id" | "sold">) => {
    const res = await createVenueSection(eventIdNum, sec);
    if (res.success) {
      await fetchLayout();
    } else {
      alert(`Failed to add venue section: ${res.error?.message || "Unknown error"}`);
    }
  };

  const handleUpdate = async (secId: number, sec: Partial<VenueSection>) => {
    const res = await updateVenueSection(eventIdNum, secId, sec);
    if (res.success) {
      await fetchLayout();
    } else {
      alert(`Failed to update venue section: ${res.error?.message || "Unknown error"}`);
    }
  };

  const handleDelete = async (secId: number) => {
    if (confirm("Are you sure you want to delete this venue section? This will also remove the corresponding ticket tier!")) {
      const res = await deleteVenueSection(eventIdNum, secId);
      if (res.success) {
        await fetchLayout();
      } else {
        alert(`Failed to delete venue section: ${res.error?.message || "Unknown error"}`);
      }
    }
  };

  return (
    <EventWorkspaceShell eventId={params.id} activeTab="venue">
      <WorkspaceVenue
        sections={sections}
        isLoading={isLoading}
        onAddSection={handleAdd}
        onUpdateSection={handleUpdate}
        onDeleteSection={handleDelete}
      />
    </EventWorkspaceShell>
  );
}
