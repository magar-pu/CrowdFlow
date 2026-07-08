/**
 * components/waiting-room/QueueWarningBanner.tsx
 *
 * "Don't refresh / don't open multiple tabs" anti-bot notice. Ties back
 * to the BRD's anti-scalping requirement (FR: high traffic & anti-bot) —
 * the queue position is session-bound server-side, so refreshing or
 * multi-tabbing risks losing the user's place once that's enforced by
 * the real Go backend.
 */

import { TriangleAlert } from "lucide-react";

export function QueueWarningBanner() {
  return (
    <div className="flex w-full max-w-lg items-start gap-3 rounded-lg border border-warning/20 bg-warning/5 p-4">
      <TriangleAlert size={20} className="mt-0.5 shrink-0 text-warning" />
      <p className="font-body-sm text-body-sm text-on-surface-variant">
        Please keep this tab open and avoid refreshing the page. Closing or
        reloading may reset your position in line.
      </p>
    </div>
  );
}