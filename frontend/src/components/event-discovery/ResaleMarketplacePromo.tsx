/**
 * components/event-discovery/ResaleMarketplacePromo.tsx
 *
 * Solid Dark "Tiket Habis? Beli di Marketplace Resmi Kami." promo card.
 * Static background with clean typography and trust signals.
 */

import Link from "next/link";
import { BadgeCheck, Banknote, QrCode, ArrowRight, ShieldCheck } from "lucide-react";

const TRUST_POINTS = [
  {
    icon: BadgeCheck,
    icon_class: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20",
    title: "100% Guaranteed Authenticity",
    description: "Tickets are checked and validated directly by our system.",
  },
  {
    icon: Banknote,
    icon_class: "bg-blue-500/15 text-blue-400 border border-blue-500/20",
    title: "Escrow Payment System",
    description: "Seller funds will only be released after the event ends.",
  },
  {
    icon: QrCode,
    icon_class: "bg-amber-500/15 text-amber-400 border border-amber-500/20",
    title: "Automatic Re-Issue",
    description: "Old ticket is voided, new buyer gets a new QR.",
  },
];

export function ResaleMarketplacePromo() {
  return (
    <section className="my-16 px-margin-mobile md:px-margin-desktop">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-2xl border border-slate-800 bg-[#0B132B] p-8 shadow-xl lg:p-12">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <div>
            <span className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-blue-400/20 bg-blue-500/10 px-4 py-1.5 font-label-md text-xs font-semibold uppercase tracking-wider text-blue-400">
              <ShieldCheck size={14} className="text-blue-400" /> Safe Secondary Market
            </span>
            <h2 className="mb-6 font-headline-xl text-3xl font-bold tracking-tight text-white sm:text-4xl leading-tight">
              Tickets Sold Out? Buy on Our Official Marketplace.
            </h2>
            <p className="mb-8 font-body-lg text-base leading-relaxed text-slate-300">
              Avoid ticket scams. CrowdFlow Marketplace guarantees ticket
              authenticity through re-issue technology with unique QR codes
              for every new buyer.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/resale"
                className="flex items-center gap-2 rounded-full bg-secondary px-8 py-3.5 font-bold text-white shadow-md transition-all hover:bg-secondary/90 active:scale-95"
              >
                Browse Marketplace
                <ArrowRight size={18} />
              </Link>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-6 shadow-md lg:p-8">
            <div className="space-y-6">
              {TRUST_POINTS.map((point) => {
                const Icon = point.icon;
                return (
                  <div key={point.title} className="flex items-start gap-4">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${point.icon_class}`}
                    >
                      <Icon size={22} />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-base sm:text-lg mb-0.5">
                        {point.title}
                      </h4>
                      <p className="text-sm text-slate-300/80 leading-normal">
                        {point.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}