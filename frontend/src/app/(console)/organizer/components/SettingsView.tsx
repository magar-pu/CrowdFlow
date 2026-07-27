import React, { useState, useEffect } from 'react';
import { User } from 'lucide-react';
import { getMe, updateProfile } from '@/lib/api/auth';
import { useAuthStore } from '@/lib/store/authStore';
import PayoutDetailsCard from './PayoutDetailsCard';

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
        console.error("Failed to load organizer profile settings:", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadProfile();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("Administrator Name is required.");
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
      console.error("Error saving organizer profile:", err);
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
        <div className="bg-white h-80 border border-border-subtle rounded-xl p-6 shadow-sm max-w-xl"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">Portal Settings</h1>
        <p className="text-sm text-text-secondary">Configure your organizer credentials and system properties.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handleSaveProfile} className="bg-white border border-border-subtle rounded-xl p-6 soft-shadow space-y-6">
            <h3 className="text-sm font-bold text-text-primary border-b border-border-subtle pb-3 flex items-center gap-2">
              <User className="w-4 h-4 text-secondary" />
              Profile Configuration
            </h3>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono font-bold text-text-secondary uppercase">Administrator Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-10 px-3 border border-border-subtle rounded-lg text-xs bg-white focus:border-outline outline-none"
                  placeholder="e.g. Richie Obhasa"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono font-bold text-text-secondary uppercase">Email Address (Read Only)</label>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full h-10 px-3 border border-border-subtle rounded-lg text-xs bg-surface-container-low text-text-secondary outline-none cursor-not-allowed"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono font-bold text-text-secondary uppercase">Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full h-10 px-3 border border-border-subtle rounded-lg text-xs bg-white focus:border-outline outline-none"
                  placeholder="e.g. 08123456789"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono font-bold text-text-secondary uppercase">Company Location</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full h-10 px-3 border border-border-subtle rounded-lg text-xs bg-white focus:border-outline outline-none"
                  placeholder="e.g. Jakarta, Indonesia"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono font-bold text-text-secondary uppercase">Business Biography</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  className="w-full p-3 border border-border-subtle rounded-lg text-xs bg-white focus:border-outline outline-none resize-none font-sans"
                  placeholder="Tell us about your event organizing business..."
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="bg-primary hover:bg-primary/90 disabled:opacity-50 text-white text-xs font-bold px-4 py-2.5 rounded-lg transition-colors cursor-pointer"
            >
              {isSaving ? "Saving changes..." : "Save Configuration"}
            </button>
          </form>
        </div>

        <div className="lg:col-span-5 space-y-6">
          {/* Replaces a panel that told organizers to email compliance@ to
              change their bank details. There was no such flow — the details
              were simply unreachable after approval, which is why payout
              records had no account to pay into. */}
          <PayoutDetailsCard />
        </div>
      </div>
    </div>
  );
}
