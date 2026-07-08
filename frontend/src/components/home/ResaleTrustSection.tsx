/**
 * components/home/ResaleTrustSection.tsx
 *
 * "Official Resale Marketplace" trust section. Two columns: copy + feature
 * list on the left, an abstract floating-card illustration on the right.
 * Matches crowdflow_home Stitch markup exactly (rotated cards, dashed
 * connecting ring, blurred gradient backdrop).
 */

import { BadgeCheck, ShieldUser, RefreshCcw, CircleCheck } from "lucide-react";

const FEATURES = [
  {
    icon: ShieldUser,
    title: "Identity Verification",
    description:
      "Every seller is strictly verified using government-issued ID to prevent fraud.",
  },
  {
    icon: RefreshCcw,
    title: "Automatic Transfer",
    description:
      "Digital tickets are instantly reissued with the new buyer's details upon secure payment.",
  },
];

export function ResaleTrustSection() {
  return (
    <section className="relative overflow-hidden border-y border-border-subtle bg-surface-container-lowest px-margin-mobile py-section-gap md:px-margin-desktop">
      <div className="mx-auto grid max-w-container-max grid-cols-1 items-center gap-16 lg:grid-cols-2">
        <div className="z-10 space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-surface-container px-3 py-1.5 font-label-sm text-label-sm text-primary">
            <BadgeCheck size={16} className="text-success" /> Official Resale
            Marketplace
          </div>
          <h2 className="font-headline-lg text-headline-lg font-bold text-primary">
            Safe, Verified Ticket Transfers
          </h2>
          <p className="font-body-lg text-body-lg text-text-secondary">
            Buy and sell tickets with absolute confidence. CrowdFlow&apos;s
            Official Resale Marketplace ensures 100% verified ownership,
            automated secure transfers, and fraud protection.
          </p>
          <ul className="space-y-6">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <li key={feature.title} className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border-subtle bg-surface">
                    <Icon size={20} className="text-secondary" />
                  </div>
                  <div>
                    <h4 className="font-headline-sm text-headline-sm font-bold text-primary">
                      {feature.title}
                    </h4>
                    <p className="mt-1 font-body-sm text-body-sm text-text-secondary">
                      {feature.description}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            className="rounded-full border border-border-subtle bg-surface-white px-6 py-3 font-label-md text-label-md text-primary shadow-sm transition-all hover:border-secondary hover:text-secondary"
          >
            Browse Resale Tickets
          </button>
        </div>

        {/* Abstract floating card illustration */}
        <div className="relative z-10">
          <div className="relative mx-auto aspect-square w-full max-w-md">
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-surface to-surface-container-high opacity-50 blur-3xl" />

            <div className="absolute left-0 top-10 w-64 -rotate-6 rounded-2xl border border-border-subtle bg-surface-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-transform duration-300 hover:rotate-0">
              <div className="mb-4 flex items-start justify-between">
                <div className="h-10 w-10 rounded-full bg-surface-container" />
                <CircleCheck size={20} className="text-success" />
              </div>
              <div className="mb-2 h-4 w-3/4 rounded bg-surface-container" />
              <div className="h-3 w-1/2 rounded bg-surface-container" />
            </div>

            <div className="absolute bottom-10 right-0 z-20 w-64 rotate-6 rounded-2xl border border-secondary/20 bg-surface-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-transform duration-300 hover:rotate-0">
              <div className="mb-4 flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/10 font-bold text-secondary">
                  JD
                </div>
                <CircleCheck size={20} className="text-success" />
              </div>
              <div className="mb-2 h-4 w-3/4 rounded bg-surface-container" />
              <div className="h-3 w-1/2 rounded bg-surface-container" />
              <div className="mt-4 flex items-center justify-between border-t border-border-subtle pt-4">
                <span className="font-label-sm text-label-sm text-text-secondary">
                  Ownership Transferred
                </span>
              </div>
            </div>

            <div className="absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 animate-[spin_10s_linear_infinite] rounded-full border-2 border-dashed border-secondary/30" />
          </div>
        </div>
      </div>
    </section>
  );
}