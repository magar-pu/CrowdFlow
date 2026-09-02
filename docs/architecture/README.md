# CrowdFlow Architecture Documentation

A from-scratch onboarding doc set for this codebase: a Go (`net/http`)
backend and a Next.js frontend implementing an event ticketing platform with
four portals (buyer, organizer, auditor/admin, and a separate ticketman
scanner portal).

## Suggested reading order

1. **[system-overview.md](system-overview.md)** — the services, how they
   talk to each other, the four portals, and the `/api/v1` versioning
   situation (including two known, deliberate inconsistencies worth
   understanding before you touch routing).
2. **[data-model.md](data-model.md)** — the core tables, per-seat/per-event
   tiering, where money figures actually come from, and how the migration
   system works (including its two real footguns: duplicate migration
   numbers and the two-entries-per-migration rule).
3. **[auth-and-roles.md](auth-and-roles.md)** — the two separate session
   systems (ordinary users vs. ticketman staff), the five platform roles,
   how organizer approval interacts with them, and the middleware set
   (including a "Super Admin auto-passes" trap that has already shaped one
   real design decision elsewhere in this doc set).
4. **[purchase-and-inventory.md](purchase-and-inventory.md)** — the buyer
   flow end to end: holds (seat locks vs. the reworked GA capacity
   mechanism), order creation, Midtrans Snap, the webhook, and the two-layer
   guarantee against overselling.
5. **[ticketing-and-checkin.md](ticketing-and-checkin.md)** — the rotating
   QR ticket format, booking links as bearer credentials, per-seat NIK
   capture, and the ticketman portal.
6. **[frontend.md](frontend.md)** — how `frontend/` is actually built: the
   stack (and the widely-assumed libraries it deliberately does *not* use),
   the fetch/refresh layer, state management, and the edge middleware
   (including a two-cookie session check that has already been broken once
   by "simplification").
7. **[delegation.md](delegation.md)** — co-organizer delegation: why it
   could not be modelled as a role, how `RequireEventOwnership` reads it,
   and the approval workflow.
8. **[known-issues.md](known-issues.md)** — what's actually broken today,
   why it matters, and its practical impact. Read this last, with the rest
   of the doc set as context.

Related, outside this folder: [../design/](../design/README.md) for the visual
system, [../reference/routing.md](../reference/routing.md) for the full route
table, and [../swagger.yaml](../swagger.yaml) for API schemas.

## Scope and verification note

This documentation was written by reading the current code on this branch
directly — route registration in `backend/main.go`, the migrations
directory, and the relevant `internal/*` packages — rather than by
restating project history at face value. Where an internal design note or
handoff and the current code appeared to disagree, the code's actual
current behavior is what got written down; historical claims that no longer
match the code are noted as superseded where relevant (see `data-model.md`'s
section on `tickets_sold`, and `known-issues.md`'s email-delivery item, for
examples of exactly this kind of update).
