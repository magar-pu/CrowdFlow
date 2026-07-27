import React, { useState, useEffect } from 'react';
import { UserCog } from 'lucide-react';
import { getMe, updateProfile } from '@/lib/api/auth';
import { useAuthStore } from '@/lib/store/authStore';

export default function SettingsView() {
  const { set_user_from_api } = useAuthStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

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
        <div className="max-w-xl">
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
        <p className="text-sm text-text-secondary">Manage your auditor profile.</p>
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

      </div>
    </div>
  );
}
