"use client";

/**
 * Organizer order-detail screen — /organizer/events/[id]/orders/[orderId].
 * Reached from the event workspace's Overview tab (Recent Transactions rows
 * are links here). Revives GET /api/organizer/orders/{id}, which had zero
 * frontend callers before this page.
 *
 * Two capabilities from Phase 4's M4/M5 mitigations
 * (plan_2026-08-30_dynamic_qr_ticketman.md):
 *  - M5 access telemetry: accessDeviceCount / accessOutlier, presented as an
 *    OBSERVATION rather than a verdict — see the copy below for why.
 *  - M4 organizer panic-revoke: a per-ticket "issue a new key" action that
 *    also breaks the ATTENDEE'S OWN device (no purchaser-side auto-refresh
 *    reaches them), which the confirm step below says explicitly.
 */

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ShieldAlert, KeyRound, AlertTriangle } from "lucide-react";
import EventWorkspaceShell from "../../../../components/EventWorkspaceShell";
import { useOrganizerData } from "../../../../OrganizerDataContext";
import {
  getOrderDetails,
  rotateOrganizerTicketSecret,
  type OrganizerOrder,
  type OrganizerOrderTicket,
} from "@/lib/api/eorganizer";
import { formatIDR } from "@/lib/pricing";

const orderStatusStyle = (status: string) =>
  status === "Paid"
    ? "bg-success/10 text-success border-success/20"
    : status === "Pending"
    ? "bg-warning/10 text-warning border-warning/20"
    : status === "Refunded"
    ? "bg-secondary/10 text-secondary border-secondary/20"
    : "bg-danger/10 text-danger border-danger/20";

const ticketStatusStyle = (status: string) => {
  const s = status.toLowerCase();
  if (s === "used") return "bg-success/10 text-success border-success/20";
  if (s === "cancelled" || s === "refunded" || s === "expired") return "bg-danger/10 text-danger border-danger/20";
  return "bg-secondary/10 text-secondary border-secondary/20"; // issued / reserved / resold / ready
};

export default function OrganizerOrderDetailPage() {
  const params = useParams<{ id: string; orderId: string }>();
  const router = useRouter();
  const eventId = Number(params.id);
  const { events } = useOrganizerData();
  const event = events.find((e) => e.id === params.id);

  const [order, setOrder] = useState<OrganizerOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await getOrderDetails(params.orderId);
    if (res.success && res.data) {
      setOrder(res.data);
      setError("");
    } else {
      setError(res.error?.message || "Order not found.");
    }
    setLoading(false);
  }, [params.orderId]);

  useEffect(() => {
    load();
  }, [load]);

  // Whether the event's own scheduled start has already passed — used only
  // to add friction to revoking, never to block it outright: an organizer
  // may legitimately need to revoke mid-event in response to a real fraud
  // report. Read via an effect (Date.now() is an impure, external-system
  // read) rather than inline during render.
  const [eventHasStarted, setEventHasStarted] = useState(false);
  useEffect(() => {
    if (!event) {
      setEventHasStarted(false);
      return;
    }
    const dt = new Date(`${event.startDate}T${event.startTime}`);
    setEventHasStarted(!isNaN(dt.getTime()) && dt.getTime() <= Date.now());
  }, [event]);

  // Which ticket's inline confirm panel is open, and in-flight/result state
  // per ticket (rotation is per-ticket, so this is keyed by ticketId rather
  // than a single shared piece of state).
  const [confirmingTicketId, setConfirmingTicketId] = useState<string | null>(null);
  const [ackRisk, setAckRisk] = useState(false);
  const [rotatingTicketId, setRotatingTicketId] = useState<string | null>(null);
  const [rotateMessages, setRotateMessages] = useState<Record<string, string>>({});

  function openConfirm(ticketId: string) {
    setConfirmingTicketId(ticketId);
    setAckRisk(false);
  }

  function cancelConfirm() {
    setConfirmingTicketId(null);
    setAckRisk(false);
  }

  async function handleConfirmRevoke(ticket: OrganizerOrderTicket) {
    setRotatingTicketId(ticket.ticketId);
    try {
      const res = await rotateOrganizerTicketSecret(eventId, ticket.ticketId);
      setRotateMessages((m) => ({
        ...m,
        [ticket.ticketId]: res.success
          ? `New key issued. ${ticket.attendeeFullName || "This attendee"} must reopen their ticket link while online before they can be scanned in again.`
          : res.error?.message || "Couldn't issue a new key. Try again.",
      }));
    } catch {
      setRotateMessages((m) => ({ ...m, [ticket.ticketId]: "Couldn't issue a new key. Try again." }));
    } finally {
      setRotatingTicketId(null);
      setConfirmingTicketId(null);
      setAckRisk(false);
    }
  }

  return (
    <EventWorkspaceShell eventId={params.id} activeTab="overview">
      <div className="mt-4 space-y-6 animate-fade-in text-left">
        <button
          onClick={() => router.push(`/organizer/events/${params.id}`)}
          className="flex items-center gap-1.5 text-[10px] font-bold text-secondary hover:text-primary transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Overview
        </button>

        {loading && (
          <div className="p-6 text-center text-xs text-on-surface-variant font-mono bg-white border border-border-subtle rounded-xl">
            Loading order…
          </div>
        )}

        {!loading && error && (
          <div className="p-6 text-center text-xs text-danger font-mono bg-white border border-border-subtle rounded-xl">
            {error}
          </div>
        )}

        {!loading && order && (
          <>
            {/* Buyer identity + order summary */}
            <div className="p-5 bg-white border border-border-subtle rounded-xl shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-text-primary">{order.customerName}</h2>
                  <p className="text-xs text-text-secondary">{order.customerEmail}</p>
                  <p className="mt-1 text-xs text-text-secondary">{order.eventName}</p>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-block px-2 py-0.5 rounded font-mono text-[9px] font-bold border ${orderStatusStyle(
                      order.status
                    )}`}
                  >
                    {order.status}
                  </span>
                  <p className="mt-1 text-sm font-mono font-bold text-text-primary">{formatIDR(order.amount)}</p>
                  <p className="text-[10px] text-text-secondary">{order.paymentMethod} · {order.time}</p>
                </div>
              </div>
              <p className="mt-3 font-mono text-[10px] text-text-secondary" title={order.id}>
                Order {order.id}
              </p>
            </div>

            {/* M5 access telemetry — worded as an observation, not a verdict */}
            <div className="p-5 bg-white border border-border-subtle rounded-xl shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <ShieldAlert className="w-4 h-4 text-text-secondary" />
                <h3 className="text-sm font-bold text-text-primary">Link access</h3>
              </div>
              <p className="text-xs text-text-secondary">
                {order.accessDeviceCount ?? 0} distinct device{(order.accessDeviceCount ?? 0) === 1 ? " has" : "s have"} opened a ticket
                link on this order.
              </p>
              {order.accessOutlier && (
                <div className="mt-3 flex gap-2 p-3 bg-warning/10 border border-warning/25 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed text-text-primary">
                    More distinct devices than tickets have opened this order&apos;s links. <strong>This is an observation,
                    not proof of anything</strong> — a single buyer switching from phone to laptop, or whose mobile
                    connection rotated IPs, produces the same signal. Worth a look before assuming resale; not a
                    reason on its own to revoke anyone&apos;s ticket.
                  </p>
                </div>
              )}
            </div>

            {/* Event-started notice — discourages, does not block */}
            {eventHasStarted && (
              <div className="flex gap-2 p-4 bg-amber-500/10 border border-amber-500/25 rounded-xl">
                <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed text-amber-900">
                  This event has already started (or finished). Issuing a new key for a ticket right now immediately
                  breaks that attendee&apos;s own saved QR on their own phone — they will need to reopen their ticket
                  link while online before they can be scanned in. Only do this mid-event if you&apos;re confident
                  they can get back online right away.
                </p>
              </div>
            )}

            {/* Per-ticket breakdown + revoke */}
            <div className="bg-white border border-border-subtle rounded-xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-border-subtle">
                <h3 className="text-sm font-bold text-text-primary">Tickets on this order</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container-low border-b border-border-subtle">
                      <th className="p-3 font-mono text-[9px] text-text-secondary uppercase font-bold">Attendee</th>
                      <th className="p-3 font-mono text-[9px] text-text-secondary uppercase font-bold">Tier</th>
                      <th className="p-3 font-mono text-[9px] text-text-secondary uppercase font-bold">Seat</th>
                      <th className="p-3 font-mono text-[9px] text-text-secondary uppercase font-bold">Status</th>
                      <th className="p-3 font-mono text-[9px] text-text-secondary uppercase font-bold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="font-sans text-xs text-text-primary">
                    {(order.tickets ?? []).map((t) => (
                      <tr key={t.ticketId} className="border-b border-border-subtle last:border-0 align-top">
                        <td className="p-3 font-medium">{t.attendeeFullName}</td>
                        <td className="p-3 text-text-secondary">{t.tierName}</td>
                        <td className="p-3 text-text-secondary">{t.seatLabel}</td>
                        <td className="p-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded font-mono text-[8px] font-bold border ${ticketStatusStyle(
                              t.ticketStatus
                            )}`}
                          >
                            {t.ticketStatus}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          {confirmingTicketId === t.ticketId ? (
                            <div className="text-left ml-auto max-w-xs bg-surface-container-low border border-border-subtle rounded-lg p-3 space-y-2">
                              <p className="text-[10px] leading-relaxed text-text-primary">
                                This immediately breaks <strong>{t.attendeeFullName || "this attendee"}&apos;s</strong> saved
                                ticket on their own phone. They will not show a working QR at the gate until they
                                reopen their ticket link while connected to the internet. Make sure they can do that
                                before continuing.
                              </p>
                              {eventHasStarted && (
                                <label className="flex items-start gap-1.5 text-[10px] text-amber-900">
                                  <input
                                    type="checkbox"
                                    checked={ackRisk}
                                    onChange={(e) => setAckRisk(e.target.checked)}
                                    className="mt-0.5"
                                  />
                                  I understand this may strand this attendee at the gate right now.
                                </label>
                              )}
                              <div className="flex gap-2 justify-end">
                                <button
                                  onClick={cancelConfirm}
                                  className="px-2 py-1 text-[10px] font-bold text-text-secondary hover:text-text-primary"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleConfirmRevoke(t)}
                                  disabled={rotatingTicketId === t.ticketId || (eventHasStarted && !ackRisk)}
                                  className="flex items-center gap-1 px-2.5 py-1 bg-danger text-white text-[10px] font-bold rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <KeyRound className="w-3 h-3" />
                                  {rotatingTicketId === t.ticketId ? "Issuing…" : "Yes, issue new key"}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => openConfirm(t.ticketId)}
                              className="text-[10px] font-bold text-danger hover:underline"
                            >
                              Revoke ticket
                            </button>
                          )}
                          {rotateMessages[t.ticketId] && (
                            <p className="mt-1 text-[10px] text-text-secondary max-w-xs ml-auto text-left">
                              {rotateMessages[t.ticketId]}
                            </p>
                          )}
                        </td>
                      </tr>
                    ))}
                    {(order.tickets ?? []).length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-xs text-on-surface-variant font-mono">
                          No tickets on this order.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </EventWorkspaceShell>
  );
}
