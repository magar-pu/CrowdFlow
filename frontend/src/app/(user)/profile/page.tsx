/**
 * app/(user)/profile/page.tsx
 *
 * My Profile page — sesuai Stitch design crowdflow_my_profile_modern_nav.
 * Layout: sidebar kiri (avatar, stats card, quick links) + konten kanan
 * (Personal Information form + Recent Activity timeline).
 */

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Ticket,
  CalendarCheck,
  Bookmark,
  ShoppingBag,
  ChevronRight,
  BadgeCheck,
  Pencil,
  ShieldAlert,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { getMe, updateProfile, logoutAllDevices, UserProfileResponse } from "@/lib/api/auth";
import Modal from "@/components/ui/Modal";
import { useAuthStore } from "@/lib/store/authStore";

// ── Stat card data mapping ──────────────────────────────────────────────────

const STATS = (s: UserProfileResponse["stats"]) => [
  { label: "Total Tickets", value: s.total_tickets, icon: Ticket, color: "text-secondary bg-secondary/10" },
  { label: "Events Attended", value: s.events_attended, icon: CalendarCheck, color: "text-secondary bg-secondary/10" },
  { label: "Saved Events", value: s.saved_events, icon: Bookmark, color: "text-text-secondary bg-surface-container" },
  { label: "Total Orders", value: s.total_orders, icon: ShoppingBag, color: "text-tertiary bg-tertiary/10" },
];

// ── Component ─────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signOutAllOpen, setSignOutAllOpen] = useState(false);
  const [signingOutAll, setSigningOutAll] = useState(false);
  const [signOutAllError, setSignOutAllError] = useState<string | null>(null);
  const router = useRouter();
  const clearSession = useAuthStore((s) => s.clear_session);

  // Revoking every session revokes THIS one too, so there is no "stay here"
  // path afterwards — drop the persisted store and send the user to /login
  // rather than leaving a shell that 401s on its next call.
  async function handleSignOutAll() {
    setSigningOutAll(true);
    setSignOutAllError(null);
    const res = await logoutAllDevices();
    if (!res.success) {
      setSignOutAllError(res.error?.message || "Could not sign out other devices. Try again.");
      setSigningOutAll(false);
      return;
    }
    clearSession();
    router.replace("/login");
  }
  const [editing, set_editing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [form, set_form] = useState({
    full_name: "",
    email: "",
    phone_number: "",
    location: "",
    bio: "",
  });

  useEffect(() => {
    async function loadProfile() {
      try {
        const response = await getMe();
        if (response.success && response.data) {
          setProfile(response.data);
          set_form({
            full_name: response.data.full_name,
            email: response.data.email,
            phone_number: response.data.phone_number,
            location: response.data.location,
            bio: response.data.bio,
          });
        } else {
          setError(response.error?.message || "Failed to load profile");
        }
      } catch (err) {
        setError("An unexpected error occurred while loading profile.");
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  async function handle_save() {
    setSaving(true);
    setSaveSuccess(null);
    setSaveError(null);
    try {
      const res = await updateProfile({
        full_name: form.full_name,
        phone_number: form.phone_number,
        location: form.location,
        bio: form.bio,
      });
      if (res.success) {
        setSaveSuccess("Profile updated successfully!");
        set_editing(false);
        // Reload profile to refresh all bindings
        const response = await getMe();
        if (response.success && response.data) {
          setProfile(response.data);
        }
      } else {
        setSaveError(res.error?.message || "Failed to update profile");
      }
    } catch (err) {
      setSaveError("An unexpected error occurred while saving profile.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar active_href="/" is_authenticated={true} />
        <div className="flex h-[calc(100vh-80px)] w-full items-center justify-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <p className="text-sm font-medium text-text-secondary">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar active_href="/" is_authenticated={true} />
        <div className="mx-auto max-w-container-max px-margin-mobile py-8 md:px-margin-desktop text-center">
          <div className="rounded-lg border border-danger/20 bg-danger/5 px-4 py-3 text-danger inline-block">
            {error || "Profile could not be loaded."}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar active_href="/" is_authenticated={true} />

      <main className="mx-auto max-w-container-max px-margin-mobile py-8 md:px-margin-desktop">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 font-body-sm text-body-sm text-text-secondary">
          <Link href="/" className="hover:text-primary">Home</Link>
          <ChevronRight size={14} />
          <span className="hover:text-primary cursor-default">Account</span>
          <ChevronRight size={14} />
          <span className="text-text-primary font-semibold">Profile</span>
        </nav>

        {/* Page header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-headline-lg text-headline-lg font-bold text-text-primary md:text-[40px] md:leading-[48px]">
              My Profile
            </h1>
            <p className="mt-1 font-body-md text-body-md text-text-secondary">
              Manage your personal information and account settings.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <button
              type="button"
              onClick={() => {
                set_editing((e) => !e);
                setSaveSuccess(null);
                setSaveError(null);
              }}
              className="rounded-lg border border-border-subtle bg-white px-4 py-2 font-label-md text-label-md text-text-primary transition-all hover:bg-surface-container-high"
            >
              {editing ? "Cancel" : "Edit Profile"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
          {/* ── Sidebar ──────────────────────────────────────────────── */}
          <aside className="space-y-4">
            {/* Avatar card */}
            <div className="overflow-hidden rounded-xl border border-border-subtle bg-white shadow-sm">
              {/* Blue-tinted banner */}
              <div className="h-20 bg-gradient-to-br from-secondary/20 to-secondary/5" />
              <div className="-mt-10 flex flex-col items-center px-6 pb-6">
                {profile.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatar_url}
                    alt={profile.full_name}
                    className="h-20 w-20 rounded-full border-4 border-white object-cover shadow-md"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-secondary text-2xl font-bold text-white shadow-md">
                    {profile.full_name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                  </div>
                )}
                <h2 className="mt-3 font-headline-sm text-headline-sm font-bold text-text-primary">
                  {profile.full_name}
                </h2>
                <p className="font-body-sm text-body-sm text-text-secondary">{profile.email}</p>
                <div className="mt-3 flex items-center gap-2">
                  {profile.role === "Event Organizer" && (
                    <span className="flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-0.5 font-label-sm text-label-sm text-success">
                      <BadgeCheck size={12} />
                      Verified Organizer
                    </span>
                  )}
                </div>
                <div className="mt-4 flex w-full items-center justify-between border-t border-border-subtle pt-4">
                  <span className="font-body-sm text-body-sm text-text-secondary">Member Since</span>
                  <span className="font-label-md text-label-md text-text-primary">{profile.member_since}</span>
                </div>
              </div>
            </div>

            {/* Quick links */}
            <div className="overflow-hidden rounded-xl border border-border-subtle bg-white shadow-sm">
              <Link
                href="/orders"
                className="flex items-center justify-between px-4 py-3.5 transition-colors hover:bg-surface-container-low"
              >
                <div className="flex items-center gap-3">
                  <Ticket size={18} className="text-text-secondary" />
                  <span className="font-body-md text-body-md text-text-primary">Purchase History &amp; Tickets</span>
                </div>
                <ChevronRight size={16} className="text-text-secondary" />
              </Link>
            </div>
          </aside>

          {/* ── Main content ─────────────────────────────────────────── */}
          <div className="space-y-6">
            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {STATS(profile.stats).map((stat) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={stat.label}
                    className="rounded-xl border border-border-subtle bg-white p-4 shadow-sm"
                  >
                    <div className={`mb-3 inline-flex rounded-lg p-2 ${stat.color}`}>
                      <Icon size={20} />
                    </div>
                    <p className="font-body-sm text-body-sm text-text-secondary">{stat.label}</p>
                    <p className="mt-0.5 font-headline-md text-headline-md font-bold text-text-primary">
                      {stat.value}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Personal Information */}
            <div className="rounded-xl border border-border-subtle bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-border-subtle px-6 py-4">
                <h3 className="font-headline-sm text-headline-sm font-bold text-text-primary">
                  Personal Information
                </h3>
                {!editing && (
                  <button
                    type="button"
                    onClick={() => {
                      set_editing(true);
                      setSaveSuccess(null);
                      setSaveError(null);
                    }}
                    className="flex items-center gap-1.5 font-label-md text-label-md text-secondary hover:underline"
                  >
                    <Pencil size={14} />
                    Edit
                  </button>
                )}
              </div>
              <div className="p-6">
                {saveError && (
                  <div className="mb-4 rounded-lg border border-danger/20 bg-danger/5 px-4 py-3 font-body-sm text-body-sm text-danger">
                    {saveError}
                  </div>
                )}
                {saveSuccess && (
                  <div className="mb-4 rounded-lg border border-success/20 bg-success/5 px-4 py-3 font-body-sm text-body-sm text-success">
                    {saveSuccess}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* Full Name */}
                  <div className="space-y-1.5">
                    <label className="block font-label-sm text-label-sm uppercase tracking-wider text-text-secondary">
                      Full Name
                    </label>
                    <input
                      type="text"
                      disabled={!editing || saving}
                      value={form.full_name}
                      onChange={(e) => set_form((f) => ({ ...f, full_name: e.target.value }))}
                      className="w-full rounded-lg border border-border-subtle bg-white px-4 py-2.5 font-body-md text-body-md text-text-primary transition-colors focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20 disabled:bg-surface-container-low disabled:text-text-secondary"
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-1.5">
                    <label className="block font-label-sm text-label-sm uppercase tracking-wider text-text-secondary">
                      Email Address
                    </label>
                    <input
                      type="email"
                      disabled={true}
                      value={form.email}
                      className="w-full rounded-lg border border-border-subtle bg-surface-container-low px-4 py-2.5 font-body-md text-body-md text-text-secondary cursor-not-allowed"
                    />
                  </div>

                  {/* Phone */}
                  <div className="space-y-1.5">
                    <label className="block font-label-sm text-label-sm uppercase tracking-wider text-text-secondary">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      disabled={!editing || saving}
                      value={form.phone_number}
                      onChange={(e) => set_form((f) => ({ ...f, phone_number: e.target.value }))}
                      className="w-full rounded-lg border border-border-subtle bg-white px-4 py-2.5 font-body-md text-body-md text-text-primary transition-colors focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20 disabled:bg-surface-container-low disabled:text-text-secondary"
                    />
                  </div>

                  {/* Location */}
                  <div className="space-y-1.5">
                    <label className="block font-label-sm text-label-sm uppercase tracking-wider text-text-secondary">
                      Location
                    </label>
                    <input
                      type="text"
                      disabled={!editing || saving}
                      value={form.location}
                      onChange={(e) => set_form((f) => ({ ...f, location: e.target.value }))}
                      className="w-full rounded-lg border border-border-subtle bg-white px-4 py-2.5 font-body-md text-body-md text-text-primary transition-colors focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20 disabled:bg-surface-container-low disabled:text-text-secondary"
                    />
                  </div>

                  {/* Bio — full width */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="block font-label-sm text-label-sm uppercase tracking-wider text-text-secondary">
                      Bio
                    </label>
                    <textarea
                      rows={3}
                      disabled={!editing || saving}
                      value={form.bio}
                      onChange={(e) => set_form((f) => ({ ...f, bio: e.target.value }))}
                      className="w-full resize-none rounded-lg border border-border-subtle bg-white px-4 py-2.5 font-body-md text-body-md text-text-primary transition-colors focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20 disabled:bg-surface-container-low disabled:text-text-secondary"
                    />
                  </div>
                </div>

                {editing && (
                  <div className="mt-6 flex items-center justify-end gap-3 border-t border-border-subtle pt-4">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => {
                        set_editing(false);
                        setSaveSuccess(null);
                        setSaveError(null);
                      }}
                      className="rounded-lg border border-border-subtle px-4 py-2 font-label-md text-label-md text-text-secondary transition-all hover:bg-surface-container-high disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={handle_save}
                      className="rounded-lg bg-secondary px-6 py-2 font-label-md text-label-md text-white transition-all hover:brightness-110 disabled:opacity-50"
                    >
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* My Events */}
            <div className="rounded-xl border border-border-subtle bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-border-subtle px-6 py-4">
                <h3 className="font-headline-sm text-headline-sm font-bold text-text-primary">
                  My Events
                </h3>
              </div>
              <div className="divide-y divide-border-subtle">
                {profile.events && profile.events.length > 0 ? (
                  profile.events.map((evt) => (
                    <div key={evt.event_id} className="flex items-start gap-4 px-6 py-4">
                      {evt.cover_image_url ? (
                        <img
                          src={evt.cover_image_url}
                          alt={evt.title}
                          className="h-16 w-24 rounded-lg object-cover border border-border-subtle"
                        />
                      ) : (
                        <div className="flex h-16 w-24 items-center justify-center rounded-lg bg-surface-container text-text-secondary text-xs">
                          No Image
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-label-md text-label-md text-text-primary truncate">{evt.title}</h4>
                        <p className="mt-1 font-body-sm text-body-sm text-text-secondary">
                          {new Date(evt.starts_at).toLocaleDateString("en-US", {
                            weekday: "short",
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-label-sm text-label-sm ${
                            evt.status === "published"
                              ? "bg-success/10 text-success"
                              : evt.status === "draft"
                              ? "bg-surface-container-high text-text-secondary"
                              : "bg-secondary/10 text-secondary"
                          }`}>
                            {evt.status.toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <Link
                        href={`/events/${evt.event_id}`}
                        className="shrink-0 rounded-lg border border-border-subtle px-3 py-1.5 font-label-sm text-label-sm text-text-primary hover:bg-surface-container-high transition-colors"
                      >
                        View Details
                      </Link>
                    </div>
                  ))
                ) : (
                  <div className="px-6 py-8 text-center text-text-secondary font-body-md">
                    No associated events found.
                  </div>
                )}
              </div>
            </div>

            {/* Security */}
            <div className="rounded-xl border border-border-subtle bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-border-subtle px-6 py-4">
                <h3 className="font-headline-sm text-headline-sm font-bold text-text-primary">
                  Security
                </h3>
              </div>
              <div className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <h4 className="font-label-md text-label-md text-text-primary">
                    Sign out of all devices
                  </h4>
                  <p className="mt-1 font-body-sm text-body-sm text-text-secondary">
                    Ends every signed-in session, including this one. Use this if you
                    signed in on a shared computer or think someone else has access.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSignOutAllError(null);
                    setSignOutAllOpen(true);
                  }}
                  className="shrink-0 rounded-lg border border-error/30 px-4 py-2 font-label-sm text-label-sm text-error transition-colors hover:bg-error/5"
                >
                  Sign out everywhere
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Modal
        open={signOutAllOpen}
        onClose={signingOutAll ? undefined : () => setSignOutAllOpen(false)}
        size="sm"
        icon={<ShieldAlert className="h-6 w-6 text-error" />}
        title="Sign out of all devices?"
        description="Every device signed in to this account will be signed out, including the one you are using now. You will need to log in again."
      >
        {signOutAllError && (
          <p className="mb-4 rounded-lg bg-error/10 px-3 py-2 font-body-sm text-body-sm text-error">
            {signOutAllError}
          </p>
        )}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => setSignOutAllOpen(false)}
            disabled={signingOutAll}
            className="rounded-lg border border-border-subtle px-4 py-2 font-label-sm text-label-sm text-text-primary transition-colors hover:bg-surface-container-high disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSignOutAll}
            disabled={signingOutAll}
            className="rounded-lg bg-error px-4 py-2 font-label-sm text-label-sm text-white transition-colors hover:bg-error/90 disabled:opacity-50"
          >
            {signingOutAll ? "Signing out..." : "Sign out everywhere"}
          </button>
        </div>
      </Modal>
    </div>
  );
}