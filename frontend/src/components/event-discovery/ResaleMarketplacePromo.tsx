/**
 * components/event-discovery/ResaleMarketplacePromo.tsx
 *
 * Dark "Tiket Habis? Beli di Marketplace Resmi Kami." promo band, with a
 * glassmorphism trust-signals card (Authenticity / Escrow / Re-Issue) on
 * the right. Matches Stitch markup exactly.
 */

import Link from "next/link";
import { BadgeCheck, Banknote, QrCode, ArrowRight } from "lucide-react";

const TRUST_POINTS = [
  {
    icon: BadgeCheck,
    icon_class: "bg-success/20 text-success",
    title: "100% Guaranteed Authenticity",
    description: "Tiket dicek dan divalidasi langsung oleh sistem kami.",
  },
  {
    icon: Banknote,
    icon_class: "bg-secondary/20 text-secondary",
    title: "Escrow Payment System",
    description: "Dana penjual hanya akan cair setelah event selesai.",
  },
  {
    icon: QrCode,
    icon_class: "bg-warning/20 text-warning",
    title: "Automatic Re-Issue",
    description: "Tiket lama hangus, pembeli baru mendapat QR baru.",
  },
];

export function ResaleMarketplacePromo() {
  return (
    <section className="relative overflow-hidden bg-text-primary px-margin-mobile py-section-gap md:px-margin-desktop">
      <div className="relative z-10 mx-auto max-w-container-max">
        <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
          <div>
            <span className="mb-6 inline-block rounded-full bg-secondary px-4 py-1 font-label-sm text-label-sm text-white">
              Safe Secondary Market
            </span>
            <h2 className="mb-6 font-headline-xl text-headline-xl text-white">
              Tiket Habis? Beli di Marketplace Resmi Kami.
            </h2>
            <p className="mb-10 font-body-lg text-body-lg leading-relaxed text-white/70">
              Hindari penipuan tiket. Marketplace CrowdFlow menjamin
              keaslian tiket melalui re-issue teknologi QR code unik untuk
              setiap pembeli baru.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/resale"
                className="flex items-center gap-2 rounded-full bg-secondary px-8 py-4 font-bold text-white transition-all hover:bg-white hover:text-secondary"
              >
                Browse Marketplace
                <ArrowRight size={20} />
              </Link>
              <button
                type="button"
                className="rounded-full border border-white/30 px-8 py-4 font-bold text-white transition-all hover:bg-white/10"
              >
                Pelajari Lebih Lanjut
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl lg:p-12">
            <div className="space-y-6">
              {TRUST_POINTS.map((point) => {
                const Icon = point.icon;
                return (
                  <div key={point.title} className="flex items-center gap-4 text-white">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${point.icon_class}`}
                    >
                      <Icon size={22} />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold">{point.title}</h4>
                      <p className="text-sm text-white/60">
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