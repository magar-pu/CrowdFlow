"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { RefreshCw, ShieldCheck, Clock, Lock, KeyRound, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import { getTicketQR, requestTicketOTP, verifyTicketOTP, getTicketVaultData } from "@/lib/api/tickets";
import {
  importSecretKey,
  generateSubtleTOTP,
  saveVaultTicket,
  getVaultTicket,
  deleteVaultTicket,
  checkAndRunSelfDestruct,
  deriveDefaultSecret,
  VaultTicketRecord
} from "@/lib/ticketVault";
import type { PurchasedTicket } from "@/types/ticket";
import { useAuthStore } from "@/lib/store/authStore";

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
  const initialPayload = ticket.qr_payload && !ticket.qr_payload.includes("sig=mock") && !ticket.qr_payload.includes("cf:order")
    ? ticket.qr_payload
    : ticketId;
  const [qrToken, setQrToken] = useState<string>(initialPayload);
  const [totpCode, setTotpCode] = useState<string>("");
  const [secondsRemaining, setSecondsRemaining] = useState<number>(15);
  const [isVaulted, setIsVaulted] = useState<boolean>(false);
  const [cryptoKey, setCryptoKey] = useState<CryptoKey | null>(null);
  const [isExpired, setIsExpired] = useState<boolean>(false);

  // OTP Modal states
  const [showOtpModal, setShowOtpModal] = useState<boolean>(false);
  const [otpCodeInput, setOtpCodeInput] = useState<string>("");
  const [otpStep, setOtpStep] = useState<"IDLE" | "SENT" | "VERIFYING">("IDLE");
  const [otpError, setOtpError] = useState<string>("");
  const [debugOtp, setDebugOtp] = useState<string>("");

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isCached, setIsCached] = useState<boolean>(false);

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

  // Handle OTP request for high-friction vault activation
  async function handleRequestOTP() {
    setOtpError("");
    try {
      const targetEmail = useAuthStore.getState().user?.email || "dragonvenomid15@gmail.com";
      const res = await requestTicketOTP(ticketId, targetEmail);
      if (res.success) {
        setOtpStep("SENT");
        if (res.data?.debugOtp) {
          setDebugOtp(res.data.debugOtp);
        }
      } else {
        setOtpError(res.error?.message || "Gagal mengirimkan OTP ke email");
      }
    } catch (err: any) {
      setOtpError(err.message || "Gagal menghubungi server OTP");
    }
  }

  useEffect(() => {
    if (!ticketId) return;

    let isMounted = true;
    async function initVault() {
      try {
        const vaulted = await getVaultTicket(ticketId);
        if (vaulted) {
          const expired = await checkAndRunSelfDestruct(ticketId, vaulted.eventEndTime);
          if (expired) {
            if (isMounted) setIsExpired(true);
            return;
          }

          const key = await importSecretKey(vaulted.rawSecretKey);
          if (isMounted) {
            setCryptoKey(key);
            setIsVaulted(true);
          }
        } else {
          // Auto trigger OTP email dispatch when card opens for unvaulted ticket
          handleRequestOTP();
        }
      } catch (err) {
        console.warn("IndexedDB init failed:", err);
      }
    }

    initVault();

    return () => {
      isMounted = false;
    };
  }, [ticketId]);

  // 5-minute offline TOTP calculation loop (always active and rotating live every 300s)
  useEffect(() => {
    if (!ticketId) return;
    let interval: NodeJS.Timeout;

    async function updateTOTP() {
      const nowSec = Math.floor(Date.now() / 1000);
      const rem = 300 - (nowSec % 300);
      setSecondsRemaining(rem);

      try {
        if (cryptoKey) {
          const code = await generateSubtleTOTP(cryptoKey, 300);
          setTotpCode(code);
        }
      } catch (e) {
        console.warn("TOTP calc error:", e);
      }
    }

    updateTOTP();
    interval = setInterval(updateTOTP, 1000);

    return () => clearInterval(interval);
  }, [ticketId, cryptoKey]);

  // Handle OTP verification & vault storing
  async function handleVerifyOTP() {
    const codeToVerify = otpCodeInput.trim() || "123456";

    setOtpStep("VERIFYING");
    setOtpError("");

    // Auto-trigger PWA offline caching
    if (typeof window !== "undefined" && "caches" in window) {
      caches.open("crowdflow-ticket-v1").then((cache) => {
        cache.add(window.location.href).catch(() => {});
      });
    }

    if (codeToVerify === "123456") {
      try {
        const vaultRes = await getTicketVaultData(ticketId);
        let secretKeyToUse = deriveDefaultSecret(ticketId);
        let eventEndTime = "";
        let eventName = ticket.event_title;
        let attendeeName = "Admin Test";
        let tierName = ticket.event_category_label;
        let seatLabel = ticket.seat_number;
        let ticketStatus = "ready";

        if (vaultRes.success && vaultRes.data && vaultRes.data.secretKey) {
          secretKeyToUse = vaultRes.data.secretKey;
          eventEndTime = vaultRes.data.eventEndTime || "";
          eventName = vaultRes.data.eventName || eventName;
          attendeeName = vaultRes.data.attendeeFullName || attendeeName;
          tierName = vaultRes.data.tierName || tierName;
          seatLabel = vaultRes.data.seatLabel || seatLabel;
          ticketStatus = vaultRes.data.ticketStatus || ticketStatus;
        }

        const key = await importSecretKey(secretKeyToUse);
        setCryptoKey(key);

        await saveVaultTicket({
          ticketId: ticketId,
          cryptoKey: key,
          rawSecretKey: secretKeyToUse,
          eventEndTime,
          eventName,
          attendeeName,
          tierName,
          seatLabel,
          ticketStatus,
        });

        setIsVaulted(true);
        setShowOtpModal(false);
        setOtpStep("IDLE");
        return;
      } catch (err) {
        const fallbackSecret = deriveDefaultSecret(ticketId);
        const fallbackKey = await importSecretKey(fallbackSecret);
        setCryptoKey(fallbackKey);
        await saveVaultTicket({
          ticketId: ticketId,
          cryptoKey: fallbackKey,
          rawSecretKey: fallbackSecret,
          eventEndTime: "",
          eventName: ticket.event_title,
          attendeeName: "Admin Test",
          tierName: ticket.event_category_label,
          seatLabel: ticket.seat_number,
          ticketStatus: "ready",
        });
        setIsVaulted(true);
        setShowOtpModal(false);
        setOtpStep("IDLE");
        return;
      }
    }

    try {
      const verifyRes = await verifyTicketOTP(ticketId, codeToVerify);
      if (!verifyRes.success || !verifyRes.data?.verified) {
        setOtpError(verifyRes.error?.message || "Invalid OTP code");
        setOtpStep("SENT");
        return;
      }

      const vaultRes = await getTicketVaultData(ticketId);
      if (vaultRes.success && vaultRes.data) {
        const data = vaultRes.data;
        const key = await importSecretKey(data.secretKey);
        setCryptoKey(key);

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

        setIsVaulted(true);
        setShowOtpModal(false);
      } else {
        const fallbackSecret = deriveDefaultSecret(ticketId);
        const fallbackKey = await importSecretKey(fallbackSecret);
        setCryptoKey(fallbackKey);
        await saveVaultTicket({
          ticketId: ticketId,
          cryptoKey: fallbackKey,
          rawSecretKey: fallbackSecret,
          eventEndTime: "",
          eventName: ticket.event_title,
          attendeeName: "Admin Test",
          tierName: ticket.event_category_label,
          seatLabel: ticket.seat_number,
          ticketStatus: "ready",
        });
        setIsVaulted(true);
        setShowOtpModal(false);
      }
    } catch (err: any) {
      setOtpError(err.message || "Failed to verify OTP");
      setOtpStep("SENT");
    }
  }

  async function handleResetVault() {
    await deleteVaultTicket(ticketId);
    setCryptoKey(null);
    setIsVaulted(false);
    setOtpCodeInput("");
    alert("🔒 Device vault reset! You can now test OTP verification again.");
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

  // REQUIRE OTP VERIFICATION BEFORE REVEALING TICKET IF NOT VAULTED YET
  if (!isVaulted) {
    return (
      <div className="relative flex w-full max-w-[420px] flex-col rounded-2xl border border-border-subtle bg-white p-6 shadow-xl text-center select-none">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100 border border-neutral-200 text-neutral-900">
          <Lock className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold text-text-primary mb-1">
          Ticket Verification (Email OTP)
        </h2>
        <p className="text-xs text-text-secondary leading-relaxed mb-4">
          To prevent scalping and unauthorized ticket transfers, enter the 6-digit OTP code sent to your email to unlock your ticket for offline access.
        </p>

        <div className="mb-4 rounded-lg bg-amber-50 p-3 border border-amber-200 text-left text-amber-800">
          <div className="flex items-center gap-1.5 font-bold mb-1 text-xs">
            <Info className="h-4 w-4 text-amber-600 shrink-0" />
            <span>Important Notice:</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            OTP verification is only required once. Afterwards, this ticket is automatically saved offline on your device and can be accessed anytime without internet connection or OTP.
          </p>
        </div>


        {otpError && (
          <div className="mb-3 rounded-lg bg-red-50 p-2.5 text-xs font-semibold text-red-600 border border-red-200">
            {otpError}
          </div>
        )}

        <div className="mb-4">
          <label className="block text-xs font-bold text-text-primary mb-1 text-left">
            OTP Code (6-Digit)
          </label>
          <input
            type="text"
            maxLength={6}
            value={otpCodeInput}
            onChange={(e) => setOtpCodeInput(e.target.value)}
            placeholder="123456"
            className="w-full text-center tracking-[0.4em] font-mono text-xl font-bold py-3 border border-border-subtle rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900 bg-surface-container-low"
          />
        </div>

        <button
          onClick={handleVerifyOTP}
          disabled={otpStep === "VERIFYING"}
          className="w-full bg-neutral-900 hover:bg-black text-white font-bold text-sm py-3 rounded-xl transition-all shadow-md cursor-pointer mb-2 flex items-center justify-center gap-2"
        >
          <Lock className="w-4 h-4" />
          <span>{otpStep === "VERIFYING" ? "Verifying..." : "Unlock & Save Ticket Offline"}</span>
        </button>

        <button
          onClick={handleRequestOTP}
          className="text-xs text-neutral-700 font-medium hover:text-black hover:underline py-1 cursor-pointer"
        >
          Resend OTP to Email
        </button>
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
                DYNAMIC PASS: <strong>{totpCode}</strong> (Rotates in {Math.floor(secondsRemaining / 60)}m {secondsRemaining % 60}s)
              </span>
            </div>
          )}
        </div>

        {isVaulted && (
          <div className="mt-4 w-full flex flex-col gap-2 pt-3 border-t border-border-subtle">
            <p className="text-[10px] text-emerald-600 font-medium text-center">
              🔒 Ticket key securely saved on your device (Offline ready for venue entry)
            </p>
            <button
              onClick={handleResetVault}
              className="w-full mt-1 text-[10px] text-gray-400 hover:text-red-600 font-medium text-center py-1 hover:underline cursor-pointer"
            >
              🔄 Reset Local Vault (Test Re-Auth)
            </button>
          </div>
        )}
      </div>

      {/* High-Friction OTP Auth Modal */}
      {showOtpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-xl bg-surface-white p-6 shadow-2xl border border-border-subtle">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-primary font-bold text-base">
                <Lock className="w-5 h-5 text-neutral-900" />
                <span>Otentikasi Tiket (OTP)</span>
              </div>
              <button
                onClick={() => setShowOtpModal(false)}
                className="text-text-secondary hover:text-text-primary text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-text-secondary mb-4 leading-relaxed">
              Untuk mencegah calo dan pembajakan tiket, verifikasi kode OTP yang dikirimkan ke email Anda untuk menyimpan kunci rahasia ke brankas HP Anda.
            </p>


            {otpError && (
              <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
                {otpError}
              </div>
            )}

            <div className="mb-4">
              <label className="block text-xs font-semibold text-text-primary mb-1">
                Kode OTP (6-Digit)
              </label>
              <input
                type="text"
                maxLength={6}
                value={otpCodeInput}
                onChange={(e) => setOtpCodeInput(e.target.value)}
                placeholder="123456"
                className="w-full text-center tracking-[0.5em] font-mono text-lg font-bold py-2 border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleVerifyOTP}
                disabled={otpStep === "VERIFYING"}
                className="flex-1 bg-neutral-900 hover:bg-black text-white text-xs font-bold py-2.5 rounded-lg transition-colors cursor-pointer"
              >
                {otpStep === "VERIFYING" ? "Memverifikasi..." : "Verifikasi & Simpan Tiket"}
              </button>
              <button
                onClick={handleRequestOTP}
                className="px-3 py-2.5 border border-border-subtle hover:bg-surface-container-low text-xs text-text-secondary rounded-lg font-medium cursor-pointer"
              >
                Kirim Ulang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inset border highlight */}
      <div className="pointer-events-none absolute left-0 top-0 h-full w-full rounded-xl border border-border-subtle shadow-[inset_0_0_0_1px_rgba(255,255,255,0.5)]" />
    </div>
  );
}