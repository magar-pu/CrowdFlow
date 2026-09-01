# Auditor Console: Organizer Verification & Payouts

The two review workflows the auditor portal implements today. Both are built
and wired to real data.

This document replaces the earlier `AUDITOR_FEATURES2.md` and
`PAYOUT_MODULE.md`, which described the same two modules twice and included a
large amount of design intent that was never implemented.

Routes: [routing.md](./routing.md) · API detail:
[`../swagger.yaml`](../swagger.yaml) (37 auditor endpoints).

---

# Part 1 — Organizer Verification

Organizer accounts are verified before they can submit an event for approval or
receive a payout.

## The document gate

An organizer's **account documents must be auditor-verified before an event can
be submitted**. Three documents are required:

- **KTP** (national ID)
- **NPWP** (tax number)
- **NIB** (business registration number)

Venue agreements and event proposals are *event*-scoped documents, reviewed
separately per event — they are not part of the account gate. Organizers who
existed before this gate was introduced are grandfathered.

## Application status

`application_status` is a Postgres enum:

| Status | Meaning |
|---|---|
| `pending` | Submitted, not yet picked up |
| `in_review` | An auditor is working on it |
| `needs_revision` | Sent back to the organizer with required changes |
| `approved` | Verified — full platform access |
| `rejected` | Declined |

## Screens

| Route | Purpose |
|---|---|
| `/auditor/organizers` | Organizer account list |
| `/auditor/organizers/[id]` | Full KYC detail, approve / reject / status change |
| `/auditor/documents` | Account document queue across organizers |
| `/auditor/documents/[id]` | Single document with a signed preview URL |
| `/auditor/bank-verifications` | Bank account verification queue |

## Endpoints

| Method | Path |
|---|---|
| `GET` | `/api/v1/auditor/organizers` |
| `GET` | `/api/v1/auditor/organizers/{id}` |
| `POST` | `/api/v1/auditor/organizers/{id}/approve` |
| `POST` | `/api/v1/auditor/organizers/{id}/reject` |
| `PATCH` | `/api/v1/auditor/organizers/{id}/status` |
| `POST` | `/api/v1/auditor/organizers/{id}/verify-bank` |
| `GET` | `/api/v1/auditor/documents`, `/documents/{id}`, `/documents/{id}/url` |
| `PATCH` | `/api/v1/auditor/documents/{id}/verify`, `/reject` |

Document files are served through short-lived signed URLs
(`GET .../documents/{id}/url`) rather than public links — see
[../architecture/system-overview.md](../architecture/system-overview.md).

## Bank verification queue

Organizer payout bank details live on `organizer_applications`. (Buyer bank
accounts were removed entirely — Midtrans handles inbound payment, so the
platform never needs a buyer's account number.)

The queue filters on three states:

| Filter | Meaning |
|---|---|
| `unverified` | Never checked |
| `verified` | Auditor-confirmed |
| **`changed`** | Previously verified, **then edited by the organizer** — `bank_details_updated_at` is later than `bank_verified_at` |

The `changed` state is the reason migration 0022 exists. Whoever controls the
organizer login controls where the money lands, so a moved payout destination
must resurface for review rather than silently inheriting its old verified
status.

## ⚠️ Known gap: approval doesn't take effect immediately

`RequirePlatformRole` reads roles from the **JWT**, while `/auth/me` reads the
**database**. After an auditor approves an organizer, the console opens (the
client sees the new role) but every organizer API call returns 403 until the
access token expires — up to `ACCESS_TOKEN_TTL` (15 minutes).

A fix is chosen but not built. See
[../architecture/known-issues.md](../architecture/known-issues.md).

---

# Part 2 — Payout Verification

Auditors verify an organizer's withdrawal request before funds are released.
Review happens on a **full detail page**, not a drawer.

```
Payout list → detail page → checklist → approve / revise / reject / hold
```

## Status lifecycle

`payout_status` is a Postgres enum. Migration 0023 added the four lifecycle
labels the application was already writing:

| Status | Set by |
|---|---|
| `pending` | Organizer submits |
| `need_revision` | Auditor sends back with a required reason |
| `approved` | Auditor approves |
| `on_hold` | Auditor holds |
| `rejected` | Auditor rejects |
| `processed` | Payment executed |
| `failed` | Payment failed |

## Screens

| Route | Purpose |
|---|---|
| `/auditor/payouts` | Queue, filterable by status, searchable |
| `/auditor/payouts/[id]` | Full review page |

## Revenue breakdown

The detail page shows a real per-payout financial breakdown, sourced from
`orders` — **not** from `ticket_tiers.tickets_sold`, which has no writers and
would report zero.

| Field | Notes |
|---|---|
| Tickets sold | |
| Gross revenue | |
| Platform fee | |
| Payment gateway fee | |
| **PPN (VAT)** | The VAT actually charged on the two fees (`platform_fee_ppn + gateway_fee_ppn`). The rate is stored **per order** and is never assumed to be 11% |
| Entertainment tax | |
| Refund amount | |
| **Net revenue** | What the organizer receives |

## Review checklist

Eleven items in two groups. Each records **who** checked it and **when**.

**Financial**

- `revenueMatch` — Revenue Matches Gateways
- `ticketSalesMatch` — Ticket Sales Logs Verified
- `refundCalculated` — Refunds Properly Calculated
- `platformFeeCorrect` — Platform Fees Verified
- `taxCorrect` — Entertainment/VAT Taxes Match
- `netRevenueCorrect` — Net Revenue Allocation Valid

**Compliance**

- `eventApproved` — Event Approved
- `organizerVerified` — Organizer Verified
- `requiredDocumentsComplete` — Required Documents Complete
- `noActiveInvestigation` — No Active Investigation
- `noPendingRevision` — No Pending Revision

Two design details worth preserving:

**The checklist freezes on a terminal status.** `Frozen` is computed from the
payout's status rather than stored. The checklist records what was verified
*before* the money left, so once a payout reaches a terminal state that record
must stop moving.

**One item per request.** `PATCH /payouts/{id}/checks` toggles a single item by
key, deliberately rather than writing the whole checklist. Two auditors on the
same payout would otherwise overwrite each other with a stale copy of every
other box.

## Fraud signals

Two automated checks, not a scoring model:

| Signal | Meaning |
|---|---|
| `duplicatePayout` | A matching payout request already exists |
| `suspiciousRevenue` | Revenue figures fall outside expected bounds |

These raise `hasAlert` with an `alertMessage` on the detail page. There is no
risk score, no risk level, and no ML — a human auditor makes the call.

## Actions

| Action | Endpoint | Notes |
|---|---|---|
| Approve | `POST /api/v1/auditor/payouts/{id}/approve` | |
| Request revision | `POST /api/v1/auditor/payouts/{id}/revision` | **Reason is required** — a payout returned without saying what to fix leaves the organizer guessing |
| Reject | `POST /api/v1/auditor/payouts/{id}/reject` | |
| Hold | `POST /api/v1/auditor/payouts/{id}/hold` | |
| Toggle a check | `PATCH /api/v1/auditor/payouts/{id}/checks` | Single item |
| Save notes | `PATCH /api/v1/auditor/payouts/{id}/notes` | Status untouched — what "Save Draft" does |

Notes are split: `internalNotes` (auditor-only) and `financeNotes`
(surfaced to the organizer).

---

# Part 3 — Event Review

The third auditor workflow, for completeness. An event moves through staged
review before publication.

| Route | Purpose |
|---|---|
| `/auditor/reviews` | Review queue |
| `/auditor/reviews/[id]` | Review detail |
| `/auditor/reviews/[id]/documents` | Event documents |
| `/auditor/reviews/[id]/venue` | Venue check |
| `/auditor/reviews/[id]/finance` | Financial check |
| `/auditor/reviews/[id]/revision` | Raise a revision |
| `/auditor/reviews/[id]/history` | Status history |

Actions: `approve`, `reject`, `request-changes`, plus per-document
`verify`/`reject` for both organizer documents and event documents, and
`PATCH /reviews/{id}/stage` to move the review stage.

---

## Not built

Called out because two earlier documents specified these in detail and they do
not exist:

- Risk scoring and risk levels (Low/Medium/High/Critical)
- The wider fraud suite — chargeback tracking, refund-abuse detection, sales
  spike detection, multi-account detection, fake-ticket detection
- **Senior Auditor** and **Finance Manager** roles, and any
  override/force-approve/assign-auditor capability. The platform has five roles
  — see [../architecture/auth-and-roles.md](../architecture/auth-and-roles.md)
- Report export (payout report, tax report, audit report, settlement report)
- Compliance-rate and fraud-alert dashboard aggregates
- Chargeback figures — the revenue breakdown has no chargeback field
- Any AI/OCR feature (document OCR, face verification, automated fraud scoring)
