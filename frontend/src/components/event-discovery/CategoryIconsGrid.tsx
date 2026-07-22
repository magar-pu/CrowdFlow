/**
 * components/event-discovery/CategoryIconsGrid.tsx
 *
 * 8-category icon grid (2 cols mobile, 4 tablet, 8 desktop). Each
 * category has its own icon + tint color, matching Stitch markup exactly.
 */

import Link from "next/link";
import {
  Music,
  PartyPopper,
  Volleyball,
  Users,
  Palette,
  Network,
  Hammer,
  Presentation,
  type LucideIcon,
} from "lucide-react";

interface CategoryItem {
  label: string;
  href: string;
  icon: LucideIcon;
  icon_class: string;
  bg_class: string;
}

const CATEGORIES: CategoryItem[] = [
  { label: "Concerts", href: "/categories/concerts", icon: Music, icon_class: "text-secondary", bg_class: "bg-secondary/5" },
  { label: "Festivals", href: "/categories/festivals", icon: PartyPopper, icon_class: "text-success", bg_class: "bg-success/5" },
  { label: "Sports", href: "/categories/sports", icon: Volleyball, icon_class: "text-danger", bg_class: "bg-danger/5" },
  { label: "Conferences", href: "/categories/conferences", icon: Users, icon_class: "text-warning", bg_class: "bg-warning/5" },
  { label: "Exhibitions", href: "/categories/exhibitions", icon: Palette, icon_class: "text-primary", bg_class: "bg-primary/5" },
  { label: "Communities", href: "/categories/communities", icon: Network, icon_class: "text-secondary", bg_class: "bg-secondary/5" },
  { label: "Workshops", href: "/categories/workshops", icon: Hammer, icon_class: "text-success", bg_class: "bg-success/5" },
  { label: "Seminars", href: "/categories/seminars", icon: Presentation, icon_class: "text-warning", bg_class: "bg-warning/5" },
];

export function CategoryIconsGrid() {
  return (
    <section className="border-y border-border-subtle bg-surface-white py-stack-lg">
      <div className="mx-auto grid max-w-7xl w-full px-margin-mobile md:px-margin-desktop grid-cols-2 gap-6 md:grid-cols-4 lg:grid-cols-8">
        {CATEGORIES.map((category) => {
          const Icon = category.icon;
          return (
            <Link
              key={category.label}
              href={category.href}
              className="group flex flex-col items-center gap-3 rounded-xl border border-transparent p-6 transition-all hover:border-border-subtle hover:bg-surface-container-low"
            >
              <div
                className={`flex h-16 w-16 items-center justify-center rounded-full transition-transform group-hover:scale-110 ${category.bg_class} ${category.icon_class}`}
              >
                <Icon size={28} />
              </div>
              <span className="text-center font-label-md text-label-md text-text-primary">
                {category.label}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}