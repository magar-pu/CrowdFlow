/**
 * components/layout/Navbar.tsx
 *
 * Top navigation bar shared across all public-facing pages
 * (Home, Event Discovery, Event Detail, Checkout, etc).
 * Matches secure_checkout / crowdflow_home Stitch markup 1:1:
 * sticky, blurred, bordered-bottom, centered within container-max.
 */

"use client";

import Link from "next/link";
import { Bell, Ticket, LayoutDashboard, UserCircle } from "lucide-react";
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
  return (
    <nav className="sticky top-0 z-50 flex w-full items-center justify-between border-b border-border-subtle bg-surface/80 px-margin-desktop py-4 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-container-max items-center justify-between">
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

        <div className="flex items-center gap-4">
          {is_authenticated ? (
            <div className="hidden items-center gap-2 text-text-secondary lg:flex">
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
      </div>
    </nav>
  );
}