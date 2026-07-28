import { EventSection } from "./EventSection";
import type { TrendingEventCard } from "@/types/ticket";

interface UpcomingConcertsProps {
  events: TrendingEventCard[];
  isLoading: boolean;
  hasError: boolean;
  onRetry: () => void;
}

/**
 * "Upcoming Concerts", driven by GET /api/v1/events?sort=upcoming — soonest
 * start first, with events that have already ended excluded by the backend.
 */
export function UpcomingConcerts({ events, isLoading, hasError, onRetry }: UpcomingConcertsProps) {
  return (
    <EventSection
      title="Upcoming Concerts"
      subtitle="Secure your spot at the hottest music events."
      events={events}
      isLoading={isLoading}
      hasError={hasError}
      onRetry={onRetry}
      emptyMessage="There are no published events coming up right now. Check back soon — new events go on sale regularly."
    />
  );
}
