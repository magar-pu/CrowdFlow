"use client";

/**
 * app/events/[event_id]/queue/page.tsx
 *
 * Virtual Waiting Room — shown before seat selection for high-demand
 * events (event.is_high_demand). The Stitch export for this screen
 * shipped only a <head> with color tokens and two CSS animations
 * (ambient pulse + progress shimmer) and an EMPTY <body> — there was no
 * markup to port. This page is built from those two animations plus the
 * functional requirements in file.md (anti-bot queueing, SSE/WebSocket-
 * ready state), staying visually consistent with every other page we've
 * already built from real Stitch markup.
 *
 * useQueueStatus currently simulates progress locally. Swap its internals
 * for a real EventSource/WebSocket listener once the Go backend's queue
 * stream exists — no component below needs to change.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { QueueHeader } from "@/components/waiting-room/QueueHeader";
import { QueuePositionDisplay } from "@/components/waiting-room/QueuePositionDisplay";
import { QueueProgressBar } from "@/components/waiting-room/QueueProgressBar";
import { QueueWarningBanner } from "@/components/waiting-room/QueueWarningBanner";
import { useQueueStatus } from "@/lib/hooks/useQueueStatus";
import { mockEvent } from "@/mock/eventData";
import type { QueueStatus } from "@/types/ticket";

const MOCK_INITIAL_STATUS: QueueStatus = {
  queue_id: "queue_evt_001_demo",
  event_id: "evt_001_soundscape_festival_2026",
  position: 47,
  total_ahead: 46,
  total_in_queue: 3200,
  estimated_wait_seconds: 141,
  phase: "waiting",
  session_token: "mock_session_token",
};

export default function VirtualWaitingRoomPage() {
  const router = useRouter();
  const event = mockEvent; // TODO: replace with getEvent(event_id) once the Go API exists
  const status = useQueueStatus(MOCK_INITIAL_STATUS);

  useEffect(() => {
    if (status.phase === "ready") {
      const redirect_timer = setTimeout(() => {
        router.push(`/events/${event.event_id}/seats`);
      }, 1500);
      return () => clearTimeout(redirect_timer);
    }
  }, [status.phase, event.event_id, router]);

  return (
    <div className="flex min-h-screen flex-col items-center bg-surface">
      <QueueHeader event_title={event.title} />

      <main className="flex w-full flex-1 flex-col items-center justify-center gap-stack-lg px-margin-mobile py-section-gap md:px-margin-desktop">
        <QueuePositionDisplay status={status} />
        <QueueProgressBar
          position={status.position}
          total_in_queue={status.total_in_queue}
        />
        {status.phase !== "ready" && <QueueWarningBanner />}
      </main>
    </div>
  );
}