/**
 * components/layout/Navbar.tsx
 *
 * Navbar — sekarang baca auth state dari Zustand authStore,
 * bukan dari prop is_authenticated.
 * Prop is_authenticated tetap ada untuk backward compatibility (override).
 */

"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  Ticket,
  Menu,
  X,
  ChevronDown,
  UserCircle,
  CreditCard,
  ClockIcon,
  RefreshCw,
  BellRing,
  Users,
  Mail,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/store/authStore";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Events", href: "/events" },
  { label: "Categories", href: "/categories" },
  { label: "Resale Marketplace", href: "/resale" },
  { label: "Business", href: "/business" },
];

const PROFILE_MENU = [
  { label: "My Profile", href: "/profile", icon: UserCircle },
  { label: "Payments", href: "/profile/payments", icon: CreditCard },
  { label: "Purchase History", href: "/profile/history", icon: ClockIcon },
  { label: "My Tickets", href: "/orders", icon: Ticket },
  { label: "Resale", href: "/resale/my-listings", icon: RefreshCw, badge: "BARU!" },
  { label: "Price Alerts", href: "/profile/alerts", icon: BellRing },
  { label: "Saved Travelers", href: "/profile/travelers", icon: Users },
  { label: "Promo Info", href: "/profile/promo", icon: Mail },
];

interface NavbarProps {
  active_href?: string;
  /** Override auth state — opsional, defaultnya baca dari Zustand store */
  is_authenticated?: boolean;
}

export function Navbar({ active_href = "/", is_authenticated: override }: NavbarProps) {
  const router = useRouter();
  const { user, is_authenticated, logout } = useAuthStore();
  const [mobile_menu_open, set_mobile_menu_open] = useState(false);
  const [profile_open, set_profile_open] = useState(false);
  const dropdown_ref = useRef<HTMLDivElement>(null);

  // Gunakan override kalau ada, fallback ke store
  const auth = override !== undefined ? override : is_authenticated;
  const display_user = user ?? {
    full_name: "User",
    email: "",
    role: "user" as const,
    avatar_url: "",
  };

  useEffect(() => {
    function handle_outside(e: MouseEvent) {
      if (dropdown_ref.current && !dropdown_ref.current.contains(e.target as Node)) {
        set_profile_open(false);
      }
    }
    document.addEventListener("mousedown", handle_outside);
    return () => document.removeEventListener("mousedown", handle_outside);
  }, []);

  function handle_logout() {
    logout();
    set_profile_open(false);
    router.push("/");
  }

  const initials = display_user.full_name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border-subtle bg-surface/80 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-container-max items-center justify-between px-margin-mobile py-4 md:px-margin-desktop">

        {/* Logo + Nav */}
        <div className="flex items-center gap-gutter">
          <Link href="/" className="font-headline-md text-headline-md font-bold tracking-tight text-primary">
            CrowdFlow
          </Link>
          <div className="ml-8 hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-lg px-3 py-2 font-label-md text-label-md transition-all duration-200 hover:bg-surface-container-high",
                  active_href === link.href
                    ? "font-semibold text-primary"
                    : "text-text-secondary hover:text-primary"
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Desktop Right */}
        <div className="hidden items-center gap-3 md:flex">
          {auth ? (
            <>
              <button type="button" aria-label="Notifications"
                className="rounded-full p-2 text-text-secondary transition-colors hover:bg-surface-container-high">
                <Bell size={20} />
              </button>
              <Link href="/orders" aria-label="My Tickets"
                className="rounded-full p-2 text-text-secondary transition-colors hover:bg-surface-container-high">
                <Ticket size={20} />
              </Link>

              {/* Profile dropdown */}
              <div className="relative" ref={dropdown_ref}>
                <button
                  type="button"
                  onClick={() => set_profile_open((o) => !o)}
                  className="flex items-center gap-2 rounded-xl px-3 py-1.5 transition-colors hover:bg-surface-container-high"
                >
                  {display_user.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={display_user.avatar_url} alt={display_user.full_name}
                      className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs font-bold text-white">
                      {initials}
                    </div>
                  )}
                  <span className="max-w-[100px] truncate font-label-md text-label-md text-text-primary">
                    {display_user.full_name.split(" ")[0]}
                  </span>
                  <ChevronDown size={16} className={cn(
                    "text-text-secondary transition-transform duration-200",
                    profile_open && "rotate-180"
                  )} />
                </button>

                {profile_open && (
                  <div className="absolute right-0 top-full mt-2 w-64 overflow-hidden rounded-xl border border-border-subtle bg-white shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
                    {/* Header */}
                    <div className="bg-primary px-4 py-4">
                      <div className="mb-3 flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-sm font-bold text-white ring-2 ring-white/20">
                          {initials}
                        </div>
                        {display_user.role === "verified_organizer" && (
                          <span className="rounded-full bg-warning/20 px-2.5 py-0.5 text-xs font-semibold text-warning">
                            ● Verified Organizer
                          </span>
                        )}
                      </div>
                      <p className="font-headline-sm text-headline-sm font-bold text-white">
                        {display_user.full_name}
                      </p>
                      <p className="font-body-sm text-body-sm text-white/60">
                        {display_user.email}
                      </p>
                    </div>

                    {/* Menu */}
                    <div className="py-2">
                      {PROFILE_MENU.map((item) => {
                        const Icon = item.icon;
                        return (
                          <Link key={item.href} href={item.href}
                            onClick={() => set_profile_open(false)}
                            className="flex items-center justify-between px-4 py-2.5 transition-colors hover:bg-surface-container-low">
                            <div className="flex items-center gap-3">
                              <Icon size={18} className="text-text-secondary" />
                              <span className="font-body-md text-body-md text-text-primary">{item.label}</span>
                            </div>
                            {item.badge && (
                              <span className="rounded-full bg-secondary/10 px-2 py-0.5 text-[10px] font-bold text-secondary">
                                {item.badge}
                              </span>
                            )}
                          </Link>
                        );
                      })}
                      <div className="my-2 border-t border-border-subtle" />
                      <button type="button" onClick={handle_logout}
                        className="flex w-full items-center gap-3 px-4 py-2.5 transition-colors hover:bg-surface-container-low">
                        <LogOut size={18} className="text-danger" />
                        <span className="font-body-md text-body-md text-danger">Log Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <Link href="/login"
                className="font-label-md text-label-md text-text-secondary transition-colors hover:text-primary">
                Sign In
              </Link>
              <Link href="/register"
                className="rounded-lg bg-primary px-4 py-2 font-label-md text-label-md text-on-primary transition-all hover:bg-primary/90">
                Sign Up
              </Link>
            </div>
          )}
        </div>

        {/* Mobile hamburger */}
        <button type="button"
          aria-label={mobile_menu_open ? "Close menu" : "Open menu"}
          onClick={() => set_mobile_menu_open((o) => !o)}
          className="flex items-center justify-center rounded-lg p-2 text-primary md:hidden">
          {mobile_menu_open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile panel */}
      {mobile_menu_open && (
        <div className="border-t border-border-subtle bg-surface-white px-margin-mobile py-4 md:hidden">
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href}
                onClick={() => set_mobile_menu_open(false)}
                className={cn(
                  "rounded-lg px-3 py-2.5 font-label-md text-label-md transition-colors",
                  active_href === link.href
                    ? "bg-surface-container-high font-semibold text-primary"
                    : "text-text-secondary hover:bg-surface-container-high hover:text-primary"
                )}>
                {link.label}
              </Link>
            ))}
          </div>

          <div className="mt-4 border-t border-border-subtle pt-4">
            {auth ? (
              <div className="flex flex-col gap-1">
                <div className="mb-2 flex items-center gap-3 rounded-xl bg-surface-container-low px-3 py-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-sm font-bold text-white">
                    {initials}
                  </div>
                  <div>
                    <p className="font-label-md text-label-md text-text-primary">{display_user.full_name}</p>
                    <p className="font-label-sm text-label-sm text-text-secondary">{display_user.email}</p>
                  </div>
                </div>
                {PROFILE_MENU.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link key={item.href} href={item.href}
                      onClick={() => set_mobile_menu_open(false)}
                      className="flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors hover:bg-surface-container-high">
                      <div className="flex items-center gap-3">
                        <Icon size={18} className="text-text-secondary" />
                        <span className="font-label-md text-label-md text-text-primary">{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className="rounded-full bg-secondary/10 px-2 py-0.5 text-[10px] font-bold text-secondary">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
                <div className="my-1 border-t border-border-subtle" />
                <button type="button" onClick={handle_logout}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-surface-container-high">
                  <LogOut size={18} className="text-danger" />
                  <span className="font-label-md text-label-md text-danger">Log Out</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Link href="/login" onClick={() => set_mobile_menu_open(false)}
                  className="rounded-lg px-3 py-2.5 text-center font-label-md text-label-md text-text-secondary hover:bg-surface-container-high">
                  Sign In
                </Link>
                <Link href="/register" onClick={() => set_mobile_menu_open(false)}
                  className="rounded-lg bg-primary px-3 py-2.5 text-center font-label-md text-label-md text-on-primary hover:bg-primary/90">
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}