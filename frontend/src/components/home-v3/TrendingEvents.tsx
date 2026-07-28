import { EventSection } from "./EventSection";
import type { TrendingEventCard } from "@/types/ticket";

interface TrendingEventsProps {
  events: TrendingEventCard[];
  isLoading: boolean;
  hasError: boolean;
  onRetry: () => void;
}

/**
 * "Trending Now", driven by GET /api/v1/events?sort=trending — ranked by
 * tickets sold on paid orders in the last 7 days. The "Selling Fast" badge is
 * gated on that same figure, so a card only carries it when the event really
 * has recent sales.
 */
export function TrendingEvents({ events, isLoading, hasError, onRetry }: TrendingEventsProps) {
  return (
    <EventSection
      title="Trending Now"
      subtitle="The events selling fastest this week."
      events={events}
      isLoading={isLoading}
      hasError={hasError}
      onRetry={onRetry}
      showSellingFast
      emptyMessage="No events have sold tickets in the past week yet. Once sales pick up, the fastest movers show up here."
    />
  );
}
