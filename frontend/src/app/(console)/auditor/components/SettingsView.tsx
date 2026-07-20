import React, { useState, useEffect } from 'react';
import { UserCog, BellRing, ClipboardList } from 'lucide-react';
import { getMe, updateProfile } from '@/lib/api/auth';
import { useAuthStore } from '@/lib/store/authStore';

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

export default function SettingsView() {
  const { set_user_from_api } = useAuthStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [notifyNewSubmission, setNotifyNewSubmission] = useState(true);
  const [notifyDocumentUpload, setNotifyDocumentUpload] = useState(true);
  const [notifyEscalation, setNotifyEscalation] = useState(true);
  const [dailyDigest, setDailyDigest] = useState(false);

  const [autoAssign, setAutoAssign] = useState(true);
  const [maxQueueSize, setMaxQueueSize] = useState(15);
  const [focusCategory, setFocusCategory] = useState('All Categories');

  useEffect(() => {
    const loadProfile = async () => {
      setIsLoading(true);
      try {
        const res = await getMe();
        if (res.success && res.data) {
          setName(res.data.full_name);
          setEmail(res.data.email);
          setPhone(res.data.phone_number || '');
          setBio(res.data.bio || '');
          setLocation(res.data.location || '');
        }
      } catch (err) {
        console.error("Failed to load profile settings:", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadProfile();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("Name is required.");
      return;
    }
    setIsSaving(true);
    try {
      const updateRes = await updateProfile({
        full_name: name,
        phone_number: phone,
        location: location,
        bio: bio
      });
      if (updateRes.success) {
        // Sync profile changes to auth store
        const meRes = await getMe();
        if (meRes.success && meRes.data) {
          set_user_from_api(meRes.data);
        }
        alert('Profile settings saved successfully.');
      } else {
        alert(`Failed to save settings: ${updateRes.error?.message || "Internal error"}`);
      }
    } catch (err) {
      console.error("Error saving profile:", err);
      alert("An unexpected error occurred while saving.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 text-left animate-pulse">
        <div className="h-8 w-48 bg-surface-container rounded"></div>
        <div className="h-4 w-96 bg-surface-container rounded mb-8"></div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white h-64 border border-border-subtle rounded-xl p-5 shadow-sm"></div>
          <div className="bg-white h-64 border border-border-subtle rounded-xl p-5 shadow-sm"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">Settings</h1>
        <p className="text-sm text-text-secondary">Manage your auditor profile, notifications, and review preferences.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form onSubmit={handleSaveProfile} className="bg-white border border-border-subtle rounded-xl p-5 shadow-sm space-y-4">
          <h4 className="text-sm font-bold text-text-primary flex items-center gap-2">
            <UserCog className="w-4 h-4 text-secondary" /> Auditor Profile
          </h4>
          <div className="space-y-1">
            <label className="text-[9px] font-mono font-bold text-text-secondary uppercase">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-9 px-3 border border-border-subtle rounded-lg text-xs bg-white outline-none focus:border-outline"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-mono font-bold text-text-secondary uppercase">Email (Read Only)</label>
            <input
              type="email"
              value={email}
              disabled
              className="w-full h-9 px-3 border border-border-subtle rounded-lg text-xs bg-surface-container-low text-text-secondary outline-none cursor-not-allowed"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-mono font-bold text-text-secondary uppercase">Phone Number</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full h-9 px-3 border border-border-subtle rounded-lg text-xs bg-white outline-none focus:border-outline"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-mono font-bold text-text-secondary uppercase">Office Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full h-9 px-3 border border-border-subtle rounded-lg text-xs bg-white outline-none focus:border-outline"
              placeholder="e.g. Jakarta HQ"
            />
          </div>
          <button
            type="submit"
            disabled={isSaving}
            className="bg-primary hover:bg-primary/90 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors cursor-pointer"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </form>

        <div className="bg-white border border-border-subtle rounded-xl p-5 shadow-sm space-y-4">
          <h4 className="text-sm font-bold text-text-primary flex items-center gap-2">
            <BellRing className="w-4 h-4 text-secondary" /> Notification Preferences
          </h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-text-primary">New Submission Alerts</span>
              <Toggle checked={notifyNewSubmission} onChange={setNotifyNewSubmission} />
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-border-subtle">
              <span className="text-xs font-medium text-text-primary">Document Upload Alerts</span>
              <Toggle checked={notifyDocumentUpload} onChange={setNotifyDocumentUpload} />
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-border-subtle">
              <span className="text-xs font-medium text-text-primary">Escalation Alerts</span>
              <Toggle checked={notifyEscalation} onChange={setNotifyEscalation} />
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-border-subtle">
              <span className="text-xs font-medium text-text-primary">Daily Digest Email</span>
              <Toggle checked={dailyDigest} onChange={setDailyDigest} />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-border-subtle rounded-xl p-5 shadow-sm space-y-4 max-w-2xl">
        <h4 className="text-sm font-bold text-text-primary flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-secondary" /> Review Assignment
        </h4>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-text-primary">Auto-assign New Submissions</p>
            <p className="text-[10px] text-text-secondary">Automatically route incoming submissions into your queue.</p>
          </div>
          <Toggle checked={autoAssign} onChange={setAutoAssign} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-border-subtle">
          <div className="space-y-1">
            <label className="text-[9px] font-mono font-bold text-text-secondary uppercase">Max Queue Size</label>
            <input type="number" value={maxQueueSize} onChange={(e) => setMaxQueueSize(Number(e.target.value))} className="w-full h-9 px-3 border border-border-subtle rounded-lg text-xs bg-white outline-none focus:border-outline" />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-mono font-bold text-text-secondary uppercase">Focus Category</label>
            <select value={focusCategory} onChange={(e) => setFocusCategory(e.target.value)} className="w-full h-9 px-3 border border-border-subtle rounded-lg text-xs bg-white outline-none cursor-pointer focus:border-outline">
              <option>All Categories</option>
              <option>Conference</option>
              <option>Festival</option>
              <option>Workshop</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
