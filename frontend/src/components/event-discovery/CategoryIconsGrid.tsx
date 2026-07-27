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
import { cn } from "@/lib/utils";

interface CategoryItem {
  label: string;
  keyword: string;
  icon: LucideIcon;
  icon_class: string;
  bg_class: string;
}

const CATEGORIES: CategoryItem[] = [
  { label: "Concerts", keyword: "Concert", icon: Music, icon_class: "text-secondary", bg_class: "bg-secondary/10" },
  { label: "Festivals", keyword: "Festival", icon: PartyPopper, icon_class: "text-success", bg_class: "bg-success/10" },
  { label: "Sports", keyword: "Sports", icon: Volleyball, icon_class: "text-danger", bg_class: "bg-danger/10" },
  { label: "Conferences", keyword: "Conference", icon: Users, icon_class: "text-warning", bg_class: "bg-warning/10" },
  { label: "Exhibitions", keyword: "Exhibition", icon: Palette, icon_class: "text-primary", bg_class: "bg-primary/10" },
  { label: "Communities", keyword: "Community", icon: Network, icon_class: "text-secondary", bg_class: "bg-secondary/10" },
  { label: "Workshops", keyword: "Workshop", icon: Hammer, icon_class: "text-success", bg_class: "bg-success/10" },
  { label: "Seminars", keyword: "Seminar", icon: Presentation, icon_class: "text-warning", bg_class: "bg-warning/10" },
];

interface CategoryIconsGridProps {
  active_category?: string;
  on_select_category?: (keyword: string) => void;
}

export function CategoryIconsGrid({
  active_category = "",
  on_select_category,
}: CategoryIconsGridProps) {
  return (
    <section className="border-y border-border-subtle bg-surface-white py-stack-lg">
      <div className="mx-auto grid max-w-7xl w-full px-margin-mobile md:px-margin-desktop grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-8">
        {CATEGORIES.map((category) => {
          const Icon = category.icon;
          const isActive =
            active_category.trim() !== "" &&
            active_category.trim().toLowerCase() === category.keyword.toLowerCase();

          const content = (
            <>
              <div
                className={cn(
                  "flex h-14 w-14 items-center justify-center rounded-full transition-transform group-hover:scale-110",
                  category.bg_class,
                  category.icon_class
                )}
              >
                <Icon size={26} />
              </div>
              <span
                className={cn(
                  "text-center font-label-md text-label-md text-text-primary transition-colors",
                  isActive && "font-bold text-secondary"
                )}
              >
                {category.label}
              </span>
            </>
          );

          const className = cn(
            "group flex flex-col items-center gap-2.5 rounded-xl border p-4 transition-all cursor-pointer",
            isActive
              ? "border-secondary bg-surface-container-low shadow-sm ring-2 ring-secondary/20"
              : "border-transparent hover:border-border-subtle hover:bg-surface-container-low"
          );

          if (on_select_category) {
            return (
              <button
                key={category.label}
                type="button"
                onClick={() =>
                  on_select_category(isActive ? "" : category.keyword)
                }
                className={className}
              >
                {content}
              </button>
            );
          }

          return (
            <Link
              key={category.label}
              href={`/events?q=${category.keyword}`}
              className={className}
            >
              {content}
            </Link>
          );
        })}
      </div>
    </section>
  );
}