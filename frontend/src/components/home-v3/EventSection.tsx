import { ChevronRight, Flame, Clock, ArrowRight, CalendarX, RotateCw } from "lucide-react";
import Link from "next/link";
import { formatIDR } from "@/lib/pricing";
import type { TrendingEventCard } from "@/types/ticket";
import { formatEventDateLabel } from "@/lib/date";

/**
 * The shared homepage event grid. "Upcoming Concerts" and "Trending Now" are
 * two sorts of the same feed, so they render through here rather than keeping
 * two near-identical copies of the card markup in sync.
 */
interface EventSectionProps {
  title: string;
  subtitle: string;
  events: TrendingEventCard[];
  isLoading: boolean;
  hasError: boolean;
  onRetry: () => void;
  /** Copy shown when the fetch succeeded but matched no events. */
  emptyMessage: string;
  /**
   * Whether to consider the "Selling Fast" badge at all. Even when true the
   * badge only renders on cards with real recent sales — it is never
   * decorative.
   */
  showSellingFast?: boolean;
  /** Cards to draw while loading; keeps the grid from collapsing. */
  skeletonCount?: number;
}

export function EventSection({
  title,
  subtitle,
  events,
  isLoading,
  hasError,
  onRetry,
  emptyMessage,
  showSellingFast = false,
  skeletonCount = 4,
}: EventSectionProps) {
  return (
    <section className="mt-20 first:mt-0">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h3 className="font-display text-[28px] font-bold text-on-surface tracking-tight mb-2">
            {title}
          </h3>
          <p className="text-sm text-on-surface-variant">{subtitle}</p>
        </div>
        <Link
          href="/events"
          className="text-sm font-bold text-accent-blue hover:text-accent-blue/80 transition-colors flex items-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue rounded"
        >
          See All <ChevronRight size={18} />
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: skeletonCount }).map((_, i) => (
            <EventCardSkeleton key={i} />
          ))}
        </div>
      ) : hasError ? (
        <SectionError onRetry={onRetry} />
      ) : events.length === 0 ? (
        <SectionEmpty message={emptyMessage} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {events.map((event) => (
            <EventCard
              key={event.event_id}
              event={event}
              showSellingFast={showSellingFast}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function EventCard({
  event,
  showSellingFast,
}: {
  event: TrendingEventCard;
  showSellingFast: boolean;
}) {
  // recent_sales is tickets sold in the last 7 days. No sales means no badge —
  // the badge used to be stamped on every card regardless.
  const isSellingFast = showSellingFast && event.recent_sales > 0;

  return (
    <Link
      href={`/events/${event.event_id}`}
      className="bg-surface-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 border border-border-subtle group cursor-pointer flex flex-col relative focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
    >
      <div className="relative w-full aspect-[16/9] overflow-hidden">
        <img
          alt={event.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-in-out"
          src={event.cover_image_url}
        />
        {isSellingFast && (
          <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-xs font-bold text-on-surface flex items-center gap-1 shadow-sm">
            <Flame size={12} className="text-accent-blue fill-accent-blue" /> Selling Fast
          </div>
        )}
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <h4 className="font-display text-lg text-on-surface font-bold mb-1">{event.title}</h4>
        <p className="text-sm text-on-surface-variant mb-4 flex items-center gap-1">
          <Clock size={14} /> {formatEventDateLabel(event.starts_at)}
        </p>

        <div className="mt-auto flex justify-between items-center pt-3 border-t border-border-subtle">
          <div>
            <p className="text-xs text-on-surface-variant mb-0.5">Tickets from</p>
            <p className="font-bold text-accent-blue text-lg">
              {event.starting_price === null ? "—" : formatIDR(event.starting_price)}
            </p>
          </div>
          <div className="w-8 h-8 bg-surface-container-low text-on-surface rounded-full flex items-center justify-center group-hover:bg-accent-blue group-hover:text-white transition-colors">
            <ArrowRight size={16} />
          </div>
        </div>
      </div>
    </Link>
  );
}

function EventCardSkeleton() {
  return (
    <div
      className="bg-surface-white rounded-xl overflow-hidden border border-border-subtle animate-pulse"
      aria-hidden="true"
    >
      <div className="w-full aspect-[16/9] bg-surface-container-low" />
      <div className="p-4">
        <div className="h-5 w-3/4 rounded bg-surface-container-low mb-3" />
        <div className="h-4 w-1/2 rounded bg-surface-container-low mb-6" />
        <div className="pt-3 border-t border-border-subtle flex justify-between items-center">
          <div className="h-6 w-24 rounded bg-surface-container-low" />
          <div className="h-8 w-8 rounded-full bg-surface-container-low" />
        </div>
      </div>
    </div>
  );
}

function SectionEmpty({ message }: { message: string }) {
  return (
    <div className="bg-surface-white border border-border-subtle rounded-2xl py-16 px-8 flex flex-col items-center text-center">
      <div className="w-14 h-14 rounded-full bg-surface-container-low flex items-center justify-center mb-4">
        <CalendarX size={26} className="text-on-surface-variant" strokeWidth={1.5} />
      </div>
      <h4 className="font-display text-lg font-bold text-on-surface mb-1">Nothing here yet</h4>
      <p className="text-sm text-on-surface-variant max-w-sm mb-6">{message}</p>
      <Link
        href="/events"
        className="bg-surface-container-low text-on-surface px-6 py-3 rounded-xl text-sm font-bold hover:bg-surface-container-high transition-colors"
      >
        Browse all events
      </Link>
    </div>
  );
}

/** Never surfaces the backend error text — only an action the user can take. */
function SectionError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="bg-surface-white border border-border-subtle rounded-2xl py-16 px-8 flex flex-col items-center text-center">
      <h4 className="font-display text-lg font-bold text-on-surface mb-1">
        We couldn&apos;t load these events
      </h4>
      <p className="text-sm text-on-surface-variant max-w-sm mb-6">
        Something went wrong on our side. Check your connection and try again.
      </p>
      <button
        onClick={onRetry}
        className="bg-accent-blue text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-accent-blue/90 transition-colors flex items-center gap-2 active:scale-95"
      >
        <RotateCw size={16} /> Try again
      </button>
    </div>
  );
}
