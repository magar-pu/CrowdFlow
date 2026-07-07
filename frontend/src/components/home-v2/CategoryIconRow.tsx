/**
 * components/home-v2/CategoryIconRow.tsx
 *
 * 8-category icon row — square icon tiles (not circles, distinguishing
 * this from the Event Discovery page's CategoryIconsGrid) that invert to
 * solid secondary-blue on hover. Matches the redesigned home Stitch
 * markup exactly.
 */

import Link from "next/link";
import {
  Music,
  Drama,
  Volleyball,
  Megaphone,
  Moon,
  Palette,
  UtensilsCrossed,
  Grid2x2,
  type LucideIcon,
} from "lucide-react";

interface CategoryItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

const CATEGORIES: CategoryItem[] = [
  { label: "Concerts", href: "/events?category=konser", icon: Music },
  { label: "Theater", href: "/events?category=teater", icon: Drama },
  { label: "Sports", href: "/events?category=olahraga", icon: Volleyball },
  { label: "Seminar", href: "/events?category=seminar", icon: Megaphone },
  { label: "Nightlife", href: "/events?category=hiburan-malam", icon: Moon },
  { label: "Exhibition", href: "/events?category=pameran", icon: Palette },
  { label: "Culinary", href: "/events?category=kuliner", icon: UtensilsCrossed },
  { label: "Others", href: "/events", icon: Grid2x2 },
];

export function CategoryIconRow() {
  return (
    <section className="mx-auto max-w-container-max px-margin-mobile py-stack-lg md:px-margin-desktop">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
        {CATEGORIES.map((category) => {
          const Icon = category.icon;
          return (
            <Link
              key={category.label}
              href={category.href}
              className="group flex flex-col items-center gap-2"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-border-subtle bg-white shadow-sm transition-all group-hover:bg-secondary group-hover:text-white">
                <Icon size={24} />
              </div>
              <span className="font-label-sm text-label-sm text-text-primary">
                {category.label}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}