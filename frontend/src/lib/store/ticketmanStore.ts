/**
 * lib/store/ticketmanStore.ts
 *
 * Session-display state for the /ticketman portal. The actual session lives
 * in the httpOnly `ticketman_access_token` cookie set by the backend — this
 * store only caches the last-known SessionInfo for the UI (name, event,
 * gate) so the shell doesn't flash empty on every navigation. Auth is always
 * re-verified against the server via getTicketmanMe(), never trusted from
 * this cache alone.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { TicketmanSession } from "@/lib/api/ticketman";

interface TicketmanState {
  session: TicketmanSession | null;
  set_session: (session: TicketmanSession) => void;
  clear_session: () => void;
}

export const useTicketmanStore = create<TicketmanState>()(
  persist(
    (set) => ({
      session: null,
      set_session: (session) => set({ session }),
      clear_session: () => set({ session: null }),
    }),
    { name: "cf-ticketman-session" }
  )
);
