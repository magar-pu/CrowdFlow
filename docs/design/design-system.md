# Design System

CrowdFlow's visual language: what the product should feel like, and the rules
that keep 60-odd screens looking like one product.

The concrete values behind everything here live in
[design-tokens.md](./design-tokens.md), which is generated from
`frontend/src/app/globals.css`. This document is the *why*; that one is the
*what*.

## Design philosophy

CrowdFlow is an event ticketing platform, and ticketing is a trust purchase —
someone is paying real money for a promise about a future evening. The
interface has to feel dependable before it feels clever.

Every screen should read as: **clean, modern, professional, fast.**

Reference points: Stripe, Airbnb, Linear, Notion.

Deliberately avoided:

- Gaming or entertainment-industry UI (neon, heavy gradients, glow effects)
- Glassmorphism everywhere — `.glass-card` exists but is used sparingly, on
  hero overlays, not as a default surface
- Material Design or Bootstrap defaults
- Decorative illustration that doesn't carry information

## Principles

### 1. Simplicity first

Every page should answer three questions without the user thinking:

- Where am I?
- What can I do here?
- What should I do next?

If a screen has more than one primary action, it has none.

### 2. Content first

The event, the seat, the price, the ticket. Decoration is subordinate to the
thing the user came for. Avoid decorative icons that repeat the adjacent label.

### 3. Consistency over creativity

Buttons look identical everywhere. Cards share spacing. Typography never
changes on a whim. A user who learns one screen has learned all of them.

This is the reason the token system exists, and the reason
[component-library.md](./component-library.md) asks you to search before you
create.

### 4. Accessibility is not optional

- Keyboard navigation on every interactive element
- Visible focus — `globals.css` sets a 2px action-blue `:focus-visible` outline
  platform-wide; do not override it away
- Colour is never the only signal; pair it with an icon or label
- `prefers-reduced-motion` is honoured globally, so animation is safe to add
- Minimum 44px touch targets on mobile

### 5. Mobile first

Buyers are on phones, often at a venue, often on bad signal. Design the phone
layout first and treat desktop as the enhancement — never the reverse.

This is load-bearing, not aspirational: the ticket page and the ticketman
check-in portal are used almost exclusively on phones, in the dark, in a queue.

## Brand

**CrowdFlow** — *Secure Ticketing. Seamless Events.*

The palette is three colors doing three jobs:

| Role | Token | Job |
|---|---|---|
| Deep navy | `--color-primary` `#0f172a` | Authority and trust — primary buttons, headlines, navigation |
| Action blue | `--color-secondary` `#1d4ed8` | Interactivity — links, focus rings, active nav |
| Teal | `--color-tertiary` `#14b8a6` | Accents and AI-assisted features |

Navy carries the brand; blue carries the interaction. Keeping those separate is
what makes a focus ring read as "you can act here" rather than as decoration.

## Surfaces and depth

Depth comes from the **surface ramp**, not from shadows. A card on the page
background steps from `--color-surface` to `--color-surface-container-lowest`;
a panel inside that card steps up again.

Shadows are reserved for elements that genuinely float above the page —
modals, drawers, popovers (`--shadow-overlay`) and raised cards
(`--shadow-elevated`). There are only those two, on purpose.

## Typography

One family, Inter, and a fixed scale of ten steps. Headlines are tight
(negative tracking, 600–700 weight); body text is comfortable (400 weight,
1.5 line-height); labels are small and slightly tracked-out.

Use `text-headline-lg-mobile` rather than inventing an intermediate size when
`text-headline-lg` is too big on a phone.

## State coverage

Every data-driven surface needs four states, and a screen is not finished
until all four exist:

| State | Requirement |
|---|---|
| **Loading** | Skeleton that matches the real layout — rows for tables, cards for grids. Never a bare spinner on a full page, never a blank screen |
| **Empty** | Title, one sentence of explanation, and a primary action if one exists |
| **Error** | Human-readable message. Never surface a raw backend error string |
| **Success** | The actual content |

## Responsive strategy

Phone → tablet → desktop, in that order. The console shells
(`admin/layout/AdminShell.tsx` and its siblings) already implement the
sidebar-to-drawer and bottom-navigation patterns — reuse them rather than
rebuilding a responsive shell.

## Quality checklist

Before merging any UI change:

- [ ] Uses tokens — no hardcoded hex, no arbitrary Tailwind values
- [ ] Uses the typography scale
- [ ] Works at 375px wide
- [ ] Keyboard reachable, focus visible
- [ ] Loading state exists
- [ ] Empty state exists (if it renders a list)
- [ ] Error state exists (if it fetches)
- [ ] Reuses an existing component rather than duplicating one
- [ ] Touch targets ≥ 44px

## The rule that matters

If a user visits any page in CrowdFlow, every screen should immediately feel
like it belongs to the same product.

Consistency is more important than creativity.
