# Co-Organizer Delegation & Approval — Design

**Status:** Draft for review · **Branch:** `fix/super-admin` · **Author:** design pass, not yet implemented

## 1. Goal

Let an event owner (the **EO / "author"**) delegate management of their events to one or more **co-organizers (co-EOs)**. Scope is flexible:

- **specific** — one or several named events of the owner, or
- **all** — every event the owner has, **including events created in the future**.

A delegation only becomes effective **with the author's approval**. Isolation and separation-of-duties are preserved throughout.

---

## 2. Grounding: what the codebase enforces today

These three facts (verified in code) constrain every option below.

1. **Ownership is `organizer_id`-only.** `middleware.RequireEventOwnership` gates the whole organizer console (`/api/organizer/events/{id}/*` — venue, tiers, attendees, analytics, publish, delete) with `SELECT ... FROM events WHERE id=? AND organizer_id=?`. It is **role-blind** — no `user_roles` row grants console access.
2. **The event package is role-aware.** `PUT /api/v1/events/{id}` and `PATCH .../publish` use `RequireEventRole("Event Organizer")`, which *does* honor an event-scoped `user_roles` row (`ur.event_id = {id}`). So the two "organizer" surfaces authorize differently.
3. **JWT `claims.Roles` carries platform-wide roles only** (`auth/service.go:48` — `if m.EventID == nil`). Event-scoped roles are excluded by design. Consequence: the console's `verifiedOrganizer` = `RequirePlatformRole("Event Organizer")` **cannot** be satisfied by an event-scoped grant. Folding event-scoped roles into `claims.Roles` was rejected — it would let an event-scoped Auditor pass platform `Auditor` checks for *every* event (privilege escalation).

**Implication:** co-EO access cannot be expressed purely as `user_roles` rows. A co-EO needs (a) to clear the platform `verifiedOrganizer` gate, and (b) a per-event authorization signal the console actually consults. This design introduces a dedicated delegation relationship as the source of truth, and augments the ownership check to read it.

---

## 3. Data model

Two new tables. The delegation row is the source of truth for **both** the scope **and** the approval state.

```sql
-- The delegation grant + its approval lifecycle. One relationship per (owner, delegate).
CREATE TABLE organizer_delegations (
    id            SERIAL PRIMARY KEY,
    owner_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,   -- the EO / author
    delegate_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,   -- the co-EO
    scope         VARCHAR(10) NOT NULL CHECK (scope IN ('all','specific')),
    status        VARCHAR(10) NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','active','declined','revoked')),
    requested_by  INTEGER NOT NULL REFERENCES users(id),   -- owner | delegate | admin who initiated
    approved_by   INTEGER REFERENCES users(id),            -- the owner who approved (author's approval)
    note          TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    decided_at    TIMESTAMPTZ,
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (owner_id <> delegate_id),                        -- no self-delegation
    UNIQUE (owner_id, delegate_id)
);

-- For scope='specific': which of the owner's events are covered.
-- (scope='all' stores NO rows here — it covers every event where organizer_id = owner_id.)
CREATE TABLE organizer_delegation_events (
    delegation_id INTEGER NOT NULL REFERENCES organizer_delegations(id) ON DELETE CASCADE,
    event_id      INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    PRIMARY KEY (delegation_id, event_id)
);
```

**Why not reuse `user_roles`?** It has no owner linkage, no approval/status column, and cannot express "all future events." A `scope='all'` delegation auto-covers events the owner hasn't created yet — impossible with per-event rows. Keeping delegations in their own table also keeps the RBAC tables clean.

**Sources of ownership truth after this change:** `events.organizer_id` (creator/payee) **+** an active `organizer_delegations` row. Two sources, both explicit. We do **not** add a third via `user_roles`.

---

## 4. Authorization changes

### 4.1 Per-event ownership — augment `RequireEventOwnership`

Passes if any of: Super Admin (existing), `events.organizer_id = user` (existing), **or** an active delegation covers the event:

```sql
SELECT EXISTS (
  SELECT 1 FROM events WHERE id = $1 AND organizer_id = $2
  UNION ALL
  SELECT 1
    FROM organizer_delegations d
    JOIN events e ON e.id = $1
   WHERE d.delegate_id = $2
     AND d.status = 'active'
     AND (
          (d.scope = 'all'      AND d.owner_id = e.organizer_id)
       OR (d.scope = 'specific' AND EXISTS (
             SELECT 1 FROM organizer_delegation_events de
              WHERE de.delegation_id = d.id AND de.event_id = e.id))
     )
)
```

This keeps access **per-event** (or per-owner-portfolio for `all`) — organizer A still cannot touch organizer B's events unless B delegated. ✅ multiple co-EOs per event, ✅ isolation, ✅ future events covered when `scope='all'`.

### 4.2 The platform gate — `verifiedOrganizer` (**open decision D1**)

The console runs `verifiedOrganizer` (platform role) *before* ownership. A co-EO who isn't a general verified organizer would fail there. Options:

- **D1-A (recommended): require the delegate to be a verified organizer.** Delegation can only target a user who already holds the platform Event Organizer role. Cleanest and most secure; "co-organizing" implies they're an organizer. Reject with a clear error otherwise.
- **D1-B: relax the console gate to "platform Organizer role OR ≥1 active delegation."** A dedicated middleware (`RequireOrganizerConsoleAccess`) replaces `verifiedOrganizer` on the console routes; ownership still narrows to the specific event. Lets non-organizers be co-EOs, but broadens a widely-used gate.
- **D1-C: auto-grant the platform Organizer role on first active delegation.** Convenient, but silently elevates the user platform-wide.

### 4.3 Event package (`RequireEventRole`)

`PUT/publish` on the event package already honors event-scoped `user_roles`. To keep it consistent with delegations without a `user_roles` row, either (i) have this route also consult the delegation table, or (ii) accept that co-EOs manage via the organizer console only. Recommend (i) for parity — small addition mirroring §4.1.

---

## 5. Approval workflow ("author's approval")

State machine:

```
                (owner initiates)                 (owner approves)
   ─────────────────────────────► active ◄───────────────── pending
        auto-approved                │                          │
                                     │ (owner/admin revokes)    │ (owner declines)
                                     ▼                          ▼
                                  revoked                    declined
```

**Who may initiate (`requested_by`):**
- **Owner** invites a co-EO → **auto-active** (the author is the approver; `approved_by = owner`, `status='active'`).
- **Delegate** requests access to an owner's events → `pending`, awaits owner approval.
- **Super admin** proposes → `pending`, still awaits **owner approval** (honors "with the author's approval"). Whether admin may *force*-activate is **open decision D2**.

**Notifications** (reuse the `notifications` table, migration 0004): notify owner on a pending request; notify delegate on approve/decline/revoke.

---

## 6. Surfaces — where this lives (**open decision D3**)

"With the author's approval" pulls the primary surface toward the **organizer console**, not the admin panel we started in.

- **Owner (organizer console) — primary.** A "Co-organizers" panel: invite a co-EO (auto-active), review & approve/decline pending requests, set scope (pick specific events or "all"), revoke.
- **Delegate (organizer console).** Delegated events fold into their events list (badged "Co-organizer · owner X"); can request access; sees status.
- **Super admin (Users panel) — oversight.** Read-only view of a user's delegations (in/out), ability to revoke for moderation, optionally propose (→ pending owner approval). The role dropdown built last turn shows delegation-derived access **read-only**; it is not where co-EO access is granted.

---

## 7. Impact on the role work already shipped (uncommitted, last turn)

- Platform + event-scoped **role badges / Mixed / grant / revoke** stay as-is.
- **Do NOT** add "event-scoped Event Organizer" to the admin grant dropdown — co-organizing is now a *delegation*, not a `user_roles` grant. That picker item is **superseded** by this design; leave Event Organizer platform-wide in the admin dropdown (or remove it there).
- The drawer's "Roles & Access" gains a read-only **Delegations** subsection (co-EO of / delegated to).

---

## 8. Separation of duties (extend existing rule)

The SoD check added last turn (can't audit an event you organize) must also consult delegations:

- Cannot grant **Auditor** on event E to a user who is a co-EO of E (active delegation covering E).
- Cannot create a **co-EO delegation** covering E for a user who audits E.

---

## 9. Edge cases

- **`scope='all'` + owner creates a new event** → auto-covered, no action. (The core reason `all` needs a relationship, not rows.)
- **Owner deletes/transfers an event** → `specific` links cascade; `all` re-evaluates against current `organizer_id`.
- **Delegate loses the platform Organizer role** (D1-A) → console access lost at the `verifiedOrganizer` gate even if the delegation is active. Surface this coupling.
- **Payouts:** co-EOs never receive payouts. `events.organizer_id` stays the sole payee — delegations grant *management*, not money. (Confirm — **open decision D4**.)
- **Owner revokes** → `status='revoked'`, access gone immediately on next request (no token dependency — ownership is checked live in middleware).
- **Self-delegation / duplicates** → blocked by `CHECK (owner_id <> delegate_id)` and `UNIQUE(owner_id, delegate_id)`.

---

## 10. Build phases (once design is signed off)

1. **Migration** — the two tables + indexes (`delegate_id, status`; `owner_id, status`).
2. **Backend** — `delegation` package (repo/service/handlers); augment `RequireEventOwnership` (+ event-pkg role check per §4.3); `verifiedOrganizer` decision (D1); SoD extension; notifications.
3. **Frontend** — organizer console co-org panels (owner + delegate); admin oversight (read-only + revoke).
4. **Swagger** — sync new endpoints (spec lives at `swagger.yaml`, root on this branch).

---

## 11. Open decisions (need your call before implementation)

- **D1 — platform gate for co-EOs:** require verified-organizer (A, recommended) / relax console gate (B) / auto-grant platform role (C).
- **D2 — admin-initiated delegations:** still require owner approval (recommended) or allow admin force-activate?
- **D3 — primary surface:** owner-driven organizer console (recommended) with admin oversight, vs admin-driven with owner approval bolted on.
- **D4 — payouts:** confirm co-EOs never receive payouts (owner stays sole payee).
- **D5 — scope in v1:** ship both `specific` and `all` at once, or start with `specific` and add `all`/future-coverage in a follow-up?
```
