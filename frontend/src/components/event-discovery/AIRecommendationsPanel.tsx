/**
 * components/event-discovery/AIRecommendationsPanel.tsx
 *
 * "Direkomendasikan Untukmu (AI)" glassmorphism panel with a pulsing
 * sparkle icon and 2 horizontal recommendation cards (Top Match /
 * Trending tags + match percentage). Matches Stitch markup exactly,
 * including the custom pulse-teal animation on the icon.
 */

import { Sparkles, Star } from "lucide-react";
import { formatIDR } from "@/lib/pricing";
import type { AIRecommendedEvent } from "@/types/ticket";

interface AIRecommendationsPanelProps {
  recommendations: AIRecommendedEvent[];
}

export function AIRecommendationsPanel({
  recommendations,
}: AIRecommendationsPanelProps) {
  return (
    <div className="mb-12 rounded-2xl border border-white bg-white/40 p-8 shadow-sm backdrop-blur-md">
      <div className="mb-6 flex items-center gap-3">
        <Sparkles
          size={20}
          className="text-tertiary [animation:pulse-ai_2s_cubic-bezier(0.4,0,0.6,1)_infinite]"
        />
        <h3 className="font-headline-sm text-headline-sm text-text-primary">
          Direkomendasikan Untukmu (AI)
        </h3>
      </div>
      <style>{`
        @keyframes pulse-ai {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {recommendations.map((rec) => (
          <div
            key={rec.event_id}
            className="flex cursor-pointer gap-4 rounded-xl border border-border-subtle bg-surface-white p-4 shadow-sm transition-all hover:shadow-md"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={rec.cover_image_url}
              alt={rec.title}
              className="h-32 w-32 shrink-0 rounded-lg object-cover"
            />
            <div className="flex flex-col justify-between py-1">
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <span className="rounded bg-secondary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-secondary">
                    {rec.tag_label}
                  </span>
                  <span className="flex items-center gap-1 text-[12px] text-text-secondary">
                    <Star size={14} />
                    {rec.match_pct}% Match
                  </span>
                </div>
                <h4 className="font-headline-sm text-headline-sm leading-tight text-text-primary">
                  {rec.title}
                </h4>
                <p className="mt-1 text-body-sm text-text-secondary">
                  {rec.date_venue_label}
                </p>
              </div>
              <p className="font-bold text-secondary">
                {formatIDR(rec.price)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}