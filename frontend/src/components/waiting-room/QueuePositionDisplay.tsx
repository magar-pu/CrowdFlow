/**
 * components/waiting-room/QueuePositionDisplay.tsx
 *
 * The centerpiece of the waiting room: a large circular position counter
 * on a softly pulsing ambient gradient (teal-to-blue radial glow), plus a
 * phase-aware status line. The ambient pulse and progress shimmer are the
 * only concrete visual cues that survived in the Stitch export's
 * (otherwise empty) virtual_waiting_room screen — both are recreated here
 * faithfully via Tailwind's arbitrary keyframes rather than guessed from
 * scratch.
 */

import { Users, Clock } from "lucide-react";
import type { QueueStatus } from "@/types/ticket";

interface QueuePositionDisplayProps {
  status: QueueStatus;
}

function formatWaitTime(total_seconds: number): string {
  const minutes = Math.floor(total_seconds / 60);
  const seconds = total_seconds % 60;
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}

const PHASE_COPY: Record<QueueStatus["phase"], string> = {
  waiting: "You're in line. Please don't refresh or close this page.",
  almost_ready: "Almost there — get ready, your turn is coming up soon.",
  ready: "It's your turn! Redirecting you to seat selection...",
  expired: "Your session has expired. Please rejoin the queue.",
};

export function QueuePositionDisplay({ status }: QueuePositionDisplayProps) {
  return (
    <div className="relative flex w-full max-w-lg flex-col items-center">
      {/* Ambient pulsing backdrop, ported from the Stitch screen's .ambient-bg keyframes */}
      <div
        className="pointer-events-none absolute -top-20 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full opacity-80 [animation:pulse-ambient_8s_ease-in-out_infinite_alternate]"
        style={{
          background:
            "radial-gradient(circle at 50% 0%, rgba(20,184,166,0.10) 0%, rgba(29,78,216,0.05) 50%, transparent 100%)",
        }}
      />
      <style>{`
        @keyframes pulse-ambient {
          0% { transform: translateX(-50%) scale(1); opacity: 0.8; }
          100% { transform: translateX(-50%) scale(1.08); opacity: 1; }
        }
      `}</style>

      {/* Position circle */}
      <div className="relative z-10 mb-stack-lg flex h-56 w-56 flex-col items-center justify-center rounded-full border-4 border-secondary/15 bg-surface-white shadow-elevated">
        <span className="font-label-sm text-label-sm uppercase tracking-wider text-text-secondary">
          Your Position
        </span>
        <span className="font-headline-xl text-headline-xl tabular-nums text-primary">
          {status.phase === "ready" ? "0" : status.position}
        </span>
        <span className="font-body-sm text-body-sm text-text-secondary">
          of {status.total_in_queue.toLocaleString("en-US")}
        </span>
      </div>

      {/* Phase message */}
      <p className="relative z-10 mb-stack-md text-center font-body-lg text-body-lg text-primary">
        {PHASE_COPY[status.phase]}
      </p>

      {/* Secondary stats */}
      <div className="relative z-10 flex items-center gap-6 font-label-md text-label-md text-text-secondary">
        <div className="flex items-center gap-1.5">
          <Users size={18} />
          <span>{status.total_ahead.toLocaleString("en-US")} ahead of you</span>
        </div>
        <div className="h-4 w-px bg-border-subtle" />
        <div className="flex items-center gap-1.5">
          <Clock size={18} />
          <span>~{formatWaitTime(status.estimated_wait_seconds)} left</span>
        </div>
      </div>
    </div>
  );
}