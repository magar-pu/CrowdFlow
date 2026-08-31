"use client";

/**
 * The QR this card renders is the whole point of the dynamic-ticket
 * project: CF1:<ticket_uuid>:<totp>:<unix_ts>, recomputed every second from
 * a step = floor(now/20), HMAC-SHA1, 6-digit HOTP over the ticket's own
 * secret_key — the FROZEN CONTRACT (see plan_2026-08-30_dynamic_qr_ticketman
 * and CONTRACT.md). Previously `setQrToken` had zero call sites: the QR
 * always encoded either a hardcoded mock payload or the bare ticket UUID,
 * and the "DYNAMIC PASS ... rotates in 4m 12s" text was computed but never
 * actually put in the QR. There is no fallback secret and no test code —
 * deriveDefaultSecret and the OTP "123456" backdoor that used it are gone.
 */

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { RefreshCw, AlertTriangle } from "lucide-react";
import { getTicketAccess, rotateTicketAccess } from "@/lib/api/orderAccess";
import {
  importSecretKey,
  generateSubtleTOTP,
  saveVaultTicket,
  getVaultTicket,
  deleteVaultTicket,
  checkAndRunSelfDestruct,
} from "@/lib/ticketVault";
import type { PurchasedTicket } from "@/types/ticket";

// The frozen contract's rotation step, in seconds. Matches the server's
// `step = floor(claimed_ts / 20)` exactly — see CONTRACT.md section 1.
const TOTP_STEP_SECONDS = 20;

interface DigitalTicketCardProps {
  ticket: PurchasedTicket;
}

function formatTicketDateTime(iso_datetime: string): string {
  if (!iso_datetime) return "Upcoming Event";
  const date = new Date(iso_datetime);
  if (isNaN(date.getTime())) return iso_datetime;
  return date.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function DigitalTicketCard({ ticket }: DigitalTicketCardProps) {
  const ticketId = ticket.ticket_id;

  // The live QR payload, recomputed every second. Empty until the first
  // secret is available (from IndexedDB or the network) — the card shows a
  // loading state rather than ever falling back to a static or default
  // payload.
  const [qrToken, setQrToken] = useState<string>("");
  const [totpCode, setTotpCode] = useState<string>("");
  const [secondsRemaining, setSecondsRemaining] = useState<number>(TOTP_STEP_SECONDS);
  const [cryptoKey, setCryptoKey] = useState<CryptoKey | null>(null);
  const [isExpired, setIsExpired] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string>("");

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isCached, setIsCached] = useState<boolean>(false);

  // M3/M4 panic-revoke: bumped after a successful rotation to force the load
  // effect below to re-run and fetch the freshly rotated secret, since
  // ticketId/order_id themselves don't change.
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isRotating, setIsRotating] = useState(false);
  const [rotateMessage, setRotateMessage] = useState<string>("");

  // Register SW & Listen for PWA Install Prompt
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.warn("SW Registration failed:", err);
      });
    }

    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e);
    }
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  async function handleSaveOfflineCache() {
    if ("caches" in window) {
      try {
        const cache = await caches.open("crowdflow-ticket-v1");
        await cache.add(window.location.href);
        setIsCached(true);
        alert("⚡ Tiket berhasil disimpan ke Cache Offline HP! Anda kini dapat membukanya kapan saja tanpa koneksi internet.");
      } catch (err) {
        setIsCached(true);
        alert("⚡ Tiket tersimpan aman di Brankas HP.");
      }
    } else {
      setIsCached(true);
    }
  }

  async function handleAddShortcut() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        alert("📲 Shortcut tiket berhasil ditambahkan ke Home Screen HP!");
      }
    } else {
      alert("📱 Cara menambah Shortcut Ke Home Screen HP:\n\n1. Tekan tombol titik 3 (atau ikon Share di Safari/Chrome).\n2. Pilih 'Tambahkan ke Layar Utama' / 'Add to Home Screen'.\n3. Tiket CrowdFlow Anda siap dibuka 1-klik dari Home Screen!");
    }
  }

  // Load the ticket's secret_key — from the IndexedDB vault first (so the
  // card works immediately offline), then always refreshed from the network
  // when reachable so a rotated secret (M3/M4 panic-revoke) is picked up.
  // No login-gate beyond this page's own auth, no OTP, no fallback secret:
  // if neither source has a key, the card shows a loading/error state
  // instead of ever encoding a payload that isn't backed by a real secret.
  useEffect(() => {
    if (!ticketId || !ticket.order_id) return;
    let isMounted = true;

    async function loadFromVault() {
      try {
        const vaulted = await getVaultTicket(ticketId);
        if (!vaulted) return false;

        const expired = await checkAndRunSelfDestruct(ticketId, vaulted.eventEndTime);
        if (expired) {
          if (isMounted) setIsExpired(true);
          return true;
        }

        const key = await importSecretKey(vaulted.rawSecretKey);
        if (isMounted) setCryptoKey(key);
        return true;
      } catch (err) {
        console.warn("IndexedDB vault read failed:", err);
        return false;
      }
    }

    async function loadFromNetwork() {
      try {
        const res = await getTicketAccess(ticket.order_id, ticketId);
        if (!res.success || !res.data?.secretKey) return false;

        const data = res.data;
        const key = await importSecretKey(data.secretKey);
        if (isMounted) setCryptoKey(key);

        await saveVaultTicket({
          ticketId: data.ticketId,
          cryptoKey: key,
          rawSecretKey: data.secretKey,
          eventEndTime: data.eventEndTime,
          eventName: data.eventName,
          attendeeName: data.attendeeFullName,
          tierName: data.tierName,
          seatLabel: data.seatLabel,
          ticketStatus: data.ticketStatus,
        });
        return true;
      } catch (err) {
        console.warn("Ticket secret fetch failed:", err);
        return false;
      }
    }

    async function init() {
      const hadVault = await loadFromVault();
      const hadNetwork = await loadFromNetwork();
      if (isMounted && !hadVault && !hadNetwork) {
        setLoadError("Couldn't load this ticket's secure key. Check your connection and try again.");
      }
    }

    init();

    return () => {
      isMounted = false;
    };
  }, [ticketId, ticket.order_id, refreshTrigger]);

  // The rotation loop: recomputes CF1:<ticket_uuid>:<totp>:<unix_ts> every
  // second from the current 20-second step. Zero API calls — this is what
  // lets the QR keep rotating with the backend unreachable.
  useEffect(() => {
    if (!ticketId || !cryptoKey) return;
    const key = cryptoKey;
    let interval: ReturnType<typeof setInterval>;

    async function updatePayload() {
      const now = Math.floor(Date.now() / 1000);
      setSecondsRemaining(TOTP_STEP_SECONDS - (now % TOTP_STEP_SECONDS));

      try {
        const totp = await generateSubtleTOTP(key, TOTP_STEP_SECONDS);
        setTotpCode(totp);
        setQrToken(`CF1:${ticketId}:${totp}:${now}`);
      } catch (e) {
        console.warn("TOTP calc error:", e);
      }
    }

    updatePayload();
    interval = setInterval(updatePayload, 1000);

    return () => clearInterval(interval);
  }, [ticketId, cryptoKey]);

  async function handleClearOfflineCache() {
    await deleteVaultTicket(ticketId);
    setCryptoKey(null);
    setQrToken("");
    setTotpCode("");
  }

  // M3/M4: purchaser panic-revoke. Rotates this ticket's secret_key
  // server-side (killing every previously cached/screenshotted QR and any
  // copy of this per-ticket link that's been forwarded), then drops this
  // device's own now-stale cached secret and re-fetches the new one so this
  // device keeps working — only OTHER devices/screenshots are broken.
  async function handlePanicRevoke() {
    if (!ticket.order_id || !ticketId || isRotating) return;
    const confirmed = window.confirm(
      "This issues a new secure key for this ticket. Any other copy of this ticket's QR or link — including ones you may have forwarded — will stop working immediately. Continue?"
    );
    if (!confirmed) return;

    setIsRotating(true);
    setRotateMessage("");
    try {
      const res = await rotateTicketAccess(ticket.order_id, ticketId);
      if (res.success) {
        await deleteVaultTicket(ticketId);
        setCryptoKey(null);
        setQrToken("");
        setTotpCode("");
        setRefreshTrigger((n) => n + 1);
        setRotateMessage("Done — this ticket has a new secure key. Old copies of its QR or link no longer work.");
      } else {
        setRotateMessage(res.error?.message || "Couldn't issue a new key. Check your connection and try again.");
      }
    } catch {
      setRotateMessage("Couldn't issue a new key. Check your connection and try again.");
    } finally {
      setIsRotating(false);
    }
  }

  if (isExpired) {
    return (
      <div className="relative flex w-full max-w-[420px] flex-col rounded-xl border border-red-200 bg-red-50/50 p-6 text-center select-none shadow-lg">
        <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-3" />
        <h3 className="text-lg font-bold text-red-700 mb-1">Ticket Expired</h3>
        <p className="text-xs text-red-600">
          This event has concluded. Ticket data has been automatically removed from local device vault (*self-destruct routine*).
        </p>
      </div>
    );
  }

  // Not yet vaulted and not yet loaded — a brief loading state while the
  // secret comes from IndexedDB or the network, no gate the buyer has to
  // clear. An error only shows if BOTH sources failed. Also covers the one
  // frame between the key arriving and the first async TOTP computation
  // resolving, so the QR never briefly renders an empty payload.
  if (!cryptoKey || !qrToken) {
    return (
      <div className="relative flex w-full max-w-[420px] flex-col rounded-2xl border border-border-subtle bg-white p-6 shadow-xl text-center select-none">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100 border border-neutral-200 text-neutral-900">
          {loadError ? <AlertTriangle className="h-7 w-7 text-red-500" /> : <RefreshCw className="h-7 w-7 animate-spin" />}
        </div>
        <h2 className="text-xl font-bold text-text-primary mb-1">
          {loadError ? "Couldn't load ticket" : "Loading your ticket…"}
        </h2>
        <p className="text-xs text-text-secondary leading-relaxed">
          {loadError || "Fetching your secure ticket key."}
        </p>
      </div>
    );
  }

  return (
    <div className="relative flex w-full max-w-[420px] flex-col rounded-xl border border-border-subtle bg-surface-white shadow-[0_12px_40px_rgba(15,23,42,0.08)] select-none">
      {/* Cover image with title overlay */}
      <div className="relative h-48 w-full overflow-hidden rounded-t-xl bg-surface-container-high">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ticket.cover_image_url || "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?q=80&w=800&auto=format&fit=crop"}
          alt={ticket.event_title}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-4 left-6 right-6">
          <span className="mb-2 inline-block rounded bg-surface-white/20 px-2 py-1 font-label-sm text-label-sm uppercase tracking-widest text-surface-white backdrop-blur-md">
            {ticket.event_category_label || "Event Ticket"}
          </span>
          <h2 className="font-headline-sm text-headline-sm text-surface-white font-bold">
            {ticket.event_title}
          </h2>
        </div>
      </div>

      {/* Date / Venue */}
      <div className="p-6 pb-2">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="mb-1 font-body-sm text-body-sm text-text-secondary">
              Date &amp; Time
            </p>
            <p className="font-label-md text-label-md text-text-primary font-semibold">
              {formatTicketDateTime(ticket.starts_at)}
            </p>
          </div>
        </div>
        <div className="mb-2 flex items-start justify-between">
          <div>
            <p className="mb-1 font-body-sm text-body-sm text-text-secondary">
              Venue
            </p>
            <p className="font-label-md text-label-md text-text-primary font-semibold">
              {ticket.venue_name || "Main Venue"}
            </p>
            {ticket.venue_city && (
              <p className="font-body-sm text-body-sm text-text-secondary">
                {ticket.venue_city}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Perforated tear line */}
      <div className="relative my-2 flex h-8 w-full items-center justify-between">
        <div className="absolute left-[-16px] z-10 h-8 w-8 rounded-full border-r border-border-subtle bg-background shadow-[inset_-4px_0_6px_rgba(0,0,0,0.02)]" />
        <div className="mx-4 w-full border-t-2 border-dashed border-border-subtle" />
        <div className="absolute right-[-16px] z-10 h-8 w-8 rounded-full border-l border-border-subtle bg-background shadow-[inset_4px_0_6px_rgba(0,0,0,0.02)]" />
      </div>

      {/* Sec / Row / Seat + Dynamic QR */}
      <div className="flex flex-col items-center p-6 pt-2">
        <div className="mb-5 grid w-full grid-cols-3 gap-4 rounded-lg bg-surface-container-low py-3 text-center">
          <div>
            <p className="mb-1 font-label-sm text-label-sm uppercase tracking-wider text-text-secondary">
              Sec
            </p>
            <p className="font-headline-sm text-headline-sm text-text-primary font-bold">
              {ticket.section || "GA"}
            </p>
          </div>
          <div className="border-x border-border-subtle">
            <p className="mb-1 font-label-sm text-label-sm uppercase tracking-wider text-text-secondary">
              Row
            </p>
            <p className="font-headline-sm text-headline-sm text-text-primary font-bold">
              {ticket.row || "-"}
            </p>
          </div>
          <div>
            <p className="mb-1 font-label-sm text-label-sm uppercase tracking-wider text-text-secondary">
              Seat
            </p>
            <p className="font-headline-sm text-headline-sm text-text-primary font-bold">
              {ticket.seat_number || "-"}
            </p>
          </div>
        </div>

        {/* Dynamic QR Code Canvas */}
        <div className="relative mb-4 flex h-48 w-48 items-center justify-center rounded-xl border-2 border-emerald-500/20 bg-surface-white p-2 shadow-inner">
          <QRCodeSVG
            value={qrToken}
            size={176}
            level="M"
            className="h-full w-full"
          />
        </div>

        <div className="flex flex-col items-center gap-1.5 w-full">
          <p className="font-label-sm text-[10px] font-mono tracking-widest text-text-secondary uppercase truncate max-w-[320px]">
            {ticketId}
          </p>
          {totpCode && (
            <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 rounded-full text-emerald-700 font-mono text-xs font-bold shadow-xs">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-500" />
              <span>
                DYNAMIC PASS: <strong>{totpCode}</strong> (Rotates in {secondsRemaining}s)
              </span>
            </div>
          )}
        </div>

        <div className="mt-4 w-full flex flex-col gap-2 pt-3 border-t border-border-subtle">
          <p className="text-[10px] text-emerald-600 font-medium text-center">
            🔒 Ticket key saved on your device — works offline at the gate
          </p>
          <button
            onClick={handleClearOfflineCache}
            className="w-full mt-1 text-[10px] text-gray-400 hover:text-red-600 font-medium text-center py-1 hover:underline cursor-pointer"
          >
            Clear offline cache on this device
          </button>
          <button
            onClick={handlePanicRevoke}
            disabled={isRotating}
            className="w-full text-[10px] text-gray-400 hover:text-red-600 font-medium text-center py-1 hover:underline cursor-pointer disabled:opacity-50 disabled:cursor-wait"
          >
            {isRotating ? "Issuing new key…" : "This ticket's link leaked — issue a new key"}
          </button>
          {rotateMessage && (
            <p className="text-[10px] text-center text-text-secondary">{rotateMessage}</p>
          )}
        </div>
      </div>

      {/* Inset border highlight */}
      <div className="pointer-events-none absolute left-0 top-0 h-full w-full rounded-xl border border-border-subtle shadow-[inset_0_0_0_1px_rgba(255,255,255,0.5)]" />
    </div>
  );
}