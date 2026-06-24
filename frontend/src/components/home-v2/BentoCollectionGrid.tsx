/**
 * components/home-v2/BentoCollectionGrid.tsx
 *
 * "Koleksi Event Pilihan" asymmetric bento grid.
 * Mobile: 2-col grid, smaller row height.
 * Desktop: 4-col grid, 180px rows.
 */

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { BentoCollectionTile } from "@/types/ticket";

interface BentoCollectionGridProps {
  tiles: BentoCollectionTile[];
}

const COL_SPAN_CLASS: Record<BentoCollectionTile["col_span"], string> = {
  1: "col-span-1",
  2: "col-span-2",
};

const ROW_SPAN_CLASS: Record<BentoCollectionTile["row_span"], string> = {
  1: "row-span-1",
  2: "row-span-2",
};

export function BentoCollectionGrid({ tiles }: BentoCollectionGridProps) {
  return (
    <section className="mx-auto max-w-container-max px-margin-mobile py-10 md:px-margin-desktop md:py-section-gap">
      {/* Header */}
      <div className="mb-4 flex items-end justify-between md:mb-stack-lg">
        <div>
          <h2 className="mb-1 text-xl font-bold text-text-primary md:font-headline-lg md:text-headline-lg">
            Koleksi Event Pilihan
          </h2>
          <p className="text-sm text-text-secondary md:font-body-md md:text-body-md">
            Kurasi event terbaik mulai dari festival musik hingga pameran
            seni eksklusif.
          </p>
        </div>
        <Link
          href="/events"
          className="flex shrink-0 items-center gap-1 font-label-md text-label-md text-secondary hover:underline"
        >
          <span className="hidden sm:inline">Lihat Semua Destinasi</span>
          <span className="sm:hidden text-xs">Lihat Semua</span>
          <ChevronRight size={16} />
        </Link>
      </div>

      {/* Grid — mobile 2-col, desktop 4-col */}
      <div className="grid grid-cols-2 gap-3 auto-rows-[120px] md:auto-rows-[180px] md:grid-cols-4 md:gap-gutter">
        {tiles.map((tile) => (
          <Link
            key={tile.tile_id}
            href={tile.href}
            className={`group relative cursor-pointer overflow-hidden rounded-xl ${COL_SPAN_CLASS[tile.col_span]} ${ROW_SPAN_CLASS[tile.row_span]}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={tile.cover_image_url}
              alt={tile.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 to-transparent p-3 md:p-6">
              <h3
                className={
                  tile.row_span === 2
                    ? "text-sm font-bold text-white md:font-headline-md md:text-headline-md"
                    : tile.col_span === 2
                      ? "text-xs font-bold text-white md:font-headline-sm md:text-headline-sm"
                      : "text-[10px] font-bold text-white md:font-label-md md:text-label-md"
                }
              >
                {tile.title}
              </h3>
              {tile.subtitle && (
                <p className="hidden text-[10px] text-white/70 md:block md:font-label-sm md:text-label-sm">
                  {tile.subtitle}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}