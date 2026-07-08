/**
 * components/home/CategoryGrid.tsx
 *
 * "Explore by Category" 2x2/4-col grid. Matches crowdflow_home Stitch
 * markup: each card has a centered icon + label, subtle gradient overlay
 * that intensifies on hover, scale-up icon on hover.
 */

import Link from "next/link";
import { Mic, Landmark, Drama, Users } from "lucide-react";

const CATEGORIES = [
  { icon: Mic, label: "Concerts", href: "/categories/concerts" },
  { icon: Landmark, label: "Sports", href: "/categories/sports" },
  { icon: Drama, label: "Arts & Theater", href: "/categories/arts-theater" },
  { icon: Users, label: "Conferences", href: "/categories/conferences" },
];

export function CategoryGrid() {
  return (
    <section className="mx-auto max-w-container-max px-margin-mobile py-section-gap md:px-margin-desktop">
      <h2 className="mb-10 text-center font-headline-lg text-headline-lg font-bold text-primary">
        Explore by Category
      </h2>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-gutter">
        {CATEGORIES.map((category) => {
          const Icon = category.icon;
          return (
            <Link
              key={category.label}
              href={category.href}
              className="group relative block h-48 overflow-hidden rounded-2xl border border-border-subtle bg-surface shadow-sm transition-all hover:shadow-md"
            >
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-primary transition-transform duration-300 group-hover:scale-105">
                <Icon size={40} className="mb-2 text-secondary" />
                <span className="font-label-md text-label-md font-bold">
                  {category.label}
                </span>
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-surface to-surface-container-high opacity-50 transition-opacity group-hover:opacity-100" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}