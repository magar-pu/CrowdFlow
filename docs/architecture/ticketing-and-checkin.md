# Ticketing and Check-in

## The rotating QR ticket format

Tickets do not carry a static QR code. Instead, the ticket-holder's own
device (browser page) regenerates a fresh QR payload on a fixed interval,
computed from a secret only the server and that device's page know. The
entire rule lives in one package, `backend/internal/ticketqr`, described in
its own package doc as "the single canonical implementation of the frozen
QR contract" — it deliberately replaced three drifted copies of this same
logic that had accumulated across the scanner, organizer, and frontend code
(`ticketqr.go:1-22`).

**Wire format**, confirmed directly from `ticketqr.go:1-6`, `34-53`:

```
CF1:<ticket_uuid>:<totp>:<unix_ts>
```

- `CF1` — the only version this package understands; anything else is
  `Invalid`, with no legacy fallback parsing.
- `<totp>` — a 6-digit HOTP code (RFC 4226: HMAC-SHA1, dynamic truncation,
  mod 1,000,000), computed over a counter derived from the timestamp.
- `<unix_ts>` — the timestamp the client claims to have generated the code
  at.
- **Step interval: 20 seconds** (`StepSeconds = 20`, `ticketqr.go:42`) — the
  client recomputes the code every 20 seconds.
- **Freshness bound: 60 seconds** (`FreshnessSeconds = 60`,
  `ticketqr.go:44-48`) — checked *before* skew tolerance, and independent of
  it: this is the anti-screenshot bound, rejecting any payload whose claimed
  timestamp is more than 60 seconds from the server's clock in either
  direction.
- **Skew tolerance: ±1 step** (`SkewSteps = 1`, `ticketqr.go:50-53`) —
  absorbs client clock drift without extending the freshness bound; the
  scanner checks the exact step plus one step either side.

Verification order matters and is explicit in the code
(`ticketqr.go:137-162`): freshness is checked before the secret is even
decoded, and secret-presence is checked before any HOTP computation runs —
an empty or missing `secret_key` is always `Invalid`, never silently
accepted or derived from the ticket id (a real backdoor pattern this package
was written specifically to remove — see the package doc's mention of a
"deriveDefaultSecret backdoor" in the prior, drifted implementations).

## Booking links: two UUIDs, not one

The buyer never logs in to see their ticket. Instead, the e-ticket email
(sent as a link only — no PDF, no QR image attachment, per the plan
decision recorded in `mail/service.go:14-18`) points at:

- `GET /order-access/{orderId}` — the purchaser's order-level overview:
  lists every ticket on the order (attendee name, tier, seat label, status)
  but **never** returns a `secret_key` or NIK.
- `GET /order-access/{orderId}/tickets/{ticketId}` — the single-attendee
  page that actually renders the rotating QR; this is the only endpoint
  that returns `secret_key`.

Both routes are unauthenticated by design (`ticket/handler.go:27-40`) — the
UUIDs in the path **are** the credential (the codebase calls this
"link-as-credential"). Critically, `GetTicketAccess`
(`ticket/repository.go:458-509`) requires **both** the order UUID and the
ticket UUID to match **together** in one query
(`WHERE t.id::text = $1 AND t.order_id::text = $2`) — a ticket id alone is
not sufficient, and an order id alone is not sufficient. This two-UUID
requirement directly replaced an earlier unauthenticated `/tickets/{id}/vault`
endpoint that had no real ownership check (`userID` defaulted to `0`, and a
`$2 = 0 OR purchaser_id = $2` clause short-circuited past the intended
check) — the two-UUID design is strictly tighter than a single-id lookup
because there is no id-in-either-slot pivot that bypasses it.

A third route, `POST /order-access/{orderId}/tickets/{ticketId}/rotate`, is
the one unauthenticated route in the entire codebase that **mutates** —
purchaser-initiated secret rotation for "panic revoke" (suspected leak) or
explicit transfer. It uses the same order+ticket scoping and carries its
own, stricter rate limit (`order-access-rotate`, 10 requests / 15 minutes)
than the GET routes' 60/5 minutes.

Rotation (`RotateSecret`, `ticket/repository.go:536-569`) touches **only**
`tickets.secret_key` — it never resets `ticket_status` or removes a
check-in record. An already-admitted ticket stays admitted forever;
rotating its secret only affects what verifies on a *future* scan attempt.

## Per-seat NIK capture at checkout

`order_attendees` (migration `0032_order_attendees.sql`) captures one row
per attendee at checkout time — full name, encrypted NIK (`nik_enc`,
AES-GCM), email, phone, date of birth — scoped to a specific tier and (for
assigned seating) a specific `event_seats_matrix_id`. This is the row that
`GenerateTicketsForPaidOrder` reads to know *who* each issued ticket belongs
to; see `data-model.md` for the encryption/backfill details. NIK is
decrypted only for organizer- and ticketman-facing views — never returned
by the buyer-facing "my tickets" API.

## The ticketman portal

`event_staff` (migration `0036_event_staff.sql`) is the table that ties a
scanner account to **one specific event**: `event_id`, an opaque
non-sequential `event_code` (format like `K7QM-2F9X`) used at login instead
of the numeric event id, `status`, an activation window
(`valid_from`/`valid_until`), and `created_by_organizer_id` for the audit
trail. The same email can hold **one account per event** — email is unique
only within an event (`idx_event_staff_event_id_email`), not globally.

Two further tables scope what a staff account may actually do:

- `event_staff_gates` — which physical check-in gates (`event_gates`) the
  account is posted to.
- `event_staff_tiers` — which ticket tiers the account is authorized to
  admit. A scan against a ticket whose tier is not in this account's grant
  set reports `WRONG_TIER` — a **staff authorization** failure, distinct
  from a ticket-validity failure, per the frozen check-in contract.

An **empty grant set admits nobody, not everybody** — a staff account with
no gates/tiers assigned is maximally restricted, not unrestricted (recorded
explicitly in project history as a deliberate design choice, not an
oversight).

Ticketman login (`POST /api/ticketman/auth/login`) is entirely separate
from the platform's own `/auth/login` — see `auth-and-roles.md` for the
full session-isolation rationale (separate JWT secret, DB-revalidated on
every request). `GET /api/ticketman/auth/verify-device` is a deliberate
alias for the same handler as `GET /api/ticketman/auth/me` — both route to
`handleMe`, confirmed by a 1:1 diff of every `handle*` method against every
registered route in `internal/ticketman`.

Check-in itself runs through `internal/scanner`
(`POST /api/v1/scanner/checkin/{eventId}`, `RequireTicketman`-gated, rate
limited at 120 requests/minute per IP) — see `system-overview.md` for why
this package's own gate-CRUD routes live at a *different*, unversioned
prefix (`/api/scanner/...`) than its scan-execution routes.
