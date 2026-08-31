/**
 * components/checkout/AttendeeDetailsForm.tsx
 *
 * One attendee capture form per ticket in the hold — one per held seat for
 * assigned seating, one per unit of quantity for general admission. Collects
 * full name, NIK, email, phone and date of birth, which the backend writes to
 * order_attendees and later copies onto the issued ticket
 * (see internal/ticket.GenerateTicketsForPaidOrder).
 *
 * NIK is validated client-side as exactly 16 digits so a buyer finds out
 * before paying, not after; the backend re-validates the same shape and is
 * the actual authority.
 */

"use client";

import { useMemo } from "react";
import type { HoldDetail } from "@/lib/api/booking";

export interface AttendeeFormValue {
  /** Present only for an assigned-seating slot; absent for GA. */
  seat_id?: number;
  ticket_tier_id: number;
  full_name: string;
  nik: string;
  email: string;
  phone: string;
  /** yyyy-mm-dd */
  dob: string;
}

/** One ticket's worth of attendee capture, labelled the way the buyer saw it. */
interface AttendeeSlot {
  key: string;
  label: string;
  seat_id?: number;
  ticket_tier_id: number;
}

const NIK_PATTERN = /^\d{16}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Builds one slot per ticket in the hold, in a stable order. */
export function slotsFromHold(hold: HoldDetail): AttendeeSlot[] {
  const slots: AttendeeSlot[] = [];
  for (const item of hold.items) {
    if (item.seats.length > 0) {
      for (const seat of item.seats) {
        slots.push({
          key: `seat-${seat.seat_id}`,
          label: `${item.tier_name} — Row ${seat.row}, Seat ${seat.number}`,
          seat_id: seat.seat_id,
          ticket_tier_id: item.ticket_tier_id,
        });
      }
    } else {
      for (let i = 0; i < item.quantity; i++) {
        slots.push({
          key: `ga-${item.ticket_tier_id}-${i}`,
          label: `${item.tier_name} — Ticket ${i + 1} of ${item.quantity}`,
          ticket_tier_id: item.ticket_tier_id,
        });
      }
    }
  }
  return slots;
}

export function emptyAttendee(slot: AttendeeSlot): AttendeeFormValue {
  return {
    seat_id: slot.seat_id,
    ticket_tier_id: slot.ticket_tier_id,
    full_name: "",
    nik: "",
    email: "",
    phone: "",
    dob: "",
  };
}

/** Reports whether every attendee slot is filled and NIK/email are well-formed. */
export function attendeesValid(attendees: AttendeeFormValue[]): boolean {
  if (attendees.length === 0) return false;
  return attendees.every(
    (a) =>
      a.full_name.trim().length > 0 &&
      NIK_PATTERN.test(a.nik) &&
      EMAIL_PATTERN.test(a.email) &&
      a.phone.trim().length > 0 &&
      a.dob.trim().length > 0
  );
}

interface AttendeeDetailsFormProps {
  hold: HoldDetail;
  value: AttendeeFormValue[];
  on_change: (value: AttendeeFormValue[]) => void;
}

const INPUT_CLASS =
  "w-full rounded-lg border border-border-subtle bg-surface-white px-3 py-2 text-sm text-text-primary outline-none transition-colors focus:border-secondary focus:ring-1 focus:ring-secondary";

export function AttendeeDetailsForm({ hold, value, on_change }: AttendeeDetailsFormProps) {
  const slots = useMemo(() => slotsFromHold(hold), [hold]);

  function update(index: number, patch: Partial<AttendeeFormValue>) {
    const next = value.slice();
    next[index] = { ...next[index], ...patch };
    on_change(next);
  }

  return (
    <div className="rounded-2xl border border-border-subtle bg-surface-white p-6 sm:p-8 shadow-sm">
      <h2 className="mb-1 font-headline-sm text-headline-sm font-bold text-primary">
        Attendee Details
      </h2>
      <p className="mb-6 text-xs sm:text-sm text-text-secondary">
        Every ticket is issued to a named attendee. Enter each person&apos;s ID
        details exactly as they appear on their KTP — the gate staff checks
        this against the ticket at entry.
      </p>

      <div className="space-y-6">
        {slots.map((slot, index) => {
          const attendee = value[index] ?? emptyAttendee(slot);
          const nik_touched = attendee.nik.length > 0;
          const nik_valid = NIK_PATTERN.test(attendee.nik);

          return (
            <div
              key={slot.key}
              className="rounded-xl border border-border-subtle p-4 sm:p-5"
            >
              <p className="mb-3 font-label-md text-label-md font-bold text-primary">
                {slot.label}
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-xs font-semibold text-text-secondary">
                  Full name (as on KTP)
                  <input
                    className={INPUT_CLASS}
                    value={attendee.full_name}
                    onChange={(e) => update(index, { full_name: e.target.value })}
                    placeholder="Budi Santoso"
                  />
                </label>

                <label className="flex flex-col gap-1 text-xs font-semibold text-text-secondary">
                  NIK (16 digits)
                  <input
                    className={INPUT_CLASS}
                    value={attendee.nik}
                    inputMode="numeric"
                    maxLength={16}
                    onChange={(e) =>
                      update(index, { nik: e.target.value.replace(/\D/g, "") })
                    }
                    placeholder="3174012509900001"
                  />
                  {nik_touched && !nik_valid && (
                    <span className="text-[11px] font-normal text-error">
                      NIK must be exactly 16 digits.
                    </span>
                  )}
                </label>

                <label className="flex flex-col gap-1 text-xs font-semibold text-text-secondary">
                  Email
                  <input
                    type="email"
                    className={INPUT_CLASS}
                    value={attendee.email}
                    onChange={(e) => update(index, { email: e.target.value })}
                    placeholder="budi@email.com"
                  />
                </label>

                <label className="flex flex-col gap-1 text-xs font-semibold text-text-secondary">
                  Phone
                  <input
                    className={INPUT_CLASS}
                    value={attendee.phone}
                    onChange={(e) => update(index, { phone: e.target.value })}
                    placeholder="+62812345678"
                  />
                </label>

                <label className="flex flex-col gap-1 text-xs font-semibold text-text-secondary sm:col-span-2">
                  Date of birth
                  <input
                    type="date"
                    className={INPUT_CLASS}
                    value={attendee.dob}
                    onChange={(e) => update(index, { dob: e.target.value })}
                  />
                </label>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
