import { ChevronRight, Flame, Clock, ArrowRight } from "lucide-react";
import Link from "next/link";
import { formatIDR } from "@/lib/pricing";
import type { TrendingEventCard } from "@/types/ticket";
import { formatEventDateLabel } from "@/lib/date";

interface TrendingEventsProps {
  events: TrendingEventCard[];
}

/**
 * "Trending Now" grid on the homepage, driven by real events from
 * GET /api/v1/events. The "Selling Fast" badge is presentational — the
 * backend exposes no sales-velocity signal to drive it from.
 */
export function TrendingEvents({ events }: TrendingEventsProps) {
  if (events.length === 0) return null;

  return (
    <section className="mt-20">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h3 className="font-display text-[28px] font-bold text-on-surface tracking-tight mb-2">
            Trending Now
          </h3>
          <p className="text-sm text-on-surface-variant">
            Events that are selling out incredibly fast.
          </p>
        </div>
        <Link 
          href="/events" 
          className="text-sm font-bold text-accent-blue hover:text-accent-blue/80 transition-colors flex items-center gap-1"
        >
          See All <ChevronRight size={18} />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {events.slice(0, 4).map((event) => (
          <Link
            key={event.event_id}
            href={`/events/${event.event_id}`}
            className="bg-surface-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 border border-border-subtle group cursor-pointer flex flex-col relative"
          >
            <div className="relative w-full aspect-[16/9] overflow-hidden">
              <img
                alt={event.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-in-out"
                src={event.cover_image_url}
              />
              <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-xs font-bold text-on-surface flex items-center gap-1 shadow-sm">
                <Flame size={12} className="text-accent-blue fill-accent-blue" /> Selling Fast
              </div>
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
                    {event.starting_price === null
                      ? "—"
                      : formatIDR(event.starting_price)}
                  </p>
                </div>
                <div className="w-8 h-8 bg-surface-container-low text-on-surface rounded-full flex items-center justify-center group-hover:bg-accent-blue group-hover:text-white transition-colors">
                  <ArrowRight size={16} />
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
