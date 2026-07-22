/**
 * components/event-discovery/EventDiscoveryFooter.tsx
 *
 * 4-column footer specific to the Events Discovery page (Indonesian
 * copy, different link columns than the global Footer.tsx used on Home).
 * Kept separate rather than overloading the shared Footer with locale
 * variants and an unrelated column structure.
 */

import Link from "next/link";
import { Globe, Share2, AtSign, Languages, Coins } from "lucide-react";

const FOOTER_COLUMNS = [
  {
    heading: "Perusahaan",
    links: ["About Us", "Careers", "Press", "API Docs"],
  },
  {
    heading: "Dukungan",
    links: [
      "Help Center",
      "Privacy Policy",
      "Terms of Service",
      "Marketplace Rules",
    ],
  },
  {
    heading: "Events",
    links: [
      "Global Events",
      "Music Concerts",
      "Sports Matches",
      "Tech Conferences",
    ],
  },
];

export function EventDiscoveryFooter() {
  return (
    <footer className="border-t border-border-subtle bg-surface-white">
      <div className="mx-auto grid max-w-container-max grid-cols-1 gap-gutter px-margin-mobile py-section-gap md:grid-cols-4 md:px-margin-desktop">
        <div className="space-y-6">
          <span className="block font-headline-sm text-headline-sm font-black text-primary">
            CrowdFlow
          </span>
          <p className="font-body-sm text-body-sm text-text-secondary">
            Platform ticketing generasi terbaru dengan keamanan blockchain
            dan verifikasi identitas real-time.
          </p>
          <div className="flex gap-4">
            <a href="#" className="text-text-secondary transition-colors hover:text-secondary">
              <Globe size={20} />
            </a>
            <a href="#" className="text-text-secondary transition-colors hover:text-secondary">
              <Share2 size={20} />
            </a>
            <a href="#" className="text-text-secondary transition-colors hover:text-secondary">
              <AtSign size={20} />
            </a>
          </div>
        </div>

        {FOOTER_COLUMNS.map((column) => (
          <div key={column.heading}>
            <h4 className="mb-6 font-label-md text-label-md text-primary">
              {column.heading}
            </h4>
            <ul className="space-y-4">
              {column.links.map((link) => (
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
        ))}
      </div>

      <div className="mx-auto flex max-w-container-max flex-col items-center justify-between gap-4 border-t border-border-subtle px-margin-mobile py-8 md:flex-row md:px-margin-desktop">
        <p className="font-body-sm text-body-sm text-text-secondary">
          © 2026 CrowdFlow Ticketing Solutions. All rights reserved.
        </p>
        <div className="flex gap-8">
          <span className="flex items-center gap-2 font-body-sm text-body-sm text-text-secondary">
            <Languages size={16} /> Indonesia (ID)
          </span>
          <span className="flex items-center gap-2 font-body-sm text-body-sm text-text-secondary">
            <Coins size={16} /> IDR (Rp)
          </span>
        </div>
      </div>
    </footer>
  );
}