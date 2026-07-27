/**
 * Workspace/WorkspaceVenuePicker.tsx
 *
 * Event Venue tab, first panel: which venue is this event held at.
 *
 * The creation wizard captures only the event's identity and schedule, so this
 * is where an event gets a venue at all. Pick one from the catalogue, or create
 * one inline when it isn't there yet. Publishing is gated on this being set.
 *
 * Changing an already-set venue invalidates the bound layout and its seat
 * overlay, so we warn before saving; the backend refuses outright once seats
 * have been sold or blocked.
 */

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, Check, MapPin, Plus, X } from "lucide-react";
import { listVenues, type Venue } from "@/lib/api/venues";
import { setEventVenue, type NewVenueInput } from "@/lib/api/eorganizer";
import Select from "@/components/ui/Select";

interface WorkspaceVenuePickerProps {
  eventId: number;
  /** The event's current venue id; 0 when none has been set yet. */
  venueId: number;
  /** Fires after a successful save so the layout binder can refetch. */
  onVenueChanged: () => void;
}

const labelClass = "text-[10px] font-mono font-bold text-text-secondary uppercase";
const inputClass =
  "w-full h-9 px-3 border border-border-subtle rounded-lg text-xs bg-white outline-none focus:border-outline disabled:opacity-50";

const EMPTY_NEW_VENUE: NewVenueInput = {
  name: "",
  address: "",
  city: "",
  province: "",
  postalCode: "",
  totalCapacity: 0,
};

export default function WorkspaceVenuePicker({
  eventId,
  venueId,
  onVenueChanged,
}: WorkspaceVenuePickerProps) {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // null means "no explicit pick yet, follow the event's current venue". Derived
  // rather than synced in an effect, so a save elsewhere is reflected instantly.
  const [pickedId, setPickedId] = useState<number | null>(null);
  const selectedId = pickedId ?? venueId;
  const [creating, setCreating] = useState(false);
  const [newVenue, setNewVenue] = useState<NewVenueInput>(EMPTY_NEW_VENUE);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await listVenues();
    if (res.success && res.data) {
      setVenues(res.data);
    } else {
      setError(res.error?.message ?? "Failed to load venues");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const currentVenue = useMemo(
    () => venues.find((v) => v.venue_id === venueId) ?? null,
    [venues, venueId],
  );

  const save = async (payload: { venueId?: number; newVenue?: NewVenueInput }) => {
    setSaving(true);
    setError(null);
    const res = await setEventVenue(eventId, payload);
    setSaving(false);
    if (!res.success) {
      setError(res.error?.message ?? "Failed to set the venue");
      return false;
    }
    setPickedId(null); // back to following the event's (now updated) venue
    onVenueChanged();
    return true;
  };

  const handleSaveExisting = async () => {
    if (selectedId <= 0 || selectedId === venueId) return;
    // Switching venues drops the layout the event is bound to, because that
    // layout is geometry belonging to the OLD venue.
    if (
      venueId > 0 &&
      !window.confirm(
        "Changing the venue clears this event's bound layout and any seat pricing painted on it. Continue?",
      )
    ) {
      return;
    }
    await save({ venueId: selectedId });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVenue.name.trim() || !newVenue.address.trim() || !newVenue.city.trim()) {
      setError("Venue name, street address and city are required");
      return;
    }
    if (
      venueId > 0 &&
      !window.confirm(
        "Changing the venue clears this event's bound layout and any seat pricing painted on it. Continue?",
      )
    ) {
      return;
    }
    if (await save({ newVenue })) {
      setNewVenue(EMPTY_NEW_VENUE);
      setCreating(false);
      // The inline venue is now in the catalogue — pick it up for the dropdown.
      load();
    }
  };

  const setField = (field: keyof NewVenueInput, value: string | number) =>
    setNewVenue((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="rounded-xl border border-border-subtle bg-white p-5 shadow-sm space-y-4 text-left animate-fade-in">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border-subtle pb-3">
        <div>
          <h3 className="text-base font-bold text-text-primary">Venue</h3>
          <p className="text-xs text-text-secondary">
            Where this event is held. Required before you can submit it for review.
          </p>
        </div>
        {venueId > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-success/20 bg-success/10 px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-wide text-success">
            <Check className="h-3 w-3" /> Venue set
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
          {venueId > 0 ? (
            <div className="flex items-start gap-3 rounded-lg border border-border-subtle bg-surface-container-low p-3">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
              <div className="text-xs">
                <p className="font-bold text-text-primary">
                  {currentVenue?.name ?? `Venue #${venueId}`}
                </p>
                <p className="text-text-secondary">
                  {[currentVenue?.address, currentVenue?.city, currentVenue?.province]
                    .filter(Boolean)
                    .join(", ") || "No address on file"}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 rounded-lg border border-dashed border-border-subtle p-3">
              <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-on-surface-variant" />
              <p className="text-xs text-text-secondary">
                No venue set yet. Pick one below to unlock the seat map and seat pricing.
              </p>
            </div>
          )}

          {!creating ? (
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-[220px] flex-1 space-y-1.5">
                <label className={labelClass} htmlFor="workspace-venue-select">
                  {venueId > 0 ? "Change venue" : "Select venue"}
                </label>
                <Select
                  id="workspace-venue-select"
                  value={selectedId || ""}
                  disabled={saving}
                  onChange={(e) => setPickedId(Number(e.target.value))}
                >
                  <option value="">
                    {venues.length === 0 ? "No venues in the catalogue yet" : "— Select a venue —"}
                  </option>
                  {venues.map((v) => (
                    <option key={v.venue_id} value={v.venue_id}>
                      {v.name}
                      {v.city ? ` — ${v.city}` : ""}
                    </option>
                  ))}
                </Select>
              </div>
              <button
                type="button"
                onClick={handleSaveExisting}
                disabled={saving || selectedId <= 0 || selectedId === venueId}
                className="h-10 shrink-0 rounded-lg bg-primary px-4 text-xs font-bold text-on-primary shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save venue"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setCreating(true);
                  setError(null);
                }}
                disabled={saving}
                className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-border-subtle px-3 text-xs font-semibold text-text-secondary transition-colors hover:bg-surface-container-low hover:text-text-primary disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" /> New venue
              </button>
            </div>
          ) : (
            <form onSubmit={handleCreate} className="space-y-4 rounded-lg border border-border-subtle p-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-text-primary">New venue</h4>
                <button
                  type="button"
                  onClick={() => {
                    setCreating(false);
                    setNewVenue(EMPTY_NEW_VENUE);
                    setError(null);
                  }}
                  aria-label="Cancel new venue"
                  className="rounded-md p-1 text-text-secondary transition-colors hover:bg-surface-container-low hover:text-text-primary"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1.5 md:col-span-2">
                  <label className={labelClass} htmlFor="venue-name">Venue Name</label>
                  <input
                    id="venue-name"
                    type="text"
                    value={newVenue.name}
                    onChange={(e) => setField("name", e.target.value)}
                    className={inputClass}
                    placeholder="e.g. Istora Senayan"
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className={labelClass} htmlFor="venue-address">Street Address</label>
                  <input
                    id="venue-address"
                    type="text"
                    value={newVenue.address}
                    onChange={(e) => setField("address", e.target.value)}
                    className={inputClass}
                    placeholder="e.g. Jl. Pintu Satu Senayan"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className={labelClass} htmlFor="venue-city">City</label>
                  <input
                    id="venue-city"
                    type="text"
                    value={newVenue.city}
                    onChange={(e) => setField("city", e.target.value)}
                    className={inputClass}
                    placeholder="e.g. Jakarta"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className={labelClass} htmlFor="venue-province">Province</label>
                  <input
                    id="venue-province"
                    type="text"
                    value={newVenue.province}
                    onChange={(e) => setField("province", e.target.value)}
                    className={inputClass}
                    placeholder="e.g. DKI Jakarta"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className={labelClass} htmlFor="venue-postal">Postal Code</label>
                  <input
                    id="venue-postal"
                    type="text"
                    value={newVenue.postalCode}
                    onChange={(e) => setField("postalCode", e.target.value)}
                    className={inputClass}
                    placeholder="e.g. 10270"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className={labelClass} htmlFor="venue-capacity">Total Capacity</label>
                  <input
                    id="venue-capacity"
                    type="number"
                    min={0}
                    value={newVenue.totalCapacity || ""}
                    onChange={(e) => setField("totalCapacity", Number(e.target.value))}
                    className={inputClass}
                    placeholder="e.g. 7000"
                  />
                </div>
              </div>

              <p className="text-[10px] text-on-surface-variant">
                A venue with the same name and city is reused rather than duplicated.
              </p>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="h-10 rounded-lg bg-primary px-4 text-xs font-bold text-on-primary shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Create & use venue"}
                </button>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  );
}
