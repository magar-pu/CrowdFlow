import React, { useState } from "react";
import { ScannerDevice, Gate, Staff } from "../../types";
import { Plus, Wifi, WifiOff, BatteryMedium, QrCode, Copy, Check, ExternalLink, X } from "lucide-react";
import ScannerSimulator from "./ScannerSimulator";
import AssignScannerModal from "./AssignScannerModal";
import { QRCodeSVG } from "qrcode.react";
import { useParams } from "next/navigation";

interface WorkspaceScannerProps {
  devices: ScannerDevice[];
  gates: Gate[];
  staffList: Staff[];
  onAddDevice: (deviceInput: { name: string; staff: string; gate: string; role: string }) => Promise<{ token: string; url: string } | null>;
  onUpdateDevice: (id: string, updated: Partial<ScannerDevice>) => void;
  onDeleteDevice: (id: string) => void;
  onLogActivity: (log: { device: string; staff: string; gate: string; type: "scan_success" | "scan_failed"; message: string }) => void;
  onIncrementScan: (deviceId: string, gateName: string) => void;
  onCheckIn?: (qrToken: string) => Promise<{ success: boolean; attendeeName?: string; ticketType?: string; seatNumber?: string; message: string }>;
}

export default function WorkspaceScanner({
  devices,
  gates,
  staffList,
  onAddDevice,
  onLogActivity,
  onIncrementScan,
  onCheckIn
}: WorkspaceScannerProps) {
  const params = useParams<{ id: string }>();
  const eventId = params?.id || "1";

  const [selectedSimDevice, setSelectedSimDevice] = useState<ScannerDevice | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [viewQrDevice, setViewQrDevice] = useState<ScannerDevice | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSimScan = (deviceId: string, gateName: string, type: "success" | "duplicate" | "invalid") => {
    if (type === "success") {
      onIncrementScan(deviceId, gateName);
      onLogActivity({
        device: "Handheld",
        staff: "Staff",
        gate: gateName,
        type: "scan_success",
        message: `Simulated ticket scanned successfully at ${gateName}`
      });
    } else {
      onLogActivity({
        device: "Handheld",
        staff: "Staff",
        gate: gateName,
        type: "scan_failed",
        message: `Simulated scan failed at ${gateName}: ${type.toUpperCase()}`
      });
    }
  };

  const getDeviceUrl = (dev: ScannerDevice) => {
    if (typeof window === "undefined") return "";
    const tokenStr = dev.deviceToken || `CF-SCAN-${dev.id}`;
    return `${window.location.origin}/scanner/${eventId}?token=${tokenStr}`;
  };

  const handleCopyLink = (dev: ScannerDevice) => {
    const url = getDeviceUrl(dev);
    navigator.clipboard?.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-6 text-left animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-base font-bold text-text-primary">Scanner Handheld Devices</h3>
          <p className="text-xs text-text-secondary">Deploy staff scanning clients at the entry gates.</p>
        </div>
        <button
          onClick={() => setShowAssignModal(true)}
          className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 text-white" />
          <span>Assign Scanner Device</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {gates.map((gate) => (
          <div key={gate.id} className="p-4 bg-white border border-border-subtle rounded-xl shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-bold text-text-secondary">{gate.name}</span>
              <div className={`p-1.5 rounded-lg border ${gate.status === 'online' ? 'bg-success/10 border-success/20 text-success' : 'bg-surface-container border-border-subtle text-on-surface-variant'}`}>
                {gate.status === 'online' ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
              </div>
            </div>
            <h3 className="text-xl font-bold text-text-primary">{gate.scans.toLocaleString()}</h3>
            <p className="text-[10px] text-text-secondary font-mono mt-1">scans today &middot; {gate.staffCount} staff</p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-border-subtle rounded-xl overflow-hidden soft-shadow">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-border-subtle">
                <th className="p-4 font-mono text-[9px] text-text-secondary uppercase font-bold">Device Name</th>
                <th className="p-4 font-mono text-[9px] text-text-secondary uppercase font-bold">Staff</th>
                <th className="p-4 font-mono text-[9px] text-text-secondary uppercase font-bold">Gate</th>
                <th className="p-4 font-mono text-[9px] text-text-secondary uppercase font-bold">Status</th>
                <th className="p-4 font-mono text-[9px] text-text-secondary uppercase font-bold">Battery</th>
                <th className="p-4 font-mono text-[9px] text-text-secondary uppercase font-bold">Last Sync</th>
                <th className="p-4 font-mono text-[9px] text-text-secondary uppercase font-bold text-right">Scans</th>
                <th className="p-4 font-mono text-[9px] text-text-secondary uppercase font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="font-sans text-xs text-text-primary">
              {devices.map((dev) => (
                <tr key={dev.id} className="border-b border-border-subtle last:border-0 hover:bg-surface-container-low transition-colors">
                  <td className="p-4 font-bold text-text-primary">{dev.name}</td>
                  <td className="p-4 text-text-secondary">{dev.staff}</td>
                  <td className="p-4 font-medium text-text-primary">{dev.gate}</td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded font-mono text-[8px] font-bold ${
                      dev.status === 'online' ? 'bg-success/10 text-success border border-success/20' : 'bg-surface-container text-text-secondary'
                    }`}>
                      {dev.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="flex items-center gap-1 font-mono text-[10px] font-semibold text-text-primary">
                      <BatteryMedium className={`w-3.5 h-3.5 ${dev.battery < 20 ? 'text-danger' : 'text-text-secondary'}`} /> {dev.battery}%
                    </span>
                  </td>
                  <td className="p-4 font-mono text-[10px] text-text-secondary">{dev.lastSync}</td>
                  <td className="p-4 text-right font-mono font-semibold">{dev.scans} check-ins</td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setViewQrDevice(dev)}
                        className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 font-sans text-[10px] font-bold px-2.5 py-1 rounded transition-colors cursor-pointer flex items-center gap-1"
                        title="View device QR code and persistent URL"
                      >
                        <QrCode className="w-3 h-3" />
                        <span>Access QR & Link</span>
                      </button>

                      <button
                        onClick={() => setSelectedSimDevice(dev)}
                        className="bg-surface-container hover:bg-surface-container-high text-text-primary border border-border-subtle hover:text-text-primary font-sans text-[10px] font-bold px-2.5 py-1 rounded transition-colors cursor-pointer"
                      >
                        Simulator
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Persistent Access QR Code & Link Modal */}
      {viewQrDevice && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-border-subtle rounded-2xl w-full max-w-sm p-6 text-center shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <div className="text-left">
                <h3 className="text-sm font-bold text-text-primary">{viewQrDevice.name} Access</h3>
                <p className="text-[10px] text-text-secondary">Assigned to {viewQrDevice.staff} ({viewQrDevice.gate})</p>
              </div>
              <button
                onClick={() => setViewQrDevice(null)}
                className="p-1 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-container transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="w-36 h-36 mx-auto rounded-xl border border-border-subtle flex items-center justify-center bg-white p-3 shadow-xs">
              <QRCodeSVG value={getDeviceUrl(viewQrDevice)} size={120} />
            </div>

            <div>
              <span className="text-[9px] font-mono font-bold text-text-secondary uppercase">Access Code / Device Token</span>
              <p className="text-sm font-mono font-bold text-text-primary mt-0.5">{viewQrDevice.deviceToken || `CF-SCAN-${viewQrDevice.id}`}</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleCopyLink(viewQrDevice)}
                className="flex-1 flex items-center justify-center gap-1.5 border border-border-subtle hover:bg-surface-container-low text-xs font-semibold py-2 rounded-xl transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Link Copied" : "Copy Link"}</span>
              </button>

              <button
                onClick={() => window.open(getDeviceUrl(viewQrDevice), "_blank")}
                className="flex-1 flex items-center justify-center gap-1.5 bg-primary hover:bg-primary/95 text-white text-xs font-bold py-2 rounded-xl transition-colors cursor-pointer shadow-sm"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Scanner</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedSimDevice && (
        <ScannerSimulator
          device={selectedSimDevice}
          onClose={() => setSelectedSimDevice(null)}
          onScan={handleSimScan}
          onCheckIn={onCheckIn}
        />
      )}

      {showAssignModal && (
        <AssignScannerModal
          staffList={staffList}
          gates={gates}
          onClose={() => setShowAssignModal(false)}
          onAssign={onAddDevice}
        />
      )}
    </div>
  );
}
