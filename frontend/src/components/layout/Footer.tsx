/**
 * components/layout/Footer.tsx
 *
 * Shared site footer — logo, 3 link columns, copyright line.
 * Matches crowdflow_home Stitch markup exactly.
 */

import Link from "next/link";

const FOOTER_COLUMNS = [
  {
    links: [
      { label: "Company", href: "/company" },
      { label: "Support", href: "/support" },
    ],
  },
  {
    links: [
      { label: "Legal", href: "/legal" },
      { label: "Privacy Policy", href: "/privacy" },
    ],
  },
  {
    links: [{ label: "Contact Us", href: "/contact" }],
  },
];

export function Footer() {
  return (
    <footer className="w-full mt-section-gap bg-surface-container-highest">
      <div className="mx-auto flex w-full max-w-container-max flex-col px-margin-mobile py-stack-lg md:px-margin-desktop">
        <div className="mb-8">
          <span className="font-headline-md text-headline-md font-bold text-primary">
            CrowdFlow
          </span>
        </div>
        <div className="grid grid-cols-2 gap-8 md:grid-cols-3">
          {FOOTER_COLUMNS.map((column, index) => (
            <div key={index} className="flex flex-col gap-2">
              {column.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="font-body-sm text-body-sm text-on-surface-variant transition-all hover:text-primary hover:underline"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          ))}
        </div>
        <div className="mt-8 border-t border-border-subtle pt-8">
          <p className="text-center font-body-sm text-body-sm text-on-surface-variant">
            © 2026 CrowdFlow Ticketing Ecosystem. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}