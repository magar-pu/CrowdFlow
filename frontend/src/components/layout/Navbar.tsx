/**
 * components/layout/Navbar.tsx
 *
 * Top navigation bar shared across all public-facing pages
 * (Home, Event Discovery, Event Detail, Checkout, etc).
 * Matches secure_checkout / crowdflow_home Stitch markup 1:1 on desktop.
 *
 * MOBILE FIX: the original version always rendered "Sign In" / "Sign Up"
 * regardless of viewport width, which collided with the CrowdFlow
 * wordmark below ~400px. Below md, nav links + auth actions now collapse
 * into a hamburger-triggered dropdown instead of squeezing into the bar.
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Bell,
  Ticket,
  LayoutDashboard,
  UserCircle,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Events", href: "/events" },
  { label: "Categories", href: "/categories" },
  { label: "Resale Marketplace", href: "/resale" },
  { label: "Business", href: "/business" },
];

interface NavbarProps {
  /** Pass true once auth state is wired up — swaps Sign In/Up for the icon cluster. */
  is_authenticated?: boolean;
  active_href?: string;
}

export function Navbar({
  is_authenticated = false,
  active_href = "/",
}: NavbarProps) {
  const [mobile_menu_open, set_mobile_menu_open] = useState(false);

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border-subtle bg-surface/80 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-container-max items-center justify-between px-margin-mobile py-4 md:px-margin-desktop">
        <div className="flex items-center gap-gutter">
          <Link
            href="/"
            className="font-headline-md text-headline-md font-bold tracking-tight text-primary"
          >
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

        {/* Desktop actions */}
        <div className="hidden items-center gap-4 md:flex">
          {is_authenticated ? (
            <div className="flex items-center gap-2 text-text-secondary">
              <button
                type="button"
                aria-label="Notifications"
                className="rounded-full p-2 transition-colors hover:bg-surface-container-high"
              >
                <Bell size={20} />
              </button>
              <button
                type="button"
                aria-label="My tickets"
                className="rounded-full p-2 transition-colors hover:bg-surface-container-high"
              >
                <Ticket size={20} />
              </button>
              <button
                type="button"
                aria-label="Dashboard"
                className="rounded-full p-2 transition-colors hover:bg-surface-container-high"
              >
                <LayoutDashboard size={20} />
              </button>
              <button
                type="button"
                aria-label="Account"
                className="rounded-full p-2 transition-colors hover:bg-surface-container-high"
              >
                <UserCircle size={20} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="font-label-md text-label-md text-text-secondary transition-colors hover:text-primary"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-primary px-4 py-2 font-label-md text-label-md text-on-primary transition-all hover:bg-primary/90"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>

        {/* Mobile hamburger trigger */}
        <button
          type="button"
          aria-label={mobile_menu_open ? "Close menu" : "Open menu"}
          onClick={() => set_mobile_menu_open((open) => !open)}
          className="flex items-center justify-center rounded-lg p-2 text-primary md:hidden"
        >
          {mobile_menu_open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile dropdown panel */}
      {mobile_menu_open && (
        <div className="border-t border-border-subtle bg-surface-white px-margin-mobile py-4 md:hidden">
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => set_mobile_menu_open(false)}
                className={cn(
                  "rounded-lg px-3 py-2.5 font-label-md text-label-md transition-colors",
                  active_href === link.href
                    ? "bg-surface-container-high font-semibold text-primary"
                    : "text-text-secondary hover:bg-surface-container-high hover:text-primary"
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="mt-4 border-t border-border-subtle pt-4">
            {is_authenticated ? (
              <div className="flex items-center justify-around text-text-secondary">
                <button
                  type="button"
                  aria-label="Notifications"
                  className="rounded-full p-2 transition-colors hover:bg-surface-container-high"
                >
                  <Bell size={20} />
                </button>
                <button
                  type="button"
                  aria-label="My tickets"
                  className="rounded-full p-2 transition-colors hover:bg-surface-container-high"
                >
                  <Ticket size={20} />
                </button>
                <button
                  type="button"
                  aria-label="Dashboard"
                  className="rounded-full p-2 transition-colors hover:bg-surface-container-high"
                >
                  <LayoutDashboard size={20} />
                </button>
                <button
                  type="button"
                  aria-label="Account"
                  className="rounded-full p-2 transition-colors hover:bg-surface-container-high"
                >
                  <UserCircle size={20} />
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Link
                  href="/login"
                  onClick={() => set_mobile_menu_open(false)}
                  className="rounded-lg px-3 py-2.5 text-center font-label-md text-label-md text-text-secondary hover:bg-surface-container-high"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  onClick={() => set_mobile_menu_open(false)}
                  className="rounded-lg bg-primary px-3 py-2.5 text-center font-label-md text-label-md text-on-primary hover:bg-primary/90"
                >
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