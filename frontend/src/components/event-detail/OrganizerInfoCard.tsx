/**
 * components/event-detail/OrganizerInfoCard.tsx
 *
 * Small "Organized by" card under the ticket selection card. Matches
 * Stitch markup: circular avatar, uppercase label, bold name, profile link.
 */

import Link from "next/link";
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
        <Link
          href={organizer.profile_url}
          className="mt-1 inline-block font-body-sm text-body-sm text-secondary hover:underline"
        >
          View Organizer Profile
        </Link>
      </div>
    </div>
  );
}