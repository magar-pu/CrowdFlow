/**
 * app/(user)/profile/page.tsx
 *
 * My Profile page — sesuai Stitch design crowdflow_my_profile_modern_nav.
 * Layout: sidebar kiri (avatar, stats card, quick links) + konten kanan
 * (Personal Information form + Recent Activity timeline).
 * Semua data dari mock — siap swap ke GET /api/v1/me nanti.
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Ticket,
  CalendarCheck,
  Bookmark,
  ShoppingBag,
  CreditCard,
  Bell,
  LogOut,
  ChevronRight,
  BadgeCheck,
  Pencil,
  Settings,
} from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";

// ── Mock data (ganti dengan real auth context + API call nanti) ──────────

interface UserProfile {
  user_id: string;
  full_name: string;
  email: string;
  phone_number: string;
  location: string;
  bio: string;
  avatar_url: string;
  role: "user" | "verified_organizer";
  tier: "Free" | "Pro Tier" | "Enterprise";
  member_since: string; // e.g. "October 2023"
  stats: {
    total_tickets: number;
    events_attended: number;
    saved_events: number;
    total_orders: number;
  };
}

interface ActivityItem {
  activity_id: string;
  type: "ticket_purchased" | "event_saved" | "profile_updated";
  title: string;
  description: string;
  tag_label?: string;
  tag_href?: string;
  time_label: string;
}

const MOCK_USER: UserProfile = {
  user_id: "usr_001",
  full_name: "Richie Obhasa",
  email: "richie@gmail.com",
  phone_number: "+62 812-3456-7890",
  location: "Jakarta, Indonesia",
  bio: "Live music enthusiast and frequent conference attendee. Always looking for the next big tech summit or indie rock concert.",
  avatar_url: "",
  role: "verified_organizer",
  tier: "Pro Tier",
  member_since: "October 2023",
  stats: {
    total_tickets: 42,
    events_attended: 18,
    saved_events: 7,
    total_orders: 24,
  },
};

const MOCK_ACTIVITY: ActivityItem[] = [
  {
    activity_id: "act_001",
    type: "ticket_purchased",
    title: "Ticket Purchased",
    description: 'Purchased 2 VIP tickets for "Global Tech Summit 2024".',
    tag_label: "Order #ORD-89241",
    tag_href: "/orders/ORD-89241",
    time_label: "2 hours ago",
  },
  {
    activity_id: "act_002",
    type: "event_saved",
    title: "Event Saved",
    description: 'Added "Neon Lights Festival" to your saved events list.',
    time_label: "Yesterday",
  },
  {
    activity_id: "act_003",
    type: "profile_updated",
    title: "Profile Updated",
    description: "Successfully updated phone number and billing address.",
    time_label: "Oct 12, 2023",
  },
];

// ── Stat card data ────────────────────────────────────────────────────────

const STATS = (s: UserProfile["stats"]) => [
  { label: "Total Tickets", value: s.total_tickets, icon: Ticket, color: "text-secondary bg-secondary/10" },
  { label: "Events Attended", value: s.events_attended, icon: CalendarCheck, color: "text-secondary bg-secondary/10" },
  { label: "Saved Events", value: s.saved_events, icon: Bookmark, color: "text-text-secondary bg-surface-container" },
  { label: "Total Orders", value: s.total_orders, icon: ShoppingBag, color: "text-tertiary bg-tertiary/10" },
];

// ── Component ─────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const user = MOCK_USER;
  const [form, set_form] = useState({
    full_name: user.full_name,
    email: user.email,
    phone_number: user.phone_number,
    location: user.location,
    bio: user.bio,
  });
  const [editing, set_editing] = useState(false);

  function handle_save() {
    // TODO: PUT /api/v1/me
    set_editing(false);
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
              onClick={() => set_editing((e) => !e)}
              className="rounded-lg border border-border-subtle bg-white px-4 py-2 font-label-md text-label-md text-text-primary transition-all hover:bg-surface-container-high"
            >
              {editing ? "Cancel" : "Edit Profile"}
            </button>
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-label-md text-label-md text-white transition-all hover:bg-primary/90"
            >
              <Settings size={16} />
              Account Settings
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
                {user.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.avatar_url}
                    alt={user.full_name}
                    className="h-20 w-20 rounded-full border-4 border-white object-cover shadow-md"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-secondary text-2xl font-bold text-white shadow-md">
                    {user.full_name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                  </div>
                )}
                <h2 className="mt-3 font-headline-sm text-headline-sm font-bold text-text-primary">
                  {user.full_name}
                </h2>
                <p className="font-body-sm text-body-sm text-text-secondary">{user.email}</p>
                <div className="mt-3 flex items-center gap-2">
                  {user.role === "verified_organizer" && (
                    <span className="flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-0.5 font-label-sm text-label-sm text-success">
                      <BadgeCheck size={12} />
                      Verified Organizer
                    </span>
                  )}
                  <span className="rounded-full bg-secondary/10 px-2.5 py-0.5 font-label-sm text-label-sm text-secondary">
                    {user.tier}
                  </span>
                </div>
                <div className="mt-4 flex w-full items-center justify-between border-t border-border-subtle pt-4">
                  <span className="font-body-sm text-body-sm text-text-secondary">Member Since</span>
                  <span className="font-label-md text-label-md text-text-primary">{user.member_since}</span>
                </div>
              </div>
            </div>

            {/* Quick links */}
            <div className="overflow-hidden rounded-xl border border-border-subtle bg-white shadow-sm">
              <Link
                href="/profile/payments"
                className="flex items-center justify-between px-4 py-3.5 transition-colors hover:bg-surface-container-low"
              >
                <div className="flex items-center gap-3">
                  <CreditCard size={18} className="text-text-secondary" />
                  <span className="font-body-md text-body-md text-text-primary">Payment Methods</span>
                </div>
                <ChevronRight size={16} className="text-text-secondary" />
              </Link>
              <div className="border-t border-border-subtle" />
              <Link
                href="/profile/notifications"
                className="flex items-center justify-between px-4 py-3.5 transition-colors hover:bg-surface-container-low"
              >
                <div className="flex items-center gap-3">
                  <Bell size={18} className="text-text-secondary" />
                  <span className="font-body-md text-body-md text-text-primary">Notification Preferences</span>
                </div>
                <ChevronRight size={16} className="text-text-secondary" />
              </Link>
              <div className="border-t border-border-subtle" />
              <button
                type="button"
                className="flex w-full items-center gap-3 px-4 py-3.5 transition-colors hover:bg-surface-container-low"
              >
                <LogOut size={18} className="text-danger" />
                <span className="font-body-md text-body-md text-danger">Sign Out</span>
              </button>
            </div>
          </aside>

          {/* ── Main content ─────────────────────────────────────────── */}
          <div className="space-y-6">
            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {STATS(user.stats).map((stat) => {
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
                    onClick={() => set_editing(true)}
                    className="flex items-center gap-1.5 font-label-md text-label-md text-secondary hover:underline"
                  >
                    <Pencil size={14} />
                    Edit
                  </button>
                )}
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* Full Name */}
                  <div className="space-y-1.5">
                    <label className="block font-label-sm text-label-sm uppercase tracking-wider text-text-secondary">
                      Full Name
                    </label>
                    <input
                      type="text"
                      disabled={!editing}
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
                      disabled={!editing}
                      value={form.email}
                      onChange={(e) => set_form((f) => ({ ...f, email: e.target.value }))}
                      className="w-full rounded-lg border border-border-subtle bg-white px-4 py-2.5 font-body-md text-body-md text-text-primary transition-colors focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20 disabled:bg-surface-container-low disabled:text-text-secondary"
                    />
                  </div>

                  {/* Phone */}
                  <div className="space-y-1.5">
                    <label className="block font-label-sm text-label-sm uppercase tracking-wider text-text-secondary">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      disabled={!editing}
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
                      disabled={!editing}
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
                      disabled={!editing}
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
                      onClick={() => set_editing(false)}
                      className="rounded-lg border border-border-subtle px-4 py-2 font-label-md text-label-md text-text-secondary transition-all hover:bg-surface-container-high"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handle_save}
                      className="rounded-lg bg-secondary px-6 py-2 font-label-md text-label-md text-white transition-all hover:brightness-110"
                    >
                      Save Changes
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="rounded-xl border border-border-subtle bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-border-subtle px-6 py-4">
                <h3 className="font-headline-sm text-headline-sm font-bold text-text-primary">
                  Recent Activity
                </h3>
                <Link
                  href="/profile/activity"
                  className="font-label-md text-label-md text-secondary hover:underline"
                >
                  View All
                </Link>
              </div>
              <div className="divide-y divide-border-subtle">
                {MOCK_ACTIVITY.map((item) => (
                  <div key={item.activity_id} className="flex items-start gap-4 px-6 py-4">
                    {/* Timeline dot */}
                    <div className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center">
                      <div
                        className={`h-3 w-3 rounded-full border-2 ${
                          item.type === "ticket_purchased"
                            ? "border-secondary bg-white"
                            : "border-border-subtle bg-white"
                        }`}
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-label-md text-label-md text-text-primary">{item.title}</p>
                        <span className="shrink-0 font-label-sm text-label-sm text-text-secondary">
                          {item.time_label}
                        </span>
                      </div>
                      <p className="font-body-sm text-body-sm text-text-secondary">{item.description}</p>
                      {item.tag_label && item.tag_href && (
                        <Link
                          href={item.tag_href}
                          className="mt-1 inline-flex items-center gap-1.5 rounded-lg border border-border-subtle bg-surface-container-low px-2.5 py-1 font-label-sm text-label-sm text-text-secondary transition-colors hover:border-secondary hover:text-secondary"
                        >
                          <Ticket size={12} />
                          {item.tag_label}
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}