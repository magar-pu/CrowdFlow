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
    <footer className="mx-auto mt-section-gap grid w-full max-w-container-max grid-cols-1 gap-gutter bg-surface-container-highest px-margin-mobile py-stack-lg md:grid-cols-4 md:px-margin-desktop">
      <div className="col-span-1 mb-8 md:col-span-4">
        <span className="font-headline-md text-headline-md font-bold text-primary">
          CrowdFlow
        </span>
      </div>
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
      <div className="col-span-1 mt-8 border-t border-border-subtle pt-8 md:col-span-4">
        <p className="text-center font-body-sm text-body-sm text-on-surface-variant">
          © 2026 CrowdFlow Ticketing Ecosystem. All rights reserved.
        </p>
      </div>
    </footer>
  );
}