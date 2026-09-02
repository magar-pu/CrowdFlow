# CrowdFlow Documentation

An event ticketing platform: Go (`net/http`) backend, Next.js frontend,
PostgreSQL, Redis, S3-compatible storage, Midtrans payments.

## Where to start

**New to the codebase?** → [onboarding/](./onboarding/README.md), then
[architecture/](./architecture/README.md).

**Deploying or debugging an environment?** → [operations/](./operations/deployment.md).

**Building a screen?** → [design/](./design/README.md) and
[architecture/frontend.md](./architecture/frontend.md).

**Looking up a route or endpoint?** → [reference/routing.md](./reference/routing.md)
or [swagger.yaml](./swagger.yaml).

## Map

### [onboarding/](./onboarding/README.md) — day one

| Document | Contents |
|---|---|
| [README.md](./onboarding/README.md) | Prerequisites through a running app |
| [local-development.md](./onboarding/local-development.md) | Day-to-day dev loop |
| [environment-configuration.md](./onboarding/environment-configuration.md) | Every env var, per environment |

### [architecture/](./architecture/README.md) — how it works

| Document | Contents |
|---|---|
| [system-overview.md](./architecture/system-overview.md) | Services, portals, the `/api/v1` versioning situation |
| [data-model.md](./architecture/data-model.md) | Core tables, tiering, money, the migration system |
| [auth-and-roles.md](./architecture/auth-and-roles.md) | Two session systems, five roles, the middleware set |
| [purchase-and-inventory.md](./architecture/purchase-and-inventory.md) | Holds, orders, Midtrans, the anti-oversell guarantee |
| [ticketing-and-checkin.md](./architecture/ticketing-and-checkin.md) | Rotating QR, booking links, the ticketman portal |
| [frontend.md](./architecture/frontend.md) | Next.js structure, API layer, state, middleware |
| [delegation.md](./architecture/delegation.md) | Co-organizer delegation and approval |
| [known-issues.md](./architecture/known-issues.md) | **What's actually broken today** |

### [operations/](./operations/deployment.md) — running it

| Document | Contents |
|---|---|
| [deployment.md](./operations/deployment.md) | CI/CD, GHCR images, tag promotion, the deploy scripts |
| [migrations-runbook.md](./operations/migrations-runbook.md) | Writing and applying migrations safely |
| [troubleshooting.md](./operations/troubleshooting.md) | Symptom → cause for recurring failures |

### [design/](./design/README.md) — how it looks

| Document | Contents |
|---|---|
| [design-system.md](./design/design-system.md) | Philosophy, principles, state coverage, quality checklist |
| [design-tokens.md](./design/design-tokens.md) | Every token in `globals.css` |
| [component-library.md](./design/component-library.md) | The 106 components that exist, and conventions |

### [reference/](./reference/README.md) — lookup

| Document | Contents |
|---|---|
| [routing.md](./reference/routing.md) | Every frontend route and API prefix |
| [auditor-and-payouts.md](./reference/auditor-and-payouts.md) | Organizer verification, payout review, event review |
| [system-analysis.md](./reference/system-analysis.md) | Whole-system overview: problem, objectives, architecture, verification |

### [swagger.yaml](./swagger.yaml)

OpenAPI 3.0.3, 163 paths. Kept in sync with the Go route surface — when you add
or change a route, update it in the same change.

## Conventions in this doc set

- **Documents describe what the code does**, not what it was meant to do. Where
  a design note and the code disagreed, the code won and the divergence is
  called out.
- **Unbuilt features are listed as unbuilt**, in an explicit section, rather
  than described in the present tense.
- **Known defects live in
  [known-issues.md](./architecture/known-issues.md)**, and other documents link
  to it rather than restating it.

If you change behaviour that a document describes, update the document in the
same commit. A doc that drifts is worse than no doc.
