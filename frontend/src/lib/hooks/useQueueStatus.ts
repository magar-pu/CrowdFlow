/**
 * lib/hooks/useQueueStatus.ts
 *
 * Drives the virtual waiting room's live position/countdown. Today this
 * simulates progress with a local interval timer (mock phase — no backend
 * yet). The Go backend's eventual real-time channel (per file.md: "the
 * virtual waiting room queue in Go will eventually use Server-Sent Events
 * or WebSockets") will replace the interval below with an EventSource/WS
 * listener that calls the same `set_status` setter — no consuming
 * component needs to change, since they all just read the returned
 * QueueStatus shape regardless of its source.
 */

import { useEffect, useRef, useState } from "react";
import type { QueueStatus } from "@/types/ticket";

const TICK_INTERVAL_MS = 1000;
const SECONDS_PER_POSITION = 3; // mock pacing: one person clears every 3s

export function useQueueStatus(initial_status: QueueStatus) {
  const [status, set_status] = useState<QueueStatus>(initial_status);
  const tick_count = useRef(0);

  useEffect(() => {
    if (status.phase === "ready" || status.phase === "expired") return;

    const interval = setInterval(() => {
      tick_count.current += 1;

      set_status((current) => {
        if (current.phase === "ready" || current.phase === "expired") {
          return current;
        }

        const should_advance =
          tick_count.current % SECONDS_PER_POSITION === 0;
        const next_position = should_advance
          ? Math.max(1, current.position - 1)
          : current.position;
        const next_total_ahead = Math.max(0, next_position - 1);
        const next_wait = Math.max(
          0,
          current.estimated_wait_seconds - 1
        );

        let next_phase: QueueStatus["phase"] = current.phase;
        if (next_position <= 1) {
          next_phase = "ready";
        } else if (next_position <= 5) {
          next_phase = "almost_ready";
        }

        return {
          ...current,
          position: next_position,
          total_ahead: next_total_ahead,
          estimated_wait_seconds: next_wait,
          phase: next_phase,
        };
      });
    }, TICK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [status.phase]);

  return status;
}