"use client";

import React, { useEffect, useState } from 'react';
import { UserCog } from 'lucide-react';
import { getMe, updateProfile } from '@/lib/api/auth';
import { useAuthStore } from '@/lib/store/authStore';

/**
 * Admin settings.
 *
 * This page previously rendered a "Global Settings" console — database host,
 * read-replica count, fraud-rule toggles, a CPU load figure and a platform
 * status light — none of which existed anywhere in the backend. The Save button
 * only ever raised `alert('Admin settings saved successfully.')`, so an admin
 * could toggle "KYC Document Review" off, be told it saved, and change nothing.
 *
 * What remains is the one thing that is real: the signed-in admin's own profile,
 * read and written through /auth/me and /auth/profile — the same form the
 * organizer and auditor consoles use.
 */
export default function SettingsView() {
  const { set_user_from_api } = useAuthStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [bio, setBio] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      setIsLoading(true);
      try {
        const res = await getMe();
        if (res.success && res.data) {
          setName(res.data.full_name);
          setEmail(res.data.email);
          setPhone(res.data.phone_number || '');
          setLocation(res.data.location || '');
          setBio(res.data.bio || '');
        }
      } catch (err) {
        console.error('Failed to load admin profile settings:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFeedback({ ok: false, message: 'Name is required.' });
      return;
    }
    setIsSaving(true);
    setFeedback(null);
    try {
      const res = await updateProfile({
        full_name: name,
        phone_number: phone,
        location,
        bio,
      });
      if (res.success) {
        const meRes = await getMe();
        if (meRes.success && meRes.data) {
          set_user_from_api(meRes.data);
        }
        setFeedback({ ok: true, message: 'Profile saved.' });
      } else {
        setFeedback({ ok: false, message: res.error?.message || 'Failed to save profile.' });
      }
    } catch (err) {
      console.error('Error saving admin profile:', err);
      setFeedback({ ok: false, message: 'An unexpected error occurred while saving.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 rounded bg-surface-container" />
        <div className="mb-8 h-4 w-96 rounded bg-surface-container" />
        <div className="h-96 max-w-xl rounded-lg border border-border-subtle bg-surface-white p-6" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-normal text-text-primary md:text-4xl">Settings</h1>
        <p className="mt-2 text-sm text-text-secondary">Manage your administrator profile.</p>
      </div>

      <form
        onSubmit={handleSave}
        className="max-w-xl space-y-4 rounded-lg border border-border-subtle bg-surface-white p-6 shadow-sm"
      >
        <h3 className="flex items-center gap-2 border-b border-border-subtle pb-3 text-sm font-bold text-text-primary">
          <UserCog className="h-4 w-4 text-secondary" />
          <span>Administrator Profile</span>
        </h3>

        <div className="space-y-1.5">
          <label className="block text-[10px] font-mono font-bold uppercase tracking-wide text-text-secondary">Full Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-10 w-full rounded-lg border border-border-subtle bg-white px-3 text-sm outline-none focus:border-outline"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-[10px] font-mono font-bold uppercase tracking-wide text-text-secondary">Email (Read Only)</label>
          <input
            type="email"
            value={email}
            disabled
            className="h-10 w-full cursor-not-allowed rounded-lg border border-border-subtle bg-surface-container-low px-3 text-sm text-text-secondary outline-none"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-[10px] font-mono font-bold uppercase tracking-wide text-text-secondary">Phone Number</label>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="h-10 w-full rounded-lg border border-border-subtle bg-white px-3 text-sm outline-none focus:border-outline"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-[10px] font-mono font-bold uppercase tracking-wide text-text-secondary">Office Location</label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Jakarta HQ"
            className="h-10 w-full rounded-lg border border-border-subtle bg-white px-3 text-sm outline-none focus:border-outline"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-[10px] font-mono font-bold uppercase tracking-wide text-text-secondary">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            className="w-full resize-none rounded-lg border border-border-subtle bg-white p-3 text-sm outline-none focus:border-outline"
          />
        </div>

        {feedback && (
          <p className={`text-xs font-semibold ${feedback.ok ? 'text-success' : 'text-danger'}`}>
            {feedback.message}
          </p>
        )}

        <button
          type="submit"
          disabled={isSaving}
          className="rounded-lg bg-primary px-4 py-2.5 text-xs font-bold text-on-primary transition-colors hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}
