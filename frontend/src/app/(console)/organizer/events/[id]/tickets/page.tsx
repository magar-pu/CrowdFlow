"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import EventWorkspaceShell from "../../../components/EventWorkspaceShell";
import WorkspaceTickets from "../../../components/Workspace/WorkspaceTickets";
import { TicketTier } from "../../../types";
import {
  listTicketTiers,
  createTicketTier,
  updateTicketTier,
  deleteTicketTier,
  getEventSeating,
  getOrganizerEvent,
  setEventMaxTicketsPerOrder,
  type OrganizerTicketTier,
  type EventSeating,
} from "@/lib/api/eorganizer";

// Ticket tiers are the real, event-scoped rows from ticket_tiers (the seating
// overlay in the Venue tab references these by id). The backend has no colour;
// we assign a stable one per position purely for display.
const TIER_COLORS = ["#3B82F6", "#8B5CF6", "#EC4899", "#F59E0B", "#10B981", "#0EA5E9"];

function toTicketTier(t: OrganizerTicketTier, i: number): TicketTier {
  return {
    id: t.id,
    name: t.name,
    price: t.price,
    sold: t.sold,
    capacity: t.capacity,
    status: (t.status as TicketTier["status"]) || "On Sale",
    color: TIER_COLORS[i % TIER_COLORS.length],
    salesStart: t.salesStart ? t.salesStart.slice(0, 10) : undefined,
    salesEnd: t.salesEnd ? t.salesEnd.slice(0, 10) : undefined,
    description: t.description,
  };
}

export default function OrganizerEventTicketsPage() {
  const params = useParams<{ id: string }>();
  const eventId = Number(params.id);
  const [tiers, setTiers] = useState<TicketTier[]>([]);
  // Seat-map figures back the "Seats Priced" tile: real capacity is however many
  // seats carry a tier, not the sum of the tiers' allocation limits.
  const [seating, setSeating] = useState<EventSeating | null>(null);
  // Event-level order cap. 0 means uncapped, which is a real setting rather
  // than a missing one, so it is seeded from the event and not defaulted here.
  const [maxTicketsPerOrder, setMaxTicketsPerOrder] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (isNaN(eventId)) {
      setError("This event has no numeric id yet — create it first.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const [res, seatingRes, eventRes] = await Promise.all([
      listTicketTiers(eventId),
      getEventSeating(eventId),
      getOrganizerEvent(eventId),
    ]);
    if (res.success && res.data) {
      setTiers(res.data.map(toTicketTier));
    } else {
      setError(res.error?.message ?? "Failed to load ticket tiers");
    }
    // A missing seat map is the normal state of a draft, not an error — the tile
    // renders "No seat map yet" rather than failing the whole tab.
    setSeating(seatingRes.success && seatingRes.data ? seatingRes.data : null);
    if (eventRes.success && eventRes.data) {
      setMaxTicketsPerOrder(eventRes.data.maxTicketsPerOrder ?? 0);
    }
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (tier: Omit<TicketTier, "id">) => {
    const res = await createTicketTier(eventId, {
      name: tier.name,
      price: tier.price,
      capacity: tier.capacity,
      status: tier.status ?? "On Sale",
      salesStart: tier.salesStart ?? "",
      salesEnd: tier.salesEnd ?? "",
      description: tier.description ?? "",
    } as Omit<OrganizerTicketTier, "id" | "sold">);
    if (res.success) await load();
    else setError(res.error?.message ?? "Failed to create ticket tier");
  };

  const handleUpdate = async (id: string, updated: Partial<TicketTier>) => {
    const res = await updateTicketTier(eventId, Number(id), updated as Partial<OrganizerTicketTier>);
    if (res.success) await load();
    else setError(res.error?.message ?? "Failed to update ticket tier");
  };

  /**
   * Throws on failure so the card can show its own inline error and keep the
   * value the organizer typed, rather than this page replacing the whole tab
   * with a banner.
   */
  const handleSaveMaxTicketsPerOrder = async (value: number) => {
    const res = await setEventMaxTicketsPerOrder(eventId, value);
    if (!res.success) {
      throw new Error(res.error?.message ?? "Failed to save the order limit");
    }
    setMaxTicketsPerOrder(value);
  };

  const handleDelete = async (id: string) => {
    const res = await deleteTicketTier(eventId, Number(id));
    if (res.success) await load();
    else setError(res.error?.message ?? "Failed to delete ticket tier");
  };

  return (
    <EventWorkspaceShell eventId={params.id} activeTab="tickets">
      {error && (
        <div className="mb-4 rounded-lg border border-danger/20 bg-danger/10 px-4 py-2 text-xs font-semibold text-danger">
          {error}
        </div>
      )}
      {loading ? (
        <div className="h-40 animate-pulse rounded-xl bg-surface-container" />
      ) : (
        <WorkspaceTickets
          ticketTiers={tiers}
          seating={seating}
          maxTicketsPerOrder={maxTicketsPerOrder}
          onSaveMaxTicketsPerOrder={handleSaveMaxTicketsPerOrder}
          onCreateTier={handleCreate}
          onUpdateTier={handleUpdate}
          onDeleteTier={handleDelete}
        />
      )}
    </EventWorkspaceShell>
  );
}
