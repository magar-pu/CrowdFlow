"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
// @ts-ignore
import { Html5Qrcode } from "html5-qrcode";
import {
  getTicketmanMe,
  logoutTicketman,
  ticketmanCheckIn,
  ticketmanReject,
  TicketmanCheckInResult,
  TicketmanCheckInStatus,
  TicketmanGateGrant,
} from "@/lib/api/ticketman";
import { useTicketmanStore } from "@/lib/store/ticketmanStore";
import {
  Wifi,
  WifiOff,
  RefreshCw,
  ShieldAlert,
  Award,
  CheckCircle2,
  User,
  LogOut,
  Flag,
} from "lucide-react";

type OverlayTone = "success" | "warning" | "danger";

const STATUS_META: Record<TicketmanCheckInStatus, { title: string; tone: OverlayTone }> = {
  VALID: { title: "VALID TICKET", tone: "success" },
  ALREADY_USED: { title: "ALREADY USED", tone: "danger" },
  WRONG_TIER: { title: "WRONG GATE — TICKET VALID", tone: "warning" },
  WRONG_EVENT: { title: "WRONG EVENT", tone: "danger" },
  EXPIRED: { title: "QR EXPIRED", tone: "warning" },
  CANCELLED: { title: "TICKET CANCELLED", tone: "danger" },
  REFUNDED: { title: "TICKET REFUNDED", tone: "danger" },
  INVALID: { title: "INVALID QR", tone: "danger" },
};

const TONE_BG: Record<OverlayTone, string> = {
  success: "bg-success/95 backdrop-blur-md",
  warning: "bg-warning/95 backdrop-blur-md",
  danger: "bg-danger/95 backdrop-blur-md",
};

export default function TicketmanDashboardPage() {
  const router = useRouter();
  const session = useTicketmanStore((s) => s.session);
  const setSession = useTicketmanStore((s) => s.set_session);
  const clearSession = useTicketmanStore((s) => s.clear_session);

  const [isAuthChecked, setIsAuthChecked] = useState(false);

  // Gate selection (persisted per event; required only when the account is
  // granted more than one gate — see CONTRACT.md section 2 gate_id rule).
  // Sourced from the session's own grantedGates (GET /me), not the event's
  // full gate list, so staff only ever see gates they're actually granted —
  // the 403 on checkin is still the real enforcement, this is just the UX.
  const gates: TicketmanGateGrant[] = session?.grantedGates ?? [];
  const [selectedGateId, setSelectedGateId] = useState<number | null>(null);

  const [lastScanTime, setLastScanTime] = useState("-");
  const [todayScans, setTodayScans] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [scanResult, setScanResult] = useState<"idle" | TicketmanCheckInStatus>("idle");
  const [resultData, setResultData] = useState<TicketmanCheckInResult | null>(null);

  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectNote, setRejectNote] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectDone, setRejectDone] = useState(false);

  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [activeCameraId, setActiveCameraId] = useState<string>("");
  const [cameraError, setCameraError] = useState<string | null>(null);

  const qrReaderRef = useRef<Html5Qrcode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // ──────────── Session bootstrap ────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await getTicketmanMe();
      if (cancelled) return;
      if (res.success && res.data) {
        setSession(res.data);
        setIsAuthChecked(true);
      } else {
        clearSession();
        router.replace("/ticketman/login");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ──────────── Persisted gate selection ────────────
  useEffect(() => {
    if (!session) return;
    const saved = localStorage.getItem(`ticketman_gate_${session.eventId}`);
    if (saved && session.grantedGates.some((g) => String(g.id) === saved)) {
      setSelectedGateId(Number(saved));
    } else if (session.grantedGates.length === 1) {
      setSelectedGateId(session.grantedGates[0].id);
    }
  }, [session]);

  useEffect(() => {
    if (!session || selectedGateId === null) return;
    localStorage.setItem(`ticketman_gate_${session.eventId}`, String(selectedGateId));
  }, [selectedGateId, session]);

  // ──────────── Network status ────────────
  useEffect(() => {
    setIsOnline(navigator.onLine);
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  const playSound = (type: "success" | "error") => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === "success") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.15);
      } else {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.4);
      }
    } catch (err) {
      console.warn("Failed to play scan sound:", err);
    }
  };

  const triggerVibration = (type: "success" | "error") => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(type === "success" ? 150 : [100, 50, 100]);
    }
  };

  const [overlayCountdown, setOverlayCountdown] = useState<number>(60);
  const [cooldownSec, setCooldownSec] = useState<number>(0);
  const overlayTimerRef = useRef<NodeJS.Timeout | null>(null);

  const dismissOverlay = () => {
    if (overlayTimerRef.current) {
      clearInterval(overlayTimerRef.current);
      overlayTimerRef.current = null;
    }
    setScanResult("idle");
    setResultData(null);
    setOverlayCountdown(60);
    setShowRejectForm(false);
    setRejectDone(false);
    setRejectReason("");
    setRejectNote("");

    setCooldownSec(3);
    const cdTimer = setInterval(() => {
      setCooldownSec((prev) => {
        if (prev <= 1) {
          clearInterval(cdTimer);
          try {
            qrReaderRef.current?.resume();
          } catch (e) {
            console.warn("Camera resume error:", e);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleCheckInResult = async (token: string) => {
    if (!session || isSubmitting || scanResult !== "idle" || cooldownSec > 0) return;

    try {
      qrReaderRef.current?.pause(true);
    } catch (e) {
      console.warn("Camera pause error:", e);
    }

    setIsSubmitting(true);

    try {
      const res = await ticketmanCheckIn(session.eventId, token, selectedGateId);
      const now = new Date();
      setLastScanTime(now.toLocaleTimeString("id-ID"));

      if (res.success && res.data) {
        const payload = res.data;
        setResultData(payload);
        setScanResult(payload.status);
        const ok = payload.status === "VALID";
        playSound(ok ? "success" : "error");
        triggerVibration(ok ? "success" : "error");
        if (ok) setTodayScans((prev) => prev + 1);
      } else {
        setResultData({
          status: "INVALID",
          attendee: null,
          message: res.error?.message || "Check-in failed",
        });
        setScanResult("INVALID");
        playSound("error");
        triggerVibration("error");
      }
    } catch (err) {
      setResultData({ status: "INVALID", attendee: null, message: "Server connection error" });
      setScanResult("INVALID");
      playSound("error");
      triggerVibration("error");
    } finally {
      setIsSubmitting(false);
      setOverlayCountdown(60);
      if (overlayTimerRef.current) clearInterval(overlayTimerRef.current);
      overlayTimerRef.current = setInterval(() => {
        setOverlayCountdown((prev) => {
          if (prev <= 1) {
            dismissOverlay();
            return 60;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  const handleReject = async () => {
    if (!session || !resultData?.ticketId || !rejectReason.trim()) return;
    setIsRejecting(true);
    try {
      const res = await ticketmanReject(session.eventId, resultData.ticketId, rejectReason.trim(), rejectNote.trim());
      if (res.success) {
        setRejectDone(true);
        setShowRejectForm(false);
      }
    } finally {
      setIsRejecting(false);
    }
  };

  const startCamera = async (cameraId?: string) => {
    if (!isAuthChecked) return;
    setCameraError(null);
    try {
      if (!qrReaderRef.current) {
        qrReaderRef.current = new Html5Qrcode("reader");
      }
      const reader = qrReaderRef.current;

      try {
        if (reader.isScanning) await reader.stop();
      } catch (e) {
        // ignore stop errors
      }

      setIsScanning(true);
      const targetCamera = cameraId || activeCameraId || { facingMode: "environment" };

      await reader.start(
        targetCamera,
        {
          fps: 15,
          qrbox: (width: number, height: number) => {
            const size = Math.min(width, height) * 0.75;
            return { width: size, height: size };
          },
          aspectRatio: 1.0,
        },
        (decodedText: string) => handleCheckInResult(decodedText),
        () => {}
      );
    } catch (err: any) {
      console.error("Camera startup error:", err);
      if (cameraId) {
        try {
          await qrReaderRef.current?.start(
            { facingMode: "environment" },
            { fps: 15, qrbox: { width: 250, height: 250 } },
            (decodedText: string) => handleCheckInResult(decodedText),
            () => {}
          );
          return;
        } catch (e) {}
      }
      setCameraError(err.message || "Failed to start camera feed. Please check browser permissions.");
      setIsScanning(false);
    }
  };

  useEffect(() => {
    if (!isAuthChecked) return;

    let isMounted = true;
    const initCameras = async () => {
      try {
        const devices = await Html5Qrcode.getCameras();
        if (!isMounted) return;
        setCameras(devices || []);
        if (devices && devices.length > 0) {
          const backCam = devices.find((device: any) =>
            device.label.toLowerCase().includes("back") ||
            device.label.toLowerCase().includes("rear") ||
            device.label.toLowerCase().includes("environment") ||
            device.label.toLowerCase().includes("camera 2")
          );
          const defaultCamId = backCam ? backCam.id : devices[0].id;
          setActiveCameraId(defaultCamId);
          await startCamera(defaultCamId);
        } else {
          await startCamera();
        }
      } catch (err: any) {
        console.warn("Failed to get camera list, attempting default facing mode:", err);
        await startCamera();
      }
    };

    const timeout = setTimeout(initCameras, 300);
    return () => {
      isMounted = false;
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthChecked]);

  const switchCamera = async (cameraId: string) => {
    setActiveCameraId(cameraId);
    await startCamera(cameraId);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    handleCheckInResult(manualInput.trim());
    setManualInput("");
  };

  const handleLogout = async () => {
    await logoutTicketman();
    clearSession();
    router.replace("/ticketman/login");
  };

  if (!isAuthChecked || !session) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <RefreshCw className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const meta = scanResult !== "idle" ? STATUS_META[scanResult] : null;
  const canReject = !!resultData?.ticketId && !rejectDone;

  return (
    <div className="flex-1 flex flex-col h-full bg-surface-container-low font-sans text-text-primary select-none relative overflow-hidden">
      <header className="px-4 py-3 bg-white border-b border-border-subtle flex justify-between items-center shrink-0 shadow-xs">
        <div className="flex flex-col text-left">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse"></span>
            <span className="text-[9px] font-mono text-text-secondary uppercase font-bold tracking-wider">
              {gates.find((g) => g.id === selectedGateId)?.name || "Gate Authorized"}
            </span>
          </div>
          <h1 className="text-sm font-bold text-text-primary max-w-[190px] truncate leading-tight mt-0.5">{session.eventName}</h1>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container border border-border-subtle">
            {isOnline ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-success" />
                <span className="text-[10px] font-mono text-success font-bold">ONLINE</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-danger" />
                <span className="text-[10px] font-mono text-danger font-bold">OFFLINE</span>
              </>
            )}
          </div>

          <button
            onClick={handleLogout}
            className="p-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-text-primary transition-colors cursor-pointer"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-between p-4 relative">
        <div className="w-full max-w-sm bg-white border border-border-subtle rounded-xl p-3 flex justify-between items-center text-left text-xs mb-3 shrink-0 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <User className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[9px] font-mono text-text-secondary block uppercase">Signed In As</span>
              <span className="font-bold text-text-primary">{session.fullName}</span>
            </div>
          </div>

          {gates.length > 1 && (
            <select
              value={selectedGateId ?? ""}
              onChange={(e) => setSelectedGateId(e.target.value ? Number(e.target.value) : null)}
              className="bg-surface-container border border-border-subtle rounded-lg px-2 py-1 text-[10px] text-text-primary font-mono outline-none cursor-pointer max-w-[140px] truncate"
            >
              <option value="">Select gate...</option>
              {gates.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          )}

          {cameras.length > 0 && (
            <select
              value={activeCameraId}
              onChange={(e) => switchCamera(e.target.value)}
              className="bg-surface-container border border-border-subtle rounded-lg px-2 py-1 text-[10px] text-text-primary font-mono outline-none cursor-pointer max-w-[140px] truncate"
            >
              {cameras.map((cam, idx) => (
                <option key={cam.id} value={cam.id}>
                  {cam.label || `camera ${idx + 1}`}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="w-full max-w-[310px] aspect-square bg-slate-900 border-2 border-border-subtle rounded-3xl relative overflow-hidden my-auto flex items-center justify-center shadow-2xl">
          <div id="reader" className="w-full h-full object-cover"></div>

          <div className="absolute inset-8 pointer-events-none z-10 border-2 border-transparent">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-xl"></div>
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-xl"></div>
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-xl"></div>
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-xl"></div>
          </div>

          {isScanning && scanResult === "idle" && cooldownSec === 0 && (
            <div className="absolute inset-x-0 h-0.5 bg-primary shadow-md shadow-primary/50 animate-scanline z-10 pointer-events-none"></div>
          )}

          {isSubmitting && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center z-30 animate-fade-in">
              <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin mb-3 shadow-lg"></div>
              <span className="text-xs font-mono font-bold text-white uppercase tracking-wider animate-pulse">Validating Pass...</span>
            </div>
          )}

          {cooldownSec > 0 && (
            <div className="absolute inset-0 bg-black/70 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center z-20">
              <div className="w-12 h-12 rounded-full bg-white/20 border-2 border-white flex items-center justify-center text-white font-mono font-black text-xl mb-2 animate-bounce">
                {cooldownSec}s
              </div>
              <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">Scanner Cooldown</span>
            </div>
          )}

          {cameraError && (
            <div className="absolute inset-0 bg-white flex flex-col items-center justify-center p-6 text-center z-15">
              <ShieldAlert className="w-10 h-10 text-warning mb-2" />
              <h3 className="text-xs font-bold text-text-primary">Camera Offline</h3>
              <p className="text-[10px] text-text-secondary mt-1 max-w-[180px] leading-relaxed">{cameraError}</p>
              <button
                onClick={() => startCamera()}
                className="mt-3 flex items-center gap-1 bg-primary hover:bg-primary/95 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" /> Retry Feed
              </button>
            </div>
          )}
        </div>

        <div className="w-full max-w-sm bg-white border border-border-subtle rounded-xl p-3.5 mt-3 shrink-0 shadow-xs">
          <form onSubmit={handleManualSubmit} className="space-y-1.5 text-left">
            <label className="text-[8px] font-mono text-text-secondary uppercase tracking-widest block font-bold">Manual QR Payload</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="Paste QR payload"
                className="flex-1 h-8 bg-surface-container-low border border-border-subtle rounded-lg px-2.5 text-xs text-text-primary outline-none focus:border-primary transition-colors font-mono"
                disabled={isSubmitting || scanResult !== "idle"}
              />
              <button
                type="submit"
                disabled={isSubmitting || scanResult !== "idle" || !manualInput.trim()}
                className="h-8 px-4 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
              >
                Verify
              </button>
            </div>
          </form>
        </div>
      </main>

      <footer className="px-4 py-3 bg-white border-t border-border-subtle grid grid-cols-2 gap-4 shrink-0 text-left shadow-xs">
        <div className="border-r border-border-subtle pr-2">
          <span className="text-[8px] font-mono text-text-secondary block uppercase font-bold tracking-wider">Today's Scans</span>
          <span className="text-base font-black text-text-primary font-mono mt-0.5">{todayScans}</span>
        </div>
        <div className="pl-2">
          <span className="text-[8px] font-mono text-text-secondary block uppercase font-bold tracking-wider">Last Scan</span>
          <span className="text-base font-black text-primary font-mono mt-0.5">{lastScanTime}</span>
        </div>
      </footer>

      {scanResult !== "idle" && meta && (
        <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center p-6 animate-fade-in ${TONE_BG[meta.tone]}`}>
          <div className="text-center space-y-4 max-w-[320px] w-full">
            <div className="w-20 h-20 rounded-full border-4 border-white mx-auto flex items-center justify-center text-white font-black text-4xl shadow-xl bg-white/20">
              {meta.tone === "success" ? "✓" : meta.tone === "warning" ? "!" : "✕"}
            </div>

            <div>
              <h2 className="text-white text-2xl font-black tracking-tight uppercase">{meta.title}</h2>
              <p className="text-[11px] text-white/90 font-mono tracking-wider mt-1 uppercase font-bold">{resultData?.message}</p>
            </div>

            {resultData?.attendee && (
              <div className="bg-white rounded-2xl p-4 text-left space-y-2.5 mt-2 shadow-2xl border border-white/40">
                <div>
                  <span className="text-[9px] text-text-secondary font-mono block uppercase font-bold">Guest Name</span>
                  <span className="text-base font-extrabold text-text-primary">{resultData.attendee.fullName}</span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border-subtle">
                  <div>
                    <span className="text-[9px] text-text-secondary font-mono block uppercase font-bold">Tier</span>
                    <span className="text-xs font-bold text-primary flex items-center gap-1 mt-0.5">
                      <Award className="w-3.5 h-3.5" /> {resultData.tierName || "Standard"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-text-secondary font-mono block uppercase font-bold">Seat</span>
                    <span className="text-xs font-mono font-bold text-text-primary truncate block mt-0.5">
                      {resultData.seatLabel || "General"}
                    </span>
                  </div>
                </div>

                {resultData.status === "ALREADY_USED" && (
                  <div className="border-t border-border-subtle pt-2 text-[10px] text-danger font-mono font-bold">
                    First Entry: <strong>{resultData.checkInTime}</strong> at <strong>{resultData.gateName}</strong>
                  </div>
                )}
              </div>
            )}

            {!resultData?.attendee && resultData?.ticketId && (
              <div className="bg-white rounded-2xl p-3 text-left text-[10px] font-mono text-text-secondary shadow-2xl border border-white/40">
                Ticket ID: <span className="font-bold text-text-primary">{resultData.ticketId.slice(0, 8)}...</span>
              </div>
            )}

            {rejectDone ? (
              <div className="bg-white/90 rounded-xl p-2.5 text-[11px] font-bold text-text-primary flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-success" /> Rejection recorded
              </div>
            ) : showRejectForm ? (
              <div className="bg-white rounded-2xl p-4 text-left space-y-2 shadow-2xl">
                <label className="text-[9px] font-mono font-bold text-text-secondary uppercase">Rejection Reason</label>
                <input
                  type="text"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Suspicious document, ID mismatch"
                  className="w-full h-8 border border-border-subtle rounded-lg px-2 text-xs outline-none"
                />
                <textarea
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                  placeholder="Optional note"
                  className="w-full h-14 border border-border-subtle rounded-lg px-2 py-1.5 text-xs outline-none resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowRejectForm(false)}
                    className="flex-1 py-2 text-xs font-bold rounded-lg border border-border-subtle text-text-secondary cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={isRejecting || !rejectReason.trim()}
                    className="flex-1 py-2 text-xs font-bold rounded-lg bg-danger text-white disabled:opacity-50 cursor-pointer"
                  >
                    {isRejecting ? "Recording..." : "Confirm Reject"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="pt-2 flex flex-col gap-2">
                <button
                  onClick={dismissOverlay}
                  className="w-full py-3.5 bg-white text-text-primary hover:bg-surface-container font-black text-sm rounded-2xl shadow-2xl flex items-center justify-center gap-2.5 cursor-pointer transition-all active:scale-95 border-2 border-white/80 group"
                >
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:rotate-45 transition-transform">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  </div>
                  <span>Scan Next Attendee</span>
                </button>

                {canReject && (
                  <button
                    onClick={() => setShowRejectForm(true)}
                    className="w-full py-2 text-[11px] font-bold text-white/90 hover:text-white flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Flag className="w-3 h-3" /> Reject / Flag Entry
                  </button>
                )}

                <span className="text-xs text-white/90 font-mono font-semibold">
                  Auto-resuming scanner in <strong>{overlayCountdown}s</strong>
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
