/**
 * components/home-v2/HomeFooterV2.tsx
 *
 * 4-column footer.
 * Mobile: stacked single column.
 * Desktop: 4-col grid.
 */

import Link from "next/link";
import { Smile, Globe, PlayCircle } from "lucide-react";

const ABOUT_LINKS = ["How to Order", "Contact Us", "Help Center", "Careers"];
const PRODUCT_LINKS = [
  "Concert Tickets",
  "Attraction Tickets",
  "Sports Tickets",
  "Business Services",
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
            Premium ticketing ecosystem for the best live entertainment
            experience in Indonesia.
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
            About CrowdFlow
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
            Products
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
        
      </div>

      {/* Bottom bar */}
      <div className="mx-auto mt-8 flex max-w-container-max flex-col items-center justify-between gap-4 border-t border-border-subtle pt-6 md:flex-row">
        <p className="text-center font-body-sm text-body-sm text-text-secondary md:text-left">
          © 2026 CrowdFlow Ticketing Ecosystem. All rights reserved.
        </p>
        <div className="flex gap-6">
          <Link href="/terms" className="font-body-sm text-body-sm text-text-secondary transition-colors hover:text-primary">
            Terms &amp; Conditions
          </Link>
          <Link href="/privacy" className="font-body-sm text-body-sm text-text-secondary transition-colors hover:text-primary">
            Privacy Policy
          </Link>
        </div>
      </div>
    </footer>
  );
}