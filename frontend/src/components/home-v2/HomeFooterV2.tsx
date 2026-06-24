/**
 * components/home-v2/HomeFooterV2.tsx
 *
 * 4-column footer.
 * Mobile: stacked single column.
 * Desktop: 4-col grid.
 */

import Link from "next/link";
import { Smile, Globe, PlayCircle } from "lucide-react";

const ABOUT_LINKS = ["Cara Pesan", "Hubungi Kami", "Pusat Bantuan", "Karir"];
const PRODUCT_LINKS = [
  "Tiket Konser",
  "Tiket Atraksi",
  "Tiket Olahraga",
  "Layanan Bisnis",
];

export function HomeFooterV2() {
  return (
    <footer className="w-full bg-surface-container-low px-margin-mobile py-10 md:px-margin-desktop md:py-12">
      <div className="mx-auto grid max-w-container-max grid-cols-2 gap-8 md:grid-cols-4">
        {/* Brand — full width on mobile */}
        <div className="col-span-2 space-y-4 md:col-span-1">
          <h3 className="font-headline-md text-headline-md font-bold tracking-tight text-primary">
            CrowdFlow
          </h3>
          <p className="max-w-xs font-body-sm text-body-sm text-text-secondary">
            Ekosistem ticketing premium untuk pengalaman live entertainment
            terbaik di Indonesia.
          </p>
          <div className="flex gap-4">
            <Smile size={20} className="cursor-pointer text-text-secondary transition-colors hover:text-primary" />
            <Globe size={20} className="cursor-pointer text-text-secondary transition-colors hover:text-primary" />
            <PlayCircle size={20} className="cursor-pointer text-text-secondary transition-colors hover:text-primary" />
          </div>
        </div>

        {/* Tentang CrowdFlow */}
        <div>
          <h4 className="mb-4 font-label-md text-label-md uppercase tracking-wider text-text-primary">
            Tentang CrowdFlow
          </h4>
          <ul className="space-y-3">
            {ABOUT_LINKS.map((link) => (
              <li key={link}>
                <Link
                  href="#"
                  className="font-body-sm text-body-sm text-text-secondary transition-colors hover:text-primary"
                >
                  {link}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Produk */}
        <div>
          <h4 className="mb-4 font-label-md text-label-md uppercase tracking-wider text-text-primary">
            Produk
          </h4>
          <ul className="space-y-3">
            {PRODUCT_LINKS.map((link) => (
              <li key={link}>
                <Link
                  href="#"
                  className="font-body-sm text-body-sm text-text-secondary transition-colors hover:text-primary"
                >
                  {link}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Download App */}
        <div className="col-span-2 md:col-span-1">
          <h4 className="mb-4 font-label-md text-label-md uppercase tracking-wider text-text-primary">
            Download App
          </h4>
          <div className="flex flex-row gap-3 md:flex-col">
            {/* Google Play */}
            <button
              type="button"
              className="flex flex-1 items-center gap-3 rounded-xl bg-primary px-4 py-3 text-white transition-all hover:opacity-90 active:scale-95 md:flex-none"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 20.5v-17c0-.83 1.01-1.28 1.63-.71l14 8.5c.52.32.52 1.09 0 1.41l-14 8.5C3.99 21.78 3 21.33 3 20.5z" />
              </svg>
              <div className="text-left">
                <p className="text-[9px] uppercase leading-none opacity-60">Get it on</p>
                <p className="text-xs font-bold leading-tight md:text-sm">Google Play</p>
              </div>
            </button>

            {/* App Store */}
            <button
              type="button"
              className="flex flex-1 items-center gap-3 rounded-xl bg-primary px-4 py-3 text-white transition-all hover:opacity-90 active:scale-95 md:flex-none"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
              </svg>
              <div className="text-left">
                <p className="text-[9px] uppercase leading-none opacity-60">Download on the</p>
                <p className="text-xs font-bold leading-tight md:text-sm">App Store</p>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="mx-auto mt-8 flex max-w-container-max flex-col items-center justify-between gap-4 border-t border-border-subtle pt-6 md:flex-row">
        <p className="text-center font-body-sm text-body-sm text-text-secondary md:text-left">
          © 2026 CrowdFlow Ticketing Ecosystem. All rights reserved.
        </p>
        <div className="flex gap-6">
          <Link href="/terms" className="font-body-sm text-body-sm text-text-secondary transition-colors hover:text-primary">
            Syarat &amp; Ketentuan
          </Link>
          <Link href="/privacy" className="font-body-sm text-body-sm text-text-secondary transition-colors hover:text-primary">
            Kebijakan Privasi
          </Link>
        </div>
      </div>
    </footer>
  );
}