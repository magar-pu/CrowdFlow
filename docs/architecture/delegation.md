# Co-Organizer Delegation

**Status: built and shipped.** Migration `0010_organizer_delegations.sql`,
`backend/internal/delegation`, and the `/organizer/co-organizers` console page.

An event owner (the organizer whose id sits in `events.organizer_id` — the
"author") can delegate management of their events to one or more
**co-organizers**. A delegation only takes effect once the owner approves it.

## Why it isn't a role

Delegation could not be expressed as `user_roles` rows, for three reasons that
still constrain the design:

1. **Ownership is `organizer_id`-only.** `middleware.RequireEventOwnership`
   gates the whole organizer console with a check against
   `events.organizer_id`. It is role-blind — no `user_roles` row grants console
   access to someone else's event.
2. **JWT `claims.Roles` carries platform-wide roles only.** Event-scoped roles
   are deliberately excluded. Folding them in was rejected: an event-scoped
   Auditor would then pass platform `Auditor` checks for *every* event.
3. **`user_roles` cannot express "all future events."** A delegation scoped to
   an owner's whole portfolio must automatically cover events that don't exist
   yet — impossible with per-event rows.

So delegation lives in its own tables, and the ownership middleware was taught
to read them.

## Data model

```sql
CREATE TABLE organizer_delegations (
    id            SERIAL PRIMARY KEY,
    owner_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    delegate_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    scope         VARCHAR(10) NOT NULL CHECK (scope IN ('all','specific')),
    status        VARCHAR(10) NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','active','declined','revoked')),
    requested_by  INTEGER NOT NULL REFERENCES users(id),
    approved_by   INTEGER REFERENCES users(id),
    note          TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    decided_at    TIMESTAMPTZ,
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (owner_id <> delegate_id),
    UNIQUE (owner_id, delegate_id)
);

CREATE TABLE organizer_delegation_events (
    delegation_id INTEGER NOT NULL REFERENCES organizer_delegations(id) ON DELETE CASCADE,
    event_id      INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    PRIMARY KEY (delegation_id, event_id)
);
```

One relationship per `(owner, delegate)` pair. The row carries **both** the
scope and the approval state.

**`scope = 'specific'`** stores one `organizer_delegation_events` row per
covered event. **`scope = 'all'`** stores **none** — it matches every event
where `organizer_id = owner_id`, including events created later. That asymmetry
is the whole point of the design; don't "normalise" it by materialising rows.

Both hot paths are indexed: `(delegate_id, status)` for the middleware check on
every console request, `(owner_id, status)` for the owner's list view.

> ⚠️ The file is named `0010_organizer_delegations.sql` but its header comment
> says "Migration 0009". The filename is authoritative — see the migration
> numbering footgun in [data-model.md](./data-model.md).

## Authorization

`RequireEventOwnership` passes if **any** of these hold:

1. The caller is **Super Admin** (checked first, from JWT claims).
2. `events.organizer_id = caller`.
3. An **active** delegation covers the event — either `scope='all'` where the
   delegation's owner is the event's organizer, or `scope='specific'` with a
   matching `organizer_delegation_events` row.

Because this is evaluated live in middleware on every request, a revocation
takes effect immediately. There is no token to wait out.

### The platform gate still applies

The organizer console sits behind `verifiedOrganizer` —
`RequirePlatformRole("Event Organizer")` — which runs *before* the ownership
check. A delegate must therefore **already hold the platform Event Organizer
role**; delegation grants per-event access, not organizer status.

Consequence worth surfacing in the UI: if a delegate loses the platform
Organizer role, they lose console access even while their delegation is still
active.

## Approval workflow

```
   owner invites  ──────────────────► active ◄────────── owner approves
   (auto-approved)                      │                       │
                                        │ owner/admin revokes   │ owner declines
                                        ▼                       ▼
                                     revoked                 declined
```

Who may initiate, recorded in `requested_by`:

| Initiator | Result |
|---|---|
| **Owner** invites a co-organizer | Immediately `active` — the author *is* the approver, so `approved_by = owner` |
| **Delegate** requests access | `pending`, awaiting the owner's approval |
| **Super admin** proposes | `pending` — still requires owner approval |

An admin cannot force-activate a delegation. Owner approval is the invariant
the feature exists to enforce.

## API

Organizer-facing (bare `/api/organizer/...`, not `/api/v1` — see the versioning
note in [system-overview.md](./system-overview.md)):

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/organizer/delegations` | Delegations the caller granted |
| `GET` | `/api/organizer/delegations/received` | Delegations granted *to* the caller |
| `POST` | `/api/organizer/delegations` | Owner invites a co-organizer → `active` |
| `POST` | `/api/organizer/delegations/request` | Delegate requests access → `pending` |
| `POST` | `/api/organizer/delegations/{id}/approve` | Owner approves |
| `POST` | `/api/organizer/delegations/{id}/decline` | Owner declines |
| `PUT` | `/api/organizer/delegations/{id}` | Change scope / covered events |
| `DELETE` | `/api/organizer/delegations/{id}` | Revoke |

Admin oversight: `GET /users/{id}/delegations`, `DELETE /delegations/{id}`.

## Surfaces

| Portal | Where | What |
|---|---|---|
| Organizer (owner) | `/organizer/co-organizers` | Invite, approve/decline pending requests, set scope, revoke |
| Organizer (delegate) | `/organizer/events` | Delegated events appear in the normal list |
| Admin | `UserDelegationsPanel` in the user drawer | Read-only view of a user's delegations in/out, plus revoke for moderation |

Delegation is **not** granted from the admin role dropdown. Co-organizing is a
delegation, not a role — the admin picker deliberately does not offer
"event-scoped Event Organizer".

## Separation of duties

The SoD rule that stops someone auditing an event they organize also consults
delegations (`backend/internal/admin/repository.go`):

- You cannot grant **Auditor** on event E to an active co-organizer of E.
- You cannot create a co-organizer delegation covering E for a user who audits E.

## Settled behaviours

| Question | Decision |
|---|---|
| Can a co-organizer receive payouts? | **No.** `events.organizer_id` remains the sole payee. Delegation grants management, not money |
| Owner deletes an event | `specific` links cascade away; `all` re-evaluates against the current `organizer_id` |
| Owner creates a new event under `scope='all'` | Auto-covered, no action needed |
| Self-delegation / duplicates | Blocked by `CHECK (owner_id <> delegate_id)` and `UNIQUE (owner_id, delegate_id)` |
| Revocation latency | Immediate — ownership is checked live, not from the token |
