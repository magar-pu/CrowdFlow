import React, { useState } from 'react';
import { ScannerDevice } from '../../types';

interface ScannerSimulatorProps {
  device: ScannerDevice;
  onClose: () => void;
  onScan: (deviceId: string, gateName: string, type: "success" | "duplicate" | "invalid") => void;
}

export default function ScannerSimulator({ device, onClose, onScan }: ScannerSimulatorProps) {
  const [scanResult, setScanResult] = useState<"idle" | "success" | "duplicate" | "invalid">("idle");
  const [scannedName, setScannedName] = useState("");

  const triggerScan = (type: "success" | "duplicate" | "invalid") => {
    const names = ["Charlotte Bennett", "Liam Vance", "Tariq Mahmood", "Yuki Tanaka", "Nils Sjöberg"];
    const pickedName = names[Math.floor(Math.random() * names.length)];
    setScannedName(pickedName);
    setScanResult(type);
    onScan(device.id, device.gate, type);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-black border-2 border-slate-800 rounded-[40px] w-[320px] h-[540px] p-4 flex flex-col justify-between shadow-2xl relative overflow-hidden ring-4 ring-slate-900 text-white font-sans">
        {scanResult !== "idle" && (
          <div className={`absolute inset-0 z-10 transition-all duration-300 pointer-events-none flex flex-col items-center justify-center p-6 ${
            scanResult === "success" ? "bg-success/95" :
            scanResult === "duplicate" ? "bg-danger/95" : "bg-warning/95"
          }`}>
            <div className="text-center space-y-3 animate-bounce pointer-events-auto">
              <div className="w-14 h-14 rounded-full border-4 border-white mx-auto flex items-center justify-center text-white font-extrabold text-2xl">
                {scanResult === "success" ? "✓" : scanResult === "duplicate" ? "✕" : "!"}
              </div>
              <div>
                <h3 className="text-white text-base font-black tracking-tight uppercase">
                  {scanResult === "success" ? "TICKET VALID" : scanResult === "duplicate" ? "DUPLICATE SCAN" : "INVALID FORMAT"}
                </h3>
                <p className="text-[10px] text-slate-300 font-mono mt-1">
                  {scanResult === "success" ? scannedName : "Security Rejection"}
                </p>
              </div>
              <button
                onClick={() => setScanResult("idle")}
                className="mt-6 bg-white/10 hover:bg-white/20 text-white font-mono text-[9px] px-3 py-1 rounded-full cursor-pointer transition-all border border-white/20"
              >
                Tap to Scan Again
              </button>
            </div>
          </div>
        )}

        <div className="w-20 h-3.5 bg-slate-900 rounded-full mx-auto mb-2 flex items-center justify-center gap-1.5 px-3">
          <span className="w-1 h-1 rounded-full bg-slate-800"></span>
          <span className="w-5 h-1 bg-slate-800 rounded-full"></span>
        </div>

        <div className="flex justify-between items-center text-[9px] font-mono text-slate-400 px-2 border-b border-slate-900 pb-2 text-left">
          <span className="font-bold text-white uppercase tracking-wider">CF GATE SCANNER</span>
          <span>{device.name}</span>
        </div>

        <div className="flex-1 bg-slate-950 rounded-xl border border-slate-900 relative flex flex-col justify-between p-3.5 overflow-hidden mt-3">
          <div className="p-2 bg-slate-900 rounded-lg border border-slate-800 flex justify-between items-center text-left">
            <div>
              <span className="text-[7px] font-mono text-slate-500 block uppercase">GATE</span>
              <span className="text-[10px] font-bold text-white">{device.gate}</span>
            </div>
            <div className="text-right">
              <span className="text-[7px] font-mono text-slate-500 block uppercase">SCANS</span>
              <span className="text-[10px] font-bold text-secondary font-mono">{device.scans} check-ins</span>
            </div>
          </div>

          <div className="w-32 h-32 border border-dashed border-secondary/30 rounded-xl mx-auto flex items-center justify-center relative my-3 overflow-hidden">
            <div className="absolute inset-x-0 h-0.5 bg-secondary shadow-md shadow-secondary/50 animate-scanline"></div>
            <span className="text-[8px] font-mono text-secondary/40 uppercase tracking-widest text-center px-2">Align Barcode</span>
          </div>

          <div className="space-y-1.5 z-10">
            <p className="text-[8px] font-mono text-slate-500 text-center uppercase tracking-wider">Simulation Actions</p>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => triggerScan("success")}
                className="bg-success/20 hover:bg-success/30 text-success border border-success/30 font-bold text-[8px] py-1.5 rounded-lg cursor-pointer transition-all text-center"
              >
                SUCCESS
              </button>
              <button
                onClick={() => triggerScan("duplicate")}
                className="bg-danger/20 hover:bg-danger/30 text-danger border border-danger/30 font-bold text-[8px] py-1.5 rounded-lg cursor-pointer transition-all text-center"
              >
                DUPLICATE
              </button>
            </div>
            <button
              onClick={() => triggerScan("invalid")}
              className="w-full bg-slate-900 hover:bg-slate-800 text-slate-400 font-bold text-[8px] py-1.5 rounded-lg cursor-pointer transition-all text-center border border-slate-800"
            >
              INVALID FORMAT
            </button>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-3 w-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-white font-mono text-[9px] py-1.5 rounded-xl cursor-pointer transition-colors"
        >
          Shutdown Simulator
        </button>
      </div>
    </div>
  );
}
