/**
 * components/event-detail/OrganizerInfoCard.tsx
 *
 * Small "Organized by" card under the ticket CTA: circular avatar, uppercase
 * label, organizer name.
 *
 * There is no "View Organizer Profile" link. The API returns profile_url as
 * /organizers/{id}, but no such public route exists — the only organizer [id]
 * page is the auth-gated auditor console — so the link 404'd for every buyer.
 * It comes back when a public organizer page does.
 */

import type { Organizer } from "@/types/ticket";

interface OrganizerInfoCardProps {
  organizer: Organizer;
}

export function OrganizerInfoCard({ organizer }: OrganizerInfoCardProps) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border-subtle bg-surface-white p-6">
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full border border-border-subtle bg-surface-container">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={organizer.avatar_url}
          alt={organizer.name}
          className="h-full w-full object-cover"
        />
      </div>
      <div>
        <p className="mb-0.5 font-label-sm text-label-sm uppercase tracking-wider text-text-secondary">
          Organized by
        </p>
        <p className="font-label-md text-label-md font-bold text-primary">
          {organizer.name}
        </p>
      </div>
    </div>
  );
}