"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
// @ts-ignore
import { Html5Qrcode } from "html5-qrcode";
import {
  checkInScannerAttendee,
  getScannerEventInfo,
  verifyScannerDevice,
  ScannerCheckInResult,
  VerifyDeviceResult
} from "@/lib/api/scanner";
import {
  Camera,
  Wifi,
  WifiOff,
  RefreshCw,
  X,
  ShieldAlert,
  Award,
  Lock,
  CheckCircle2,
  User,
  MapPin,
  ArrowRight,
  LogOut,
  QrCode
} from "lucide-react";

export default function StandaloneScannerPage() {
  const params = useParams<{ eventId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const rawEventSlug = params.eventId || "";
  const slugNumbers = rawEventSlug.match(/\d+/g);
  const eventIdNum = slugNumbers && slugNumbers.length > 0 ? parseInt(slugNumbers[0], 10) : 18;
  const initialToken = searchParams.get("token") || "";

  // Device Authentication State
  const [deviceToken, setDeviceToken] = useState(initialToken);
  const [isVerified, setIsVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<VerifyDeviceResult["device"] | null>(null);
  const [inputToken, setInputToken] = useState("");

  // Event & scan states
  const [eventName, setEventName] = useState("Loading Event...");
  const [lastScanTime, setLastScanTime] = useState("-");
  const [todayScans, setTodayScans] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Scan Result Overlay states
  const [scanResult, setScanResult] = useState<"idle" | "success" | "already_used" | "error">("idle");
  const [resultData, setResultData] = useState<ScannerCheckInResult | null>(null);
  const [overlayMessage, setOverlayMessage] = useState("");

  // Scanner UI & Camera state
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [activeCameraId, setActiveCameraId] = useState<string>("");
  const [cameraError, setCameraError] = useState<string | null>(null);

  const qrReaderRef = useRef<Html5Qrcode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize network status listener
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

  // Fetch basic event info
  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const res = await getScannerEventInfo(eventIdNum);
        if (res.success && res.data) {
          setEventName(res.data.eventName);
        } else {
          setEventName("Unknown Event");
        }
      } catch (err) {
        setEventName("Unknown Event");
      }
    };
    fetchEvent();
  }, [eventIdNum]);

  // Attempt auto-verification if token is in URL or localStorage
  useEffect(() => {
    const tokenToVerify = initialToken || localStorage.getItem(`scanner_token_${eventIdNum}`) || "";
    if (tokenToVerify) {
      if (!inputToken) setInputToken(tokenToVerify);
      handleVerifyToken(tokenToVerify);
    }
  }, [initialToken, eventIdNum]);

  const handleVerifyToken = async (tokenStr: string) => {
    if (!tokenStr.trim()) return;
    setIsVerifying(true);
    setAuthError(null);

    try {
      const res = await verifyScannerDevice(tokenStr.trim());
      if (res.success && res.data && res.data.valid && res.data.device) {
        const dev = res.data.device;
        setDeviceInfo(dev);
        setDeviceToken(tokenStr.trim());
        setIsVerified(true);
        localStorage.setItem(`scanner_token_${eventIdNum}`, tokenStr.trim());
        
        // Refresh event info with device eventId
        const infoRes = await getScannerEventInfo(dev.eventId || eventIdNum);
        if (infoRes.success && infoRes.data) {
          setEventName(infoRes.data.eventName);
        }
      } else {
        setIsVerified(false);
        setAuthError(res.data?.message || res.error?.message || "Invalid or unauthorized access code.");
        localStorage.removeItem(`scanner_token_${eventIdNum}`);
      }
    } catch (err) {
      setIsVerified(false);
      setAuthError("Failed to connect to verification server.");
    } finally {
      setIsVerifying(false);
    }
  };

  // Synthesize Sound Beeps (Web Audio API)
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

  // Browser Vibration API
  const triggerVibration = (type: "success" | "error") => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      if (type === "success") {
        navigator.vibrate(150);
      } else {
        navigator.vibrate([100, 50, 100]);
      }
    }
  };

  // Scan Result Overlay & Cooldown states
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
    setOverlayMessage("");
    setOverlayCountdown(60);

    // Mandatory 3-second scanner cooldown pause before resuming camera feed
    setCooldownSec(3);
    const cdTimer = setInterval(() => {
      setCooldownSec((prev) => {
        if (prev <= 1) {
          clearInterval(cdTimer);
          try {
            if (qrReaderRef.current) {
              qrReaderRef.current.resume();
            }
          } catch (e) {
            console.warn("Camera resume error:", e);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Process QR token / Ticket checkin
  const handleCheckInResult = async (token: string) => {
    if (isSubmitting || scanResult !== "idle" || cooldownSec > 0) return;

    // Immediately pause camera decoding to stop continuous beeping & scanning!
    try {
      if (qrReaderRef.current) {
        qrReaderRef.current.pause(true);
      }
    } catch (e) {
      console.warn("Camera pause error:", e);
    }

    setIsSubmitting(true);

    try {
      const res = await checkInScannerAttendee(eventIdNum, token, deviceToken);
      const now = new Date();
      setLastScanTime(now.toLocaleTimeString("id-ID"));

      if (res.success && res.data) {
        const payload = res.data;
        setResultData(payload);

        if (payload.status === "VALID") {
          setScanResult("success");
          setOverlayMessage(payload.message || "Ticket Verified!");
          playSound("success");
          triggerVibration("success");
          setTodayScans((prev) => prev + 1);
        } else if (payload.status === "ALREADY_USED") {
          setScanResult("already_used");
          setOverlayMessage("Duplicate Scan!");
          playSound("error");
          triggerVibration("error");
        } else {
          setScanResult("error");
          setOverlayMessage(payload.message || "Scan Failed");
          playSound("error");
          triggerVibration("error");
        }
      } else {
        setScanResult("error");
        setOverlayMessage(res.error?.message || "Invalid ticket signature");
        playSound("error");
        triggerVibration("error");
      }
    } catch (err) {
      setScanResult("error");
      setOverlayMessage("Server Connection Error");
      playSound("error");
      triggerVibration("error");
    } finally {
      setIsSubmitting(false);

      // Start 60-second overlay countdown timer (can be skipped anytime)
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

  // Initialize and start camera scanning after verification
  const startCamera = async (cameraId?: string) => {
    if (!isVerified) return;
    setCameraError(null);
    try {
      if (!qrReaderRef.current) {
        qrReaderRef.current = new Html5Qrcode("reader");
      }
      const reader = qrReaderRef.current;

      try {
        if (reader.isScanning) {
          await reader.stop();
        }
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
        (decodedText: string) => {
          handleCheckInResult(decodedText);
        },
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
    if (!isVerified) return;

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
  }, [isVerified]);

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

  const handleDeactivate = () => {
    setIsVerified(false);
    setDeviceInfo(null);
    setDeviceToken("");
    localStorage.removeItem(`scanner_token_${eventIdNum}`);
  };

  // -------------------------------------------------------------
  // RENDER UNVERIFIED / DEVICE AUTHENTICATION SCREEN
  // -------------------------------------------------------------
  if (!isVerified) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 bg-surface-container-low font-sans text-text-primary">
        <div className="w-full max-w-sm bg-white border border-border-subtle rounded-3xl p-6 shadow-xl text-left space-y-5 animate-scale-in">
          {/* Header Icon */}
          <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto text-primary">
            <Lock className="w-7 h-7" />
          </div>

          <div className="text-center space-y-1">
            <span className="text-[10px] font-mono font-bold text-primary tracking-widest uppercase">SECURITY VERIFICATION</span>
            <h2 className="text-lg font-bold text-text-primary tracking-tight">Handheld Device Verification</h2>
            <p className="text-xs text-text-secondary leading-relaxed max-w-[260px] mx-auto">
              Please enter or scan your assigned Access Code to unlock ticket check-in.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleVerifyToken(inputToken);
            }}
            className="space-y-3"
          >
            <div className="space-y-1">
              <label className="text-[9px] font-mono font-bold text-text-secondary uppercase">Access Code / Device Token</label>
              <div className="relative">
                <QrCode className="absolute top-3 left-3 w-4 h-4 text-on-surface-variant" />
                <input
                  type="text"
                  value={inputToken}
                  onChange={(e) => setInputToken(e.target.value)}
                  placeholder="e.g. CF-SCAN-ADMIN123"
                  className="w-full h-10 pl-9 pr-3 border border-border-subtle rounded-xl text-xs bg-white text-text-primary font-mono outline-none focus:border-primary transition-all uppercase"
                />
              </div>
              <p className="text-[10px] text-text-secondary mt-1">
                Enter your Handheld Access Code (e.g. <code className="font-mono text-primary font-bold">CF-SCAN-ADMIN123</code>). Do not enter ticket QR tokens here.
              </p>
            </div>

            {authError && (
              <div className="p-3 bg-danger/10 border border-danger/20 rounded-xl text-danger text-[11px] font-medium flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isVerifying || !inputToken.trim()}
              className="w-full h-10 bg-primary hover:bg-primary/95 disabled:bg-surface-container disabled:text-on-surface-variant text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
            >
              {isVerifying ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying Device...</span>
                </>
              ) : (
                <>
                  <span>Authenticate Device</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="border-t border-border-subtle pt-3 text-center">
            <span className="text-[10px] text-text-secondary font-mono">Event: {eventName}</span>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER VERIFIED CAMERA SCANNER UI (CLEAN WHITE MODERN THEME)
  // -------------------------------------------------------------
  return (
    <div className="flex-1 flex flex-col h-full bg-surface-container-low font-sans text-text-primary select-none relative overflow-hidden">
      
      {/* Top Clean Navbar */}
      <header className="px-4 py-3 bg-white border-b border-border-subtle flex justify-between items-center shrink-0 shadow-xs">
        <div className="flex flex-col text-left">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse"></span>
            <span className="text-[9px] font-mono text-text-secondary uppercase font-bold tracking-wider">
              {deviceInfo?.gateName || "Gate Authorized"}
            </span>
          </div>
          <h1 className="text-sm font-bold text-text-primary max-w-[190px] truncate leading-tight mt-0.5">{eventName}</h1>
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
            onClick={handleDeactivate}
            className="p-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-text-primary transition-colors cursor-pointer"
            title="Deactivate scanner session"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Scanner Container */}
      <main className="flex-1 flex flex-col items-center justify-between p-4 relative">
        
        {/* Device Information Pill */}
        <div className="w-full max-w-sm bg-white border border-border-subtle rounded-xl p-3 flex justify-between items-center text-left text-xs mb-3 shrink-0 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <User className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[9px] font-mono text-text-secondary block uppercase">Assigned Staff</span>
              <span className="font-bold text-text-primary">{deviceInfo?.staffName || "Staff Member"}</span>
            </div>
          </div>

          {cameras.length > 0 && (
            <div className="flex items-center gap-1">
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
            </div>
          )}
        </div>

        {/* Viewfinder Window (Clean Dark Camera Frame with White Corners) */}
        <div className="w-full max-w-[310px] aspect-square bg-slate-900 border-2 border-border-subtle rounded-3xl relative overflow-hidden my-auto flex items-center justify-center shadow-2xl">
          <div id="reader" className="w-full h-full object-cover"></div>
          
          {/* Target Reticle White Corner Brackets (As shown in Picture 2) */}
          <div className="absolute inset-8 pointer-events-none z-10 border-2 border-transparent">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-xl"></div>
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-xl"></div>
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-xl"></div>
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-xl"></div>
          </div>
          
          {/* Scanline overlay */}
          {isScanning && scanResult === "idle" && cooldownSec === 0 && (
            <div className="absolute inset-x-0 h-0.5 bg-primary shadow-md shadow-primary/50 animate-scanline z-10 pointer-events-none"></div>
          )}

          {/* Submitting / Validating Ticket Loading Overlay */}
          {isSubmitting && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center z-30 animate-fade-in">
              <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin mb-3 shadow-lg"></div>
              <span className="text-xs font-mono font-bold text-white uppercase tracking-wider animate-pulse">
                ⚡ Validating Pass...
              </span>
              <p className="text-[10px] text-white/70 font-mono mt-1">Verifying TOTP security signature</p>
            </div>
          )}

          {/* Cooldown Pause Overlay */}
          {cooldownSec > 0 && (
            <div className="absolute inset-0 bg-black/70 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center z-20">
              <div className="w-12 h-12 rounded-full bg-white/20 border-2 border-white flex items-center justify-center text-white font-mono font-black text-xl mb-2 animate-bounce">
                {cooldownSec}s
              </div>
              <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                ⏳ Scanner Cooldown
              </span>
              <p className="text-[10px] text-white/80 font-mono mt-1">Pausing camera to prevent duplicate beeps</p>
            </div>
          )}

          {/* Camera Errors */}
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

        {/* Manual Entrance ID Fallback */}
        <div className="w-full max-w-sm bg-white border border-border-subtle rounded-xl p-3.5 mt-3 shrink-0 shadow-xs">
          <form onSubmit={handleManualSubmit} className="space-y-1.5 text-left">
            <label className="text-[8px] font-mono text-text-secondary uppercase tracking-widest block font-bold">Manual Entrance ID / Signature</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="Enter ticket UUID or signature code"
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

      {/* Bottom Counter Bar */}
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

      {/* SUCCESS / FAIL SCANNED RESULTS OVERLAY */}
      {scanResult !== "idle" && (
        <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center p-6 animate-fade-in ${
          scanResult === "success" ? "bg-success/95 backdrop-blur-md" : "bg-danger/95 backdrop-blur-md"
        }`}>
          <div className="text-center space-y-4 max-w-[320px] w-full">
            {/* Visual Icon Badge */}
            <div className="w-20 h-20 rounded-full border-4 border-white mx-auto flex items-center justify-center text-white font-black text-4xl shadow-xl bg-white/20">
              {scanResult === "success" ? "✓" : "✕"}
            </div>

            {/* Main Validation Header */}
            <div>
              <h2 className="text-white text-2xl font-black tracking-tight uppercase">
                {scanResult === "success" ? "VALID TICKET" : "CHECK-IN DENIED"}
              </h2>
              <p className="text-[11px] text-white/90 font-mono tracking-wider mt-1 uppercase font-bold">
                {overlayMessage}
              </p>
            </div>

            {/* Attendee Details */}
            {resultData && resultData.attendeeName && (
              <div className="bg-white rounded-2xl p-4 text-left space-y-2.5 mt-2 shadow-2xl border border-white/40">
                <div>
                  <span className="text-[9px] text-text-secondary font-mono block uppercase font-bold">Guest Name</span>
                  <span className="text-base font-extrabold text-text-primary">{resultData.attendeeName}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border-subtle">
                  <div>
                    <span className="text-[9px] text-text-secondary font-mono block uppercase font-bold">Tier</span>
                    <span className="text-xs font-bold text-primary flex items-center gap-1 mt-0.5">
                      <Award className="w-3.5 h-3.5" /> {resultData.ticketType || "Standard"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-text-secondary font-mono block uppercase font-bold">Seat Assignment</span>
                    <span className="text-xs font-mono font-bold text-text-primary truncate block mt-0.5">
                      {resultData.seatNumber || "General Seating"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1.5 border-t border-border-subtle">
                  <div>
                    <span className="text-[9px] text-text-secondary font-mono block uppercase font-bold">Ticket ID</span>
                    <span className="text-[10px] font-mono font-bold text-text-secondary truncate block mt-0.5" title={resultData.ticketId}>
                      {resultData.ticketId ? `${resultData.ticketId.slice(0, 8)}...` : "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-text-secondary font-mono block uppercase font-bold">Order Ref</span>
                    <span className="text-[10px] font-mono font-bold text-text-secondary truncate block mt-0.5" title={resultData.orderId}>
                      {resultData.orderId ? `${resultData.orderId.slice(0, 8)}...` : "N/A"}
                    </span>
                  </div>
                </div>

                {scanResult === "already_used" && (
                  <div className="border-t border-border-subtle pt-2 text-[10px] text-danger font-mono font-bold">
                    ⚠️ First Entry: <strong>{resultData.checkInTime}</strong> at <strong>{resultData.gateName}</strong>
                  </div>
                )}
              </div>
            )}

            {/* Cooldown Skip Button & Countdown Timer */}
            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={dismissOverlay}
                className="w-full py-3.5 bg-white text-text-primary hover:bg-surface-container font-black text-sm rounded-2xl shadow-2xl flex items-center justify-center gap-2.5 cursor-pointer transition-all active:scale-95 border-2 border-white/80 group"
              >
                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:rotate-45 transition-transform">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                </div>
                <span>📸 Scan Next Attendee</span>
              </button>
              <span className="text-xs text-white/90 font-mono font-semibold">
                Auto-resuming scanner in <strong>{overlayCountdown}s</strong>
              </span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
