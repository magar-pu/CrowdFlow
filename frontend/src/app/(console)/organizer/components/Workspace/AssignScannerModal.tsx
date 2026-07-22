import React, { useState } from 'react';
import { Staff, Gate, ScannerDevice } from '../../types';
import { X, Search, QrCode, Copy, Check, Loader2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface AssignScannerModalProps {
  staffList: Staff[];
  gates: Gate[];
  onClose: () => void;
  onAssign: (deviceInput: { name: string; staff: string; gate: string; role: string }) => Promise<{ token: string; url: string } | null>;
}

const ROLES: ScannerDevice['role'][] = ['QR Scanner', 'Manual Validation', 'Supervisor'];
const PERMISSIONS = ['Scan Tickets', 'Offline Mode', 'View Attendee Info', 'Issue Refunds'];
const DURATIONS = ['4 Hours', '8 Hours', '24 Hours', '7 Days'];

export default function AssignScannerModal({ staffList, gates, onClose, onAssign }: AssignScannerModalProps) {
  const [search, setSearch] = useState('');
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [gate, setGate] = useState(gates[0]?.name ?? '');
  const [role, setRole] = useState<ScannerDevice['role']>('QR Scanner');
  const [permissions, setPermissions] = useState<string[]>(['Scan Tickets']);
  const [duration, setDuration] = useState('24 Hours');
  const [accessCode, setAccessCode] = useState<string | null>(null);
  const [realUrl, setRealUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  const filteredStaff = staffList.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));

  const togglePermission = (perm: string) => {
    setPermissions(prev => prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    const staffName = selectedStaff ? selectedStaff.name : search.trim();
    if (!staffName) return;

    setIsRegistering(true);
    try {
      const devName = `Scanner ${gate.split(' ')[1] || 'X'}`;
      const res = await onAssign({
        name: devName,
        staff: staffName,
        gate: gate,
        role: role
      });
      if (res) {
        setAccessCode(res.token);
        setRealUrl(res.url);
      }
    } catch (err) {
      console.error("Failed to assign scanner device:", err);
    } finally {
      setIsRegistering(false);
    }
  };

  const handleDone = () => {
    onClose();
  };

  const handleCopy = () => {
    if (!realUrl) return;
    navigator.clipboard?.writeText(realUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl border border-border-subtle shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border-subtle">
          <h3 className="text-sm font-bold text-text-primary">Assign Scanner Device</h3>
          <button onClick={onClose} className="text-on-surface-variant hover:text-text-primary p-1 rounded transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {!accessCode ? (
          <form onSubmit={handleGenerate} className="p-5 space-y-4 text-left">
            <div className="space-y-1.5">
              <label className="text-[9px] font-mono font-bold text-text-secondary uppercase">Staff Member</label>
              <div className="relative">
                <Search className="absolute top-2.5 left-3 w-3.5 h-3.5 text-on-surface-variant" />
                <input
                  type="text"
                  value={selectedStaff ? selectedStaff.name : search}
                  onChange={(e) => { setSearch(e.target.value); setSelectedStaff(null); }}
                  placeholder="Type or search staff name..."
                  className="w-full h-9 pl-8 pr-3 border border-border-subtle rounded-lg text-xs bg-white outline-none"
                />
              </div>
              {!selectedStaff && search && (
                <div className="border border-border-subtle rounded-lg max-h-32 overflow-y-auto mt-1 bg-white">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedStaff({
                        id: 'custom',
                        name: search,
                        role: 'Staff Scanner',
                        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80",
                        status: 'active'
                      });
                      setSearch('');
                    }}
                    className="w-full flex items-center gap-2 p-2 text-left hover:bg-surface-container-low transition-colors cursor-pointer border-b border-border-subtle"
                  >
                    <div className="w-6 h-6 rounded-full bg-secondary/10 flex items-center justify-center text-secondary text-[10px] font-bold">
                      +
                    </div>
                    <span className="text-xs font-semibold text-secondary">Use custom name: "{search}"</span>
                  </button>

                  {filteredStaff.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => { setSelectedStaff(s); setSearch(''); }}
                      className="w-full flex items-center gap-2 p-2 text-left hover:bg-surface-container-low transition-colors cursor-pointer"
                    >
                      <img src={s.avatar} alt={s.name} className="w-6 h-6 rounded-full object-cover" />
                      <span className="text-xs font-medium text-text-primary">{s.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-mono font-bold text-text-secondary uppercase">Gate Assignment</label>
              <select value={gate} onChange={(e) => setGate(e.target.value)} className="w-full h-9 px-3 border border-border-subtle rounded-lg text-xs bg-white outline-none cursor-pointer">
                {gates.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-mono font-bold text-text-secondary uppercase">Scanner Role</label>
              <div className="inline-flex flex-wrap rounded-lg border border-border-subtle p-1 bg-surface-container-low gap-1 w-full">
                {ROLES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`flex-1 px-2 py-1.5 rounded-md text-[10px] font-semibold transition-colors cursor-pointer ${
                      role === r ? 'bg-primary text-on-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-mono font-bold text-text-secondary uppercase">Device Permissions</label>
              <div className="grid grid-cols-2 gap-2">
                {PERMISSIONS.map((perm) => (
                  <label key={perm} className="flex items-center gap-2 text-[11px] text-text-secondary cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={permissions.includes(perm)}
                      onChange={() => togglePermission(perm)}
                      className="w-3.5 h-3.5 accent-secondary cursor-pointer"
                    />
                    {perm}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-mono font-bold text-text-secondary uppercase">Session Duration</label>
              <select value={duration} onChange={(e) => setDuration(e.target.value)} className="w-full h-9 px-3 border border-border-subtle rounded-lg text-xs bg-white outline-none cursor-pointer">
                {DURATIONS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

             <button
              type="submit"
              disabled={isRegistering || (!selectedStaff && !search.trim())}
              className="w-full flex items-center justify-center gap-1.5 bg-primary hover:bg-primary/90 disabled:bg-surface-container disabled:text-on-surface-variant text-white text-xs font-bold py-2.5 rounded-lg transition-colors cursor-pointer"
            >
              {isRegistering ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Registering...</span>
                </>
              ) : (
                <>
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Generate Scanner Access</span>
                </>
              )}
            </button>
          </form>
        ) : (
          <div className="p-5 space-y-4 text-center">
            <div className="w-32 h-32 mx-auto rounded-xl border border-border-subtle flex items-center justify-center bg-white p-2.5 shadow-xs">
              <QRCodeSVG value={realUrl} size={108} />
            </div>
            <div>
              <p className="text-[10px] font-mono font-bold text-text-secondary uppercase">Access Code</p>
              <p className="text-lg font-bold text-text-primary font-mono">{accessCode}</p>
            </div>
            <button
              onClick={handleCopy}
              className="w-full flex items-center justify-center gap-1.5 border border-border-subtle hover:bg-surface-container-low text-text-primary text-xs font-semibold py-2 rounded-lg transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Link Copied' : 'Copy Access Link'}
            </button>
            <p className="text-[10px] text-on-surface-variant leading-relaxed">
              Valid for {duration}. Scan the QR code or copy the link to activate the handheld device for <strong>{selectedStaff?.name || search}</strong> at <strong>{gate}</strong>.
            </p>
            <button
              onClick={handleDone}
              className="w-full bg-secondary hover:bg-secondary/90 text-white text-xs font-bold py-2.5 rounded-lg transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
