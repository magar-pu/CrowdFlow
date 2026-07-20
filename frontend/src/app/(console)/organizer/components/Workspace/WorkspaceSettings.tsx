import React, { useState } from "react";
import { Staff } from "../../types";
import {
  Settings, Users, Plus, Trash2, Eye, Ticket, Palette, Plug, BellRing,
  AlertTriangle, Archive, KeyRound, Copy, Check, Upload
} from "lucide-react";

interface WorkspaceSettingsProps {
  eventName: string;
  onUpdateEventName: (newName: string) => void;
  staffList: Staff[];
  onAddStaff: (staff: Staff) => void;
  onDeleteStaff: (id: string) => void;
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer shrink-0 ${checked ? 'bg-primary' : 'bg-surface-container'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : ''}`}></span>
    </button>
  );
}

const BRAND_COLORS = ['#0f172a', '#1d4ed8', '#7c3aed', '#db2777', '#059669', '#d97706'];

export default function WorkspaceSettings({
  eventName,
  onUpdateEventName,
  staffList,
  onAddStaff,
  onDeleteStaff
}: WorkspaceSettingsProps) {
  const [name, setName] = useState(eventName);
  const [slug, setSlug] = useState(eventName.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
  const [category, setCategory] = useState('Conference');
  const [organizer, setOrganizer] = useState('CrowdFlow Presents');
  const [description, setDescription] = useState('Join us for keynotes and workshop labs.');
  const [eventDate, setEventDate] = useState('2024-12-15');
  const [timezone, setTimezone] = useState('America/Los_Angeles');
  const [location, setLocation] = useState('Moscone Center, SF');

  const [isPublic, setIsPublic] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [manualApproval, setManualApproval] = useState(false);

  const [maxPerOrder, setMaxPerOrder] = useState(6);
  const [refundPolicy, setRefundPolicy] = useState('Full refund up to 7 days before');
  const [transferEnabled, setTransferEnabled] = useState(true);
  const [resaleEnabled, setResaleEnabled] = useState(false);

  const [logoName, setLogoName] = useState<string | null>(null);
  const [brandColor, setBrandColor] = useState(BRAND_COLORS[1]);

  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [apiKeyCopied, setApiKeyCopied] = useState(false);
  const apiKey = 'cf_live_sk_8f2a1c9e4b7d6053';
  const [webhookUrl, setWebhookUrl] = useState("https://api.crowdflow.io/v1/webhooks/anti-scalping");
  const [integrations, setIntegrations] = useState({ mailchimp: true, googleCalendar: false, zapier: false, webhooks: true });

  const [alerts, setAlerts] = useState({ lowSales: true, capacityFull: true, systemIssues: false });

  const [newStaffName, setNewStaffName] = useState("");
  const [newStaffRole, setNewStaffRole] = useState("Check-in Staff");

  const handleSaveGeneral = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateEventName(name);
  };

  const handleAddStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName) return;
    onAddStaff({
      id: `staff-${Date.now()}`,
      name: newStaffName,
      role: newStaffRole,
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80",
      status: "active"
    });
    setNewStaffName("");
  };

  const handleCopyKey = () => {
    navigator.clipboard?.writeText(apiKey);
    setApiKeyCopied(true);
    setTimeout(() => setApiKeyCopied(false), 1500);
  };

  return (
    <div className="space-y-6 text-left animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General Event Info */}
        <form onSubmit={handleSaveGeneral} className="bg-white border border-border-subtle rounded-xl p-5 shadow-sm space-y-4">
          <h4 className="text-sm font-bold text-text-primary flex items-center gap-2">
            <Settings className="w-4 h-4 text-secondary" /> General Event Info
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[9px] font-mono font-bold text-text-secondary uppercase">Event Title</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full h-9 px-3 border border-border-subtle rounded-lg text-xs bg-white outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-mono font-bold text-text-secondary uppercase">URL Slug</label>
              <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)} className="w-full h-9 px-3 border border-border-subtle rounded-lg text-xs bg-white outline-none font-mono" />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-mono font-bold text-text-secondary uppercase">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full h-9 px-3 border border-border-subtle rounded-lg text-xs bg-white outline-none cursor-pointer">
                <option>Conference</option>
                <option>Festival</option>
                <option>Workshop</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-mono font-bold text-text-secondary uppercase">Organizer</label>
              <input type="text" value={organizer} onChange={(e) => setOrganizer(e.target.value)} className="w-full h-9 px-3 border border-border-subtle rounded-lg text-xs bg-white outline-none" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-mono font-bold text-text-secondary uppercase">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full p-3 border border-border-subtle rounded-lg text-xs bg-white outline-none resize-none" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[9px] font-mono font-bold text-text-secondary uppercase">Date</label>
              <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="w-full h-9 px-3 border border-border-subtle rounded-lg text-xs bg-white outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-mono font-bold text-text-secondary uppercase">Timezone</label>
              <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className="w-full h-9 px-3 border border-border-subtle rounded-lg text-xs bg-white outline-none cursor-pointer">
                <option value="America/Los_Angeles">Pacific (PT)</option>
                <option value="America/New_York">Eastern (ET)</option>
                <option value="Asia/Jakarta">Jakarta (WIB)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-mono font-bold text-text-secondary uppercase">Location</label>
              <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} className="w-full h-9 px-3 border border-border-subtle rounded-lg text-xs bg-white outline-none" />
            </div>
          </div>
          <button type="submit" className="bg-primary hover:bg-primary/90 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors cursor-pointer">Save Changes</button>
        </form>

        {/* Event Visibility */}
        <div className="bg-white border border-border-subtle rounded-xl p-5 shadow-sm space-y-4">
          <h4 className="text-sm font-bold text-text-primary flex items-center gap-2">
            <Eye className="w-4 h-4 text-secondary" /> Event Visibility
          </h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-text-primary">Public Listing</p>
                <p className="text-[10px] text-text-secondary">Show this event in public search and browse pages.</p>
              </div>
              <Toggle checked={isPublic} onChange={setIsPublic} />
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-border-subtle">
              <div>
                <p className="text-xs font-semibold text-text-primary">Featured Event</p>
                <p className="text-[10px] text-text-secondary">Promote on the homepage and category spotlight.</p>
              </div>
              <Toggle checked={isFeatured} onChange={setIsFeatured} />
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-border-subtle">
              <div>
                <p className="text-xs font-semibold text-text-primary">Manual Buyer Approval</p>
                <p className="text-[10px] text-text-secondary">Review each purchase request before confirming.</p>
              </div>
              <Toggle checked={manualApproval} onChange={setManualApproval} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ticket Rules */}
        <div className="bg-white border border-border-subtle rounded-xl p-5 shadow-sm space-y-4">
          <h4 className="text-sm font-bold text-text-primary flex items-center gap-2">
            <Ticket className="w-4 h-4 text-secondary" /> Ticket Rules
          </h4>
          <div className="space-y-1">
            <label className="text-[9px] font-mono font-bold text-text-secondary uppercase">Max Purchase Per Order</label>
            <input type="number" value={maxPerOrder} onChange={(e) => setMaxPerOrder(Number(e.target.value))} className="w-full h-9 px-3 border border-border-subtle rounded-lg text-xs bg-white outline-none" />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-mono font-bold text-text-secondary uppercase">Refund Policy</label>
            <select value={refundPolicy} onChange={(e) => setRefundPolicy(e.target.value)} className="w-full h-9 px-3 border border-border-subtle rounded-lg text-xs bg-white outline-none cursor-pointer">
              <option>Full refund up to 7 days before</option>
              <option>Full refund up to 24 hours before</option>
              <option>No refunds</option>
            </select>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-border-subtle">
            <div>
              <p className="text-xs font-semibold text-text-primary">Ticket Transfer</p>
              <p className="text-[10px] text-text-secondary">Allow attendees to transfer tickets to another name.</p>
            </div>
            <Toggle checked={transferEnabled} onChange={setTransferEnabled} />
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-border-subtle">
            <div>
              <p className="text-xs font-semibold text-text-primary">Official Resale</p>
              <p className="text-[10px] text-text-secondary">Enable a price-capped resale marketplace.</p>
            </div>
            <Toggle checked={resaleEnabled} onChange={setResaleEnabled} />
          </div>
        </div>

        {/* Team & Permissions */}
        <div className="bg-white border border-border-subtle rounded-xl p-5 shadow-sm space-y-4">
          <h4 className="text-sm font-bold text-text-primary flex items-center gap-2">
            <Users className="w-4 h-4 text-secondary" /> Team & Permissions
          </h4>

          <form onSubmit={handleAddStaff} className="flex gap-2 items-end">
            <div className="flex-1 space-y-1">
              <label className="text-[9px] font-mono font-bold text-text-secondary uppercase">New Member Name</label>
              <input type="text" value={newStaffName} onChange={(e) => setNewStaffName(e.target.value)} className="w-full h-9 px-3 border border-border-subtle rounded-lg text-xs bg-white outline-none" placeholder="e.g. Liam Vance" />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-mono font-bold text-text-secondary uppercase">Role</label>
              <select value={newStaffRole} onChange={(e) => setNewStaffRole(e.target.value)} className="h-9 px-2 border border-border-subtle rounded-lg text-xs bg-white outline-none cursor-pointer">
                <option value="Admin">Admin</option>
                <option value="Manager">Manager</option>
                <option value="Check-in Staff">Check-in Staff</option>
              </select>
            </div>
            <button type="submit" className="bg-secondary hover:bg-secondary/90 text-white rounded-lg p-2.5 cursor-pointer"><Plus className="w-4 h-4" /></button>
          </form>

          <div className="divide-y divide-border-subtle max-h-[220px] overflow-y-auto pr-1">
            {staffList.map((st) => (
              <div key={st.id} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <img src={st.avatar} alt={st.name} className="w-8 h-8 rounded-full object-cover" />
                  <div className="text-left">
                    <p className="font-bold text-text-primary">{st.name}</p>
                    <p className="text-[10px] text-on-surface-variant font-mono font-medium">{st.role} &middot; {st.status}</p>
                  </div>
                </div>
                <button onClick={() => onDeleteStaff(st.id)} className="text-on-surface-variant hover:text-danger p-1 cursor-pointer transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Branding */}
        <div className="bg-white border border-border-subtle rounded-xl p-5 shadow-sm space-y-4">
          <h4 className="text-sm font-bold text-text-primary flex items-center gap-2">
            <Palette className="w-4 h-4 text-secondary" /> Branding
          </h4>
          <div className="space-y-1.5">
            <label className="text-[9px] font-mono font-bold text-text-secondary uppercase">Event Logo</label>
            <label className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-dashed border-border-subtle hover:bg-surface-container-low transition-colors cursor-pointer">
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && setLogoName(e.target.files[0].name)} />
              <Upload className="w-3.5 h-3.5 text-on-surface-variant" />
              <span className="text-[11px] text-text-secondary truncate">{logoName ?? 'Upload logo (PNG, SVG)'}</span>
            </label>
          </div>
          <div className="space-y-1.5">
            <label className="text-[9px] font-mono font-bold text-text-secondary uppercase">Primary Brand Color</label>
            <div className="flex items-center gap-2">
              {BRAND_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setBrandColor(c)}
                  className={`w-7 h-7 rounded-full border-2 transition-all cursor-pointer ${brandColor === c ? 'border-text-primary scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[9px] font-mono font-bold text-text-secondary uppercase">Live Ticket Preview</label>
            <div className="rounded-lg border border-border-subtle p-3 flex items-center gap-3" style={{ backgroundColor: `${brandColor}10` }}>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: brandColor }}>
                {logoName ? logoName.charAt(0).toUpperCase() : 'CF'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-text-primary truncate">{name}</p>
                <p className="text-[10px] font-mono" style={{ color: brandColor }}>Get Ticket &rarr;</p>
              </div>
            </div>
          </div>
        </div>

        {/* API & Integrations */}
        <div className="bg-white border border-border-subtle rounded-xl p-5 shadow-sm space-y-4">
          <h4 className="text-sm font-bold text-text-primary flex items-center gap-2">
            <Plug className="w-4 h-4 text-secondary" /> API & Integrations
          </h4>
          <div className="space-y-1.5">
            <label className="text-[9px] font-mono font-bold text-text-secondary uppercase">API Key</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-9 px-3 border border-border-subtle rounded-lg text-xs bg-surface-container-low flex items-center font-mono text-text-primary overflow-hidden">
                <KeyRound className="w-3.5 h-3.5 text-on-surface-variant mr-2 shrink-0" />
                <span className="truncate">{apiKeyVisible ? apiKey : '•'.repeat(20)}</span>
              </div>
              <button onClick={() => setApiKeyVisible(!apiKeyVisible)} className="h-9 px-2.5 border border-border-subtle rounded-lg text-[10px] font-bold text-text-secondary hover:bg-surface-container-low transition-colors cursor-pointer">
                {apiKeyVisible ? 'Hide' : 'Show'}
              </button>
              <button onClick={handleCopyKey} className="h-9 px-2.5 border border-border-subtle rounded-lg text-text-secondary hover:bg-surface-container-low transition-colors cursor-pointer">
                {apiKeyCopied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[9px] font-mono font-bold text-text-secondary uppercase">Webhook Verification URL</label>
            <input type="text" value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} className="w-full h-9 px-3 border border-border-subtle rounded-lg text-xs bg-white outline-none font-mono" />
          </div>
          <div className="space-y-2 pt-2 border-t border-border-subtle">
            {([
              ['mailchimp', 'Mailchimp'],
              ['googleCalendar', 'Google Calendar'],
              ['zapier', 'Zapier'],
              ['webhooks', 'Webhooks'],
            ] as const).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-xs font-medium text-text-primary">{label}</span>
                <Toggle checked={integrations[key]} onChange={(v) => setIntegrations(prev => ({ ...prev, [key]: v }))} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alerts */}
        <div className="bg-white border border-border-subtle rounded-xl p-5 shadow-sm space-y-4">
          <h4 className="text-sm font-bold text-text-primary flex items-center gap-2">
            <BellRing className="w-4 h-4 text-secondary" /> Alerts
          </h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-text-primary">Low Sales Warning</span>
              <Toggle checked={alerts.lowSales} onChange={(v) => setAlerts(prev => ({ ...prev, lowSales: v }))} />
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-border-subtle">
              <span className="text-xs font-medium text-text-primary">Capacity Full</span>
              <Toggle checked={alerts.capacityFull} onChange={(v) => setAlerts(prev => ({ ...prev, capacityFull: v }))} />
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-border-subtle">
              <span className="text-xs font-medium text-text-primary">System Issues</span>
              <Toggle checked={alerts.systemIssues} onChange={(v) => setAlerts(prev => ({ ...prev, systemIssues: v }))} />
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-danger/5 border border-danger/20 rounded-xl p-5 shadow-sm space-y-4">
          <h4 className="text-sm font-bold text-danger flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Danger Zone
          </h4>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-text-primary">Archive Event</p>
              <p className="text-[10px] text-text-secondary">Hide this event from all dashboards without deleting data.</p>
            </div>
            <button
              onClick={() => alert(`"${name}" has been archived.`)}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-border-subtle hover:bg-surface-container-low rounded-lg text-xs font-semibold text-text-primary transition-colors cursor-pointer shrink-0"
            >
              <Archive className="w-3.5 h-3.5" /> Archive
            </button>
          </div>
          <div className="flex items-center justify-between gap-3 pt-3 border-t border-danger/20">
            <div>
              <p className="text-xs font-semibold text-danger">Delete Event</p>
              <p className="text-[10px] text-text-secondary">Permanently remove this event and all associated data.</p>
            </div>
            <button
              onClick={() => { if (confirm(`Permanently delete "${name}"? This cannot be undone.`)) alert('Event deleted.'); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-danger hover:bg-danger/90 rounded-lg text-xs font-semibold text-white transition-colors cursor-pointer shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
