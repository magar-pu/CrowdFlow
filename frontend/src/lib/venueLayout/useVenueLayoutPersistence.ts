/**
 * lib/venueLayout/useVenueLayoutPersistence.ts
 *
 * Orchestrates persisting/loading the venue-editor layout against the backend.
 * Page-agnostic: any page holding a real integer venueId can call save()/load().
 * Keeps the API calls out of the store and the components (the store only holds
 * the pure mapping actions; this hook wires them to lib/api/venueLayouts).
 */

"use client";

import { useCallback, useState } from "react";
import { useVenueEditorStore } from "@/lib/store/venueEditorStore";
import { createLayout, saveLayout, getLayout } from "@/lib/api/venueLayouts";

export interface PersistResult {
  ok: boolean;
  error?: string;
}

export function useVenueLayoutPersistence() {
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Persist the current editor state to `venueId`. On the first save it creates
   * the layout (claiming ownership) to obtain an id + optimistic-lock token,
   * then PUTs the full diff and folds the returned id maps back into the store.
   */
  const save = useCallback(async (venueId: number): Promise<PersistResult> => {
    setSaving(true);
    setError(null);
    try {
      const store = useVenueEditorStore.getState();
      let layoutId = store.layout_id;

      if (layoutId == null) {
        const created = await createLayout(venueId, {
          name: store.venue_name || "Untitled Layout",
          visibility: store.layout_visibility,
        });
        if (!created.success || !created.data) {
          const message = created.error?.message ?? "Failed to create layout";
          setError(message);
          return { ok: false, error: message };
        }
        layoutId = created.data.id;
        // Records the id + updated_at so build_save_request() has the lock token.
        store.set_layout_meta(created.data.id, created.data.updated_at);
      }

      const payload = useVenueEditorStore.getState().build_save_request();
      const res = await saveLayout(venueId, layoutId, payload);
      if (!res.success || !res.data) {
        const message = res.error?.message ?? "Failed to save layout";
        setError(message);
        return { ok: false, error: message };
      }

      const { layout, seat_id_map, section_id_map } = res.data;
      store.apply_saved_ids(seat_id_map, section_id_map);
      store.set_layout_meta(layout.id, layout.updated_at);
      return { ok: true };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unexpected error saving layout";
      setError(message);
      return { ok: false, error: message };
    } finally {
      setSaving(false);
    }
  }, []);

  /** Load a persisted layout by id and hydrate the editor state from it. */
  const load = useCallback(async (layoutId: number): Promise<PersistResult> => {
    setLoading(true);
    setError(null);
    try {
      const res = await getLayout(layoutId);
      if (!res.success || !res.data) {
        const message = res.error?.message ?? "Failed to load layout";
        setError(message);
        return { ok: false, error: message };
      }
      useVenueEditorStore.getState().load_layout_detail(res.data);
      return { ok: true };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unexpected error loading layout";
      setError(message);
      return { ok: false, error: message };
    } finally {
      setLoading(false);
    }
  }, []);

  return { save, load, saving, loading, error };
}
