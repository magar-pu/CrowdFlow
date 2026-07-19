import React, { useState } from "react";
import { ScannerDevice, Gate, Staff } from "../../types";
import { Plus, Wifi, WifiOff, BatteryMedium } from "lucide-react";
import ScannerSimulator from "./ScannerSimulator";
import AssignScannerModal from "./AssignScannerModal";

interface WorkspaceScannerProps {
  devices: ScannerDevice[];
  gates: Gate[];
  staffList: Staff[];
  onAddDevice: (device: ScannerDevice) => void;
  onUpdateDevice: (id: string, updated: Partial<ScannerDevice>) => void;
  onDeleteDevice: (id: string) => void;
  onLogActivity: (log: { device: string; staff: string; gate: string; type: "scan_success" | "scan_failed"; message: string }) => void;
  onIncrementScan: (deviceId: string, gateName: string) => void;
}

export default function WorkspaceScanner({
  devices,
  gates,
  staffList,
  onAddDevice,
  onLogActivity,
  onIncrementScan
}: WorkspaceScannerProps) {
  const [selectedSimDevice, setSelectedSimDevice] = useState<ScannerDevice | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);

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
                <th className="p-4 font-mono text-[9px] text-text-secondary uppercase font-bold text-right">Simulate</th>
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
                    <button
                      onClick={() => setSelectedSimDevice(dev)}
                      className="bg-surface-container hover:bg-surface-container-high text-text-primary border border-border-subtle hover:text-text-primary font-sans text-[10px] font-bold px-2.5 py-1 rounded transition-colors cursor-pointer"
                    >
                      Open Simulator
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedSimDevice && (
        <ScannerSimulator
          device={selectedSimDevice}
          onClose={() => setSelectedSimDevice(null)}
          onScan={handleSimScan}
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
