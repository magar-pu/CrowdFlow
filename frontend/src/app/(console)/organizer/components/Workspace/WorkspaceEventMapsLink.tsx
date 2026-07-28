/**
 * Workspace/WorkspaceEventMapsLink.tsx
 *
 * Event Venue tab, third panel: the map link buyers get from the event page's
 * "Open in Google Maps" button.
 *
 * Without one the buyer page searches Google Maps for the venue name plus
 * address, which lands on the wrong pin for venues with a generic name. Pasting
 * the real link fixes it for this event.
 *
 * Scoped to the event rather than the venue: `venues` is a shared catalogue with
 * no ownership, so a link stored there would be editable by every organizer on
 * the platform. The trade is that the link is re-entered per event.
 */

"use client";

import { useEffect, useState } from "react";
import { Check, ExternalLink, MapPin } from "lucide-react";
import { getEvent } from "@/lib/api/events";
import { setEventMapsUrl } from "@/lib/api/eorganizer";

interface WorkspaceEventMapsLinkProps {
  eventId: number;
}

const labelClass = "text-[10px] font-mono font-bold text-text-secondary uppercase";
const inputClass =
  "w-full h-9 px-3 border border-border-subtle rounded-lg text-xs bg-white outline-none focus:border-outline disabled:opacity-50";

export default function WorkspaceEventMapsLink({ eventId }: WorkspaceEventMapsLinkProps) {
  // `saved` is what the server holds; `value` is what is in the box. Keeping
  // them apart is what lets Save stay disabled when there is nothing to save.
  const [saved, setSaved] = useState("");
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  // Runs once per event. `loading` already starts true, so nothing is set
  // synchronously here — the state writes all land after the await.
  useEffect(() => {
    let cancelled = false;
    getEvent(eventId).then((res) => {
      if (cancelled) return;
      const current = res.success && res.data ? res.data.google_maps_url ?? "" : "";
      setSaved(current);
      setValue(current);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  const dirty = value.trim() !== saved;

  const save = async (next: string) => {
    setSaving(true);
    setError(null);
    setJustSaved(false);

    const res = await setEventMapsUrl(eventId, next);
    setSaving(false);

    if (!res.success) {
      // The 422 body carries the specific reason (bad scheme, host not allowed),
      // which is more useful to the organizer than a generic failure.
      setError(res.error?.message ?? "Failed to save the map link");
      return;
    }

    setSaved(next);
    setValue(next);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2500);
  };

  return (
    <div className="rounded-xl border border-border-subtle bg-white p-5 shadow-sm space-y-4 text-left animate-fade-in">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border-subtle pb-3">
        <div>
          <h3 className="text-base font-bold text-text-primary">Map link</h3>
          <p className="text-xs text-text-secondary">
            Where the &ldquo;Open in Google Maps&rdquo; button on your event page sends buyers.
          </p>
        </div>
        {saved !== "" && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-success/20 bg-success/10 px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-wide text-success">
            <Check className="h-3 w-3" /> Link set
          </span>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-danger/20 bg-danger/10 px-4 py-2 text-xs font-semibold text-danger">
          {error}
        </div>
      )}

      {loading ? (
        <div className="h-24 animate-pulse rounded-lg bg-surface-container-low" />
      ) : (
        <>
          {saved === "" && (
            <div className="flex items-start gap-3 rounded-lg border border-dashed border-border-subtle p-3">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-on-surface-variant" />
              <p className="text-xs text-text-secondary">
                No link set. Buyers currently get a Google Maps search for your venue
                name and address, which can resolve to the wrong place.
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <label className={labelClass} htmlFor="event-maps-url">
              Google Maps or Waze link
            </label>
            <input
              id="event-maps-url"
              type="url"
              inputMode="url"
              value={value}
              disabled={saving}
              onChange={(e) => {
                setValue(e.target.value);
                setError(null);
              }}
              className={inputClass}
              placeholder="https://maps.app.goo.gl/..."
            />
            <p className="text-[10px] text-on-surface-variant">
              Open the venue in Google Maps, tap Share, and paste the link here. Only
              google.com/maps, maps.app.goo.gl, goo.gl and waze.com links are accepted.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => save(value.trim())}
              disabled={saving || !dirty}
              className="h-10 shrink-0 rounded-lg bg-primary px-4 text-xs font-bold text-on-primary shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save link"}
            </button>

            {saved !== "" && (
              <>
                <a
                  href={saved}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-border-subtle px-3 text-xs font-semibold text-text-secondary transition-colors hover:bg-surface-container-low hover:text-text-primary"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Test link
                </a>
                <button
                  type="button"
                  onClick={() => save("")}
                  disabled={saving}
                  className="h-10 shrink-0 rounded-lg px-3 text-xs font-semibold text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
                >
                  Remove
                </button>
              </>
            )}

            {justSaved && !dirty && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-success">
                <Check className="h-3.5 w-3.5" /> Saved
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
