"use client";

import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, QrCode, Wifi, Battery, Camera, Volume2, VolumeX, Check, ShieldAlert, X, History } from 'lucide-react';
import { Scanner, VenueSection } from '@/types/admin';

interface WorkspaceScannerSimulatorProps {
  selectedScannerForApp: Scanner;
  onClose: () => void;
  scanners: Scanner[];
  venueSections: VenueSection[];
  onUpdateScanners: (updatedScanners: Scanner[]) => void;
  onUpdateSections: (updatedSections: VenueSection[]) => void;
}

interface MockTicket {
  id: string;
  holderName: string;
  tierName: string;
  sectionId: string;
  status: 'valid' | 'duplicate' | 'wrong_gate' | 'blacklisted';
  seatNumber: string;
  avatarUrl: string;
}

type SafariAudioWindow = Window & typeof globalThis & {
  webkitAudioContext?: typeof AudioContext;
};

const mockTickets: MockTicket[] = [
  {
    id: 'CF-TKT-8291-A0',
    holderName: 'Sarah Jenkins',
    tierName: 'VIP All-Access Pass',
    sectionId: 'SEC-A',
    status: 'valid',
    seatNumber: 'VIP-Row-01-08',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&auto=format&fit=crop'
  },
  {
    id: 'CF-TKT-1049-C1',
    holderName: 'Aditya Pratama',
    tierName: 'General Admission - Phase 2',
    sectionId: 'SEC-B',
    status: 'valid',
    seatNumber: 'GA-Zone-3-24',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150&auto=format&fit=crop'
  },
  {
    id: 'CF-TKT-8831-D4',
    holderName: 'David Miller',
    tierName: 'General Admission - Phase 2',
    sectionId: 'SEC-B',
    status: 'duplicate',
    seatNumber: 'GA-Zone-4-99',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=150&auto=format&fit=crop'
  },
  {
    id: 'CF-TKT-7402-E2',
    holderName: 'Jessica Taylor',
    tierName: 'Behind The Scenes Package',
    sectionId: 'SEC-E',
    status: 'wrong_gate',
    seatNumber: 'VIP-Box-03',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop'
  },
  {
    id: 'CF-TKT-3199-F9',
    holderName: 'Budi Santoso',
    tierName: 'General Admission - Early Bird',
    sectionId: 'SEC-B',
    status: 'blacklisted',
    seatNumber: 'GA-Zone-1-115',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=150&auto=format&fit=crop'
  }
];

function VisualQRCode({ id }: { id: string }) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const blocks = [];
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 10; x++) {
      const isTopLeftAnchor = (x < 3 && y < 3);
      const isTopRightAnchor = (x > 6 && y < 3);
      const isBottomLeftAnchor = (x < 3 && y > 6);
      
      if (isTopLeftAnchor || isTopRightAnchor || isBottomLeftAnchor) {
        const isBorder = ((x === 0 || x === 2 || y === 0 || y === 2) && isTopLeftAnchor) ||
                         ((x === 7 || x === 9 || y === 0 || y === 2) && isTopRightAnchor) ||
                         ((x === 0 || x === 2 || y === 7 || y === 9) && isBottomLeftAnchor);
        const isCenter = (x === 1 && y === 1) || (x === 8 && y === 1) || (x === 1 && y === 8);
        blocks.push({ x, y, fill: isBorder || isCenter });
      } else {
        const bitIndex = Math.abs((y * 10 + x) % 32);
        const fill = ((hash >> bitIndex) & 1) === 1;
        blocks.push({ x, y, fill });
      }
    }
  }

  return (
    <svg viewBox="0 0 10 10" className="w-16 h-16 bg-white p-1 rounded-md border border-slate-700/50">
      {blocks.map((b, i) => b.fill ? (
        <rect
          key={i}
          x={b.x}
          y={b.y}
          width="1"
          height="1"
          fill="#020617"
        />
      ) : null)}
    </svg>
  );
}

export default function WorkspaceScannerSimulator({
  selectedScannerForApp,
  onClose,
  scanners,
  venueSections,
  onUpdateScanners,
  onUpdateSections
}: WorkspaceScannerSimulatorProps) {
  const [useRealCamera, setUseRealCamera] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [scannerAppIsScanning, setScannerAppIsScanning] = useState(false);
  const [scannerAppScanResult, setScannerAppScanResult] = useState<{
    success: boolean;
    status: 'valid' | 'duplicate' | 'wrong_gate' | 'blacklisted';
    message: string;
    holder: string;
    tier: string;
    details: string;
  } | null>(null);
  const [scannerAppHistory, setScannerAppHistory] = useState<{
    id: string;
    time: string;
    holder: string;
    status: 'valid' | 'duplicate' | 'wrong_gate' | 'blacklisted';
  }[]>([]);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  const playBeep = (type: 'success' | 'error' | 'warning') => {
    if (!soundEnabled) return;
    try {
      const AudioContextCtor = window.AudioContext || (window as SafariAudioWindow).webkitAudioContext;
      if (!AudioContextCtor) return;
      const audioCtx = new AudioContextCtor();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      if (type === 'success') {
        osc.frequency.setValueAtTime(1000, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
        osc.stop(audioCtx.currentTime + 0.12);
      } else if (type === 'error') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(160, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
        osc.stop(audioCtx.currentTime + 0.35);
      } else if (type === 'warning') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(400, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.22);
        osc.stop(audioCtx.currentTime + 0.22);
      }
    } catch (err) {
      console.warn('Audio Context failed to initialize:', err);
    }
  };

  useEffect(() => {
    let stream: MediaStream | null = null;
    async function startCamera() {
      if (useRealCamera && !scannerAppScanResult && !scannerAppIsScanning) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } } 
          });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (err) {
          console.error("Camera access blocked:", err);
          setUseRealCamera(false);
        }
      }
    }
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [useRealCamera, scannerAppScanResult, scannerAppIsScanning]);

  const handleScanTicket = (ticket: MockTicket) => {
    if (scannerAppIsScanning) return;

    setScannerAppIsScanning(true);
    setScannerAppScanResult(null);

    setTimeout(() => {
      setScannerAppIsScanning(false);
      let success = false;
      let alertSound: 'success' | 'error' | 'warning' = 'success';
      let msg = '';
      let desc = '';

      switch (ticket.status) {
        case 'valid':
          success = true;
          alertSound = 'success';
          msg = 'TICKET VERIFIED';
          desc = `Welcome, ${ticket.holderName}! Ticket matches contract signature and has been checked-in.`;

          const updatedScanners = scanners.map(s => {
            if (s.id === selectedScannerForApp.id) {
              return { ...s, scansCount: s.scansCount + 1, status: 'Scanning' as const, lastSync: 'Just now' };
            }
            return s;
          });
          onUpdateScanners(updatedScanners);

          const updatedSections = venueSections.map(sec => {
            if (sec.id === ticket.sectionId && sec.occupied !== -1) {
              return { ...sec, occupied: Math.min(sec.capacity, sec.occupied + 1) };
            }
            return sec;
          });
          onUpdateSections(updatedSections);
          break;

        case 'duplicate':
          success = false;
          alertSound = 'error';
          msg = 'DUPLICATE TICKET';
          desc = 'This ticket has already been checked-in. Counterfeit copy signature detected. Entry denied.';
          break;

        case 'wrong_gate':
          success = false;
          alertSound = 'warning';
          msg = 'WRONG SECTION GATE';
          desc = `Valid ticket, but assigned to section ${ticket.sectionId}. Please direct visitor to correct gate entrance.`;
          break;

        case 'blacklisted':
          success = false;
          alertSound = 'error';
          msg = 'REVOKED TICKET';
          desc = 'This transaction has been refunded or this user has been suspended. Ticket contract voided.';
          break;
      }

      playBeep(alertSound);

      setScannerAppScanResult({
        success,
        status: ticket.status,
        message: msg,
        holder: ticket.holderName,
        tier: ticket.tierName,
        details: desc
      });

      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setScannerAppHistory(prev => [
        { id: ticket.id, time: timeStr, holder: ticket.holderName, status: ticket.status },
        ...prev
      ]);

      setTimeout(() => {
        onUpdateScanners(scanners.map(s => {
          if (s.id === selectedScannerForApp.id) {
            return { ...s, status: 'Online' as const };
          }
          return s;
        }));
      }, 1500);

    }, 850);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 border-b border-border-subtle pb-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          onClick={() => {
            onClose();
            setUseRealCamera(false);
          }}
          className="inline-flex min-h-11 items-center justify-center gap-1 rounded-xl border border-border-subtle bg-surface-white px-3.5 py-2 text-xs font-semibold text-text-secondary transition-colors hover:bg-surface-soft hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Device Directory</span>
        </button>
        <div className="text-left sm:text-right">
          <span className="text-[10px] font-mono text-text-muted uppercase tracking-widest font-bold">Client App Portal</span>
          <p className="mt-0.5 text-xs font-semibold text-text-primary">{selectedScannerForApp.name} ({selectedScannerForApp.deviceName})</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* Smartphone Simulator */}
        <div className="flex justify-center lg:col-span-5">
          <div className="relative flex aspect-[310/610] w-full max-w-[310px] flex-col overflow-hidden rounded-[44px] border-[10px] border-slate-800 border-t-[12px] border-b-[12px] bg-slate-950 shadow-2xl">
            {/* Notch */}
            <div className="w-24 h-4.5 bg-black rounded-full absolute top-1.5 left-1/2 -translate-x-1/2 z-30 flex items-center justify-center shadow-inner">
              <span className="w-1.5 h-1.5 bg-indigo-900/40 rounded-full absolute left-4" />
              <span className="w-1 h-1 bg-slate-950 rounded-full absolute right-6" />
            </div>

            {/* Status Bar */}
            <div className="h-8 px-5 pt-2 flex items-center justify-between text-[10px] font-bold text-slate-400 z-20 select-none">
              <span className="font-mono">14:45</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] tracking-wider font-mono">CF-5G</span>
                <Wifi className="h-3 w-3" />
                <div className="flex items-center gap-0.5">
                  <Battery className="h-3.5 w-3.5 text-indigo-400" />
                  <span className="text-[9px] font-mono">{selectedScannerForApp.batteryLevel}%</span>
                </div>
              </div>
            </div>

            {/* App Viewport */}
            <div className="flex-1 flex flex-col bg-slate-900 text-slate-100 p-4 pt-1 select-none overflow-hidden justify-between">
              <div className="text-center pb-2 border-b border-slate-800">
                <div className="flex items-center justify-center gap-1">
                  <QrCode className="h-3.5 w-3.5 text-indigo-400 animate-pulse" />
                  <span className="text-2xs font-extrabold text-white tracking-wider">CROWDFLOW STAFF</span>
                </div>
                <p className="text-[9px] text-slate-400 mt-0.5 font-medium uppercase tracking-wider">{selectedScannerForApp.assignedSection} entrance</p>
              </div>

              <div className="flex-1 flex flex-col justify-center items-center py-4">
                {scannerAppIsScanning ? (
                  <div className="flex flex-col items-center justify-center text-center space-y-4">
                    <div className="relative flex items-center justify-center">
                      <div className="h-12 w-12 rounded-full border-2 border-indigo-500/10 border-t-indigo-500 animate-spin" />
                      <QrCode className="h-5 w-5 text-indigo-400 absolute" />
                    </div>
                    <div>
                      <p className="text-2xs font-bold text-slate-200">Verifying Ticket...</p>
                      <p className="text-3xs text-slate-500 mt-0.5 font-mono">Running crypt-validation</p>
                    </div>
                  </div>
                ) : scannerAppScanResult ? (
                  <div className="w-full h-full flex flex-col justify-between items-center text-center">
                    <div className="flex-1 flex flex-col justify-center items-center p-2 space-y-3">
                      {scannerAppScanResult.status === 'valid' && (
                        <div className="h-16 w-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-500/10 text-emerald-400 animate-bounce">
                          <Check className="h-8 w-8 stroke-[3]" />
                        </div>
                      )}
                      {scannerAppScanResult.status === 'duplicate' && (
                        <div className="h-16 w-16 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center shadow-lg shadow-rose-500/10 text-rose-500">
                          <ShieldAlert className="h-8 w-8 stroke-[2.5]" />
                        </div>
                      )}
                      {scannerAppScanResult.status === 'wrong_gate' && (
                        <div className="h-16 w-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shadow-lg shadow-amber-500/10 text-amber-500">
                          <ShieldAlert className="h-8 w-8 stroke-[2.5]" />
                        </div>
                      )}
                      {scannerAppScanResult.status === 'blacklisted' && (
                        <div className="h-16 w-16 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center shadow-lg shadow-rose-500/10 text-rose-500">
                          <X className="h-8 w-8 stroke-[3]" />
                        </div>
                      )}

                      <div>
                        <h5 className={`text-xs font-black uppercase tracking-wider ${
                          scannerAppScanResult.status === 'valid' ? 'text-emerald-400' :
                          scannerAppScanResult.status === 'wrong_gate' ? 'text-amber-400' : 'text-rose-500'
                        }`}>
                          {scannerAppScanResult.message}
                        </h5>
                        <p className="text-xs font-bold text-white mt-1">{scannerAppScanResult.holder}</p>
                        <p className="text-[10px] text-indigo-300 font-semibold">{scannerAppScanResult.tier}</p>
                      </div>

                      <div className={`p-2.5 rounded-xl text-[10px] leading-relaxed max-w-[210px] text-center font-medium ${
                        scannerAppScanResult.status === 'valid' ? 'bg-emerald-500/5 text-emerald-300 border border-emerald-500/10' :
                        scannerAppScanResult.status === 'wrong_gate' ? 'bg-amber-500/5 text-amber-300 border border-amber-500/10' :
                        'bg-rose-500/5 text-rose-300 border border-rose-500/10'
                      }`}>
                        {scannerAppScanResult.details}
                      </div>
                    </div>

                    <button
                      onClick={() => setScannerAppScanResult(null)}
                      className={`w-full py-2 rounded-xl text-2xs font-extrabold text-slate-950 transition-all cursor-pointer ${
                        scannerAppScanResult.status === 'valid' ? 'bg-emerald-400 hover:bg-emerald-300' :
                        scannerAppScanResult.status === 'wrong_gate' ? 'bg-amber-400 hover:bg-amber-300' :
                        'bg-rose-500 hover:bg-rose-400 text-white'
                      }`}
                    >
                      Tap to Scan Next
                    </button>
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col justify-between items-center space-y-3">
                    <div className="w-full aspect-[4/3] rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden relative flex items-center justify-center shadow-inner">
                      <div className="absolute h-2/3 w-2/3 border border-indigo-500/20 rounded-xl z-20 flex items-center justify-center">
                        <div className="absolute top-0 left-0 h-3 w-3 border-t-2 border-l-2 border-indigo-400" />
                        <div className="absolute top-0 right-0 h-3 w-3 border-t-2 border-r-2 border-indigo-400" />
                        <div className="absolute bottom-0 left-0 h-3 w-3 border-b-2 border-l-2 border-indigo-400" />
                        <div className="absolute bottom-0 right-0 h-3 w-3 border-b-2 border-r-2 border-indigo-400" />
                        
                        <div 
                          className="absolute w-full h-0.5 bg-indigo-400 shadow-[0_0_8px_#818cf8] left-0"
                          style={{
                            animation: 'scannerLaser 2s linear infinite',
                            top: '0%'
                          }}
                        />
                      </div>

                      {useRealCamera ? (
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-cover transform scale-x-[-1]"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center overflow-hidden">
                          <div className="h-28 w-28 rounded-full border border-indigo-500/10 flex items-center justify-center animate-spin duration-3000">
                            <div className="h-16 w-16 rounded-full border border-indigo-500/5 border-dashed flex items-center justify-center">
                              <QrCode className="h-6 w-6 text-indigo-500/25" />
                            </div>
                          </div>
                          <span className="text-[9px] font-mono text-indigo-500/40 uppercase tracking-widest absolute bottom-2">Virtual Lens Online</span>
                        </div>
                      )}
                    </div>

                    <div className="w-full grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setUseRealCamera(prev => !prev)}
                        className={`flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
                          useRealCamera 
                            ? 'bg-indigo-600 border-indigo-500 text-white' 
                            : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <Camera className="h-3 w-3" />
                        <span>{useRealCamera ? "Camera On" : "Enable Webcam"}</span>
                      </button>

                      <button
                        onClick={() => setSoundEnabled(prev => !prev)}
                        className={`flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
                          soundEnabled 
                            ? 'bg-slate-950/40 border-slate-800 text-slate-300 hover:text-white' 
                            : 'bg-slate-950/20 border-slate-900 text-slate-500'
                        }`}
                      >
                        {soundEnabled ? (
                          <>
                            <Volume2 className="h-3 w-3 text-indigo-400" />
                            <span>Beep On</span>
                          </>
                        ) : (
                          <>
                            <VolumeX className="h-3 w-3 text-slate-600" />
                            <span>Muted</span>
                          </>
                        )}
                      </button>
                    </div>

                    <p className="text-[10px] text-slate-400 text-center font-medium leading-relaxed">
                      Align a passenger ticket QR code from the queue on the right to trigger instant verification.
                    </p>
                  </div>
                )}
              </div>

              <div className="border-t border-slate-800 pt-2 flex items-center justify-between text-[8px] font-bold text-slate-500 tracking-wider font-mono">
                <span>NODE WORKSPACE ID: {selectedScannerForApp.id}</span>
                <span className="text-indigo-400">{selectedScannerForApp.scansCount} COMPLETED SCAN(S)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Guest queue & session history (Right side) */}
        <div className="space-y-5 lg:col-span-7">
          <div className="rounded-2xl border border-border-subtle bg-surface-white p-4 sm:p-5">
            <h4 className="text-sm font-bold text-text-primary">Arriving Guest Tickets Queue</h4>
            <p className="mt-0.5 text-xs font-medium text-text-muted">Use Present Ticket QR to present an attendee ticket. Each ticket simulates a unique check-in condition.</p>

            <div className="mt-4 space-y-3">
              {mockTickets.map((t) => {
                const hasCheckedInInHistory = scannerAppHistory.some(h => h.id === t.id && h.status === 'valid');
                return (
                  <div 
                    key={t.id} 
                    className={`rounded-xl border p-3 flex flex-col sm:flex-row items-center justify-between gap-3 transition-all duration-205 ${
                      hasCheckedInInHistory 
                        ? 'bg-emerald-500/5 border-emerald-500/10' 
                        : 'bg-surface-soft border-border-subtle hover:border-border-medium'
                    }`}
                  >
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <img 
                        src={t.avatarUrl} 
                        alt={t.holderName} 
                        referrerPolicy="no-referrer"
                        className="h-9 w-9 shrink-0 rounded-full border border-border-subtle object-cover"
                      />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-extrabold text-text-primary">{t.holderName}</span>
                          {t.status === 'valid' && (
                            <span className="rounded-full bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 text-[9px] font-extrabold text-indigo-400">
                              VIP Access
                            </span>
                          )}
                          {t.status === 'duplicate' && (
                            <span className="rounded-full bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 text-[9px] font-extrabold text-rose-400">
                              Duplicate Threat
                            </span>
                          )}
                          {t.status === 'wrong_gate' && (
                            <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 text-[9px] font-extrabold text-amber-400">
                              Sector Seat Match
                            </span>
                          )}
                          {t.status === 'blacklisted' && (
                            <span className="rounded-full bg-slate-800 border border-slate-700 px-1.5 py-0.5 text-[9px] font-extrabold text-slate-400">
                              Revoked Wallet
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-[10px] font-medium text-text-secondary">{t.tierName} - Seat: {t.seatNumber}</p>
                        <p className="mt-0.5 text-[9px] font-mono text-text-muted">ID: {t.id}</p>
                      </div>
                    </div>

                    <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:self-center">
                      <VisualQRCode id={t.id} />
                      
                      <button
                        disabled={scannerAppIsScanning}
                        onClick={() => handleScanTicket(t)}
                        className={`min-h-10 rounded-lg px-3 py-1.5 text-[10px] font-bold tracking-wide transition-all ${
                          hasCheckedInInHistory 
                            ? 'bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 cursor-default' 
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 disabled:cursor-not-allowed'
                        }`}
                      >
                        {hasCheckedInInHistory ? "✓ Scanned" : "Present Ticket QR"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CHECK-IN HISTORY LOGS */}
          <div className="rounded-2xl border border-border-subtle bg-surface-white p-4 sm:p-5">
            <div className="flex flex-col gap-2 border-b border-border-subtle pb-3 sm:flex-row sm:items-center sm:justify-between">
              <h4 className="flex items-center gap-1.5 text-sm font-bold text-text-primary">
                <History className="h-3.5 w-3.5 text-primary" />
                <span>Gate Check-In Session History Logs</span>
              </h4>
              <span className="text-[9px] font-mono font-bold uppercase text-text-muted">Real-Time Ingress</span>
            </div>

            <div className="mt-4 max-h-[180px] space-y-2 overflow-y-auto font-mono scrollbar-thin scrollbar-thumb-slate-300">
              {scannerAppHistory.length === 0 ? (
                <p className="text-[10px] text-slate-500 text-center py-6 italic">No scans recorded in this phone session yet. Connect ticket QR code to start logging.</p>
              ) : (
                scannerAppHistory.map((h, index) => (
                  <div key={index} className="flex flex-col gap-2 border-b border-border-subtle py-2 text-[10px] last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <span className="text-slate-500 font-bold">{h.time}</span>
                      <span className="text-slate-200 font-semibold">{h.holder}</span>
                      <span className="text-slate-600">({h.id.split('-').pop()})</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-md font-extrabold uppercase ${
                      h.status === 'valid' ? 'bg-emerald-500/10 text-emerald-400' :
                      h.status === 'wrong_gate' ? 'bg-amber-500/10 text-amber-400' : 'bg-rose-500/10 text-rose-400'
                    }`}>
                      {h.status === 'valid' ? 'VERIFIED' : h.status === 'wrong_gate' ? 'WRONG GATE' : 'BLOCKED'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
