# Design Tokens

Every visual constant in CrowdFlow lives in **one file**:
`frontend/src/app/globals.css`.

There is **no `tailwind.config.ts`** in this project. It uses Tailwind CSS v4's
CSS-first configuration: tokens are declared as CSS custom properties inside an
`@theme { }` block, and Tailwind generates the matching utility classes from
them automatically. Declaring `--color-surface` is what makes `bg-surface`,
`text-surface`, and `border-surface` exist.

That is the whole mechanism. If a utility class you expect doesn't work, the
token isn't in `@theme`.

## How to use a token

Reference the generated utility, not the hex value:

```tsx
// Good — reads the token
<div className="bg-surface-container text-on-surface rounded-lg shadow-elevated" />

// Bad — the token now has two sources of truth
<div style={{ backgroundColor: "#eceef0" }} />
<div className="bg-[#eceef0]" />
```

Inside custom CSS, use `var(--token-name)` directly — that is how the
`@layer utilities` block at the bottom of `globals.css` does it.

## Colors

### Brand

| Token | Value | Used for |
|---|---|---|
| `--color-primary` | `#0f172a` | Deep navy — primary buttons, headlines |
| `--color-on-primary` | `#ffffff` | Text on primary |
| `--color-primary-container` | `#131b2e` | |
| `--color-on-primary-container` | `#7c839b` | |
| `--color-secondary` | `#1d4ed8` | Action blue — links, focus states, nav highlight |
| `--color-on-secondary` | `#ffffff` | |
| `--color-secondary-container` | `#4069f2` | |
| `--color-on-secondary-container` | `#fffbff` | |
| `--color-tertiary` | `#14b8a6` | Teal — AI features, accents |
| `--color-on-tertiary` | `#ffffff` | |
| `--color-tertiary-container` | `#00201c` | |
| `--color-on-tertiary-container` | `#009485` | |

### Surfaces

The surface ramp runs from lowest (white) to highest (most tinted). Use it for
elevation without shadows — a card on a page, a panel inside a card.

| Token | Value |
|---|---|
| `--color-surface` | `#f7f9fb` |
| `--color-surface-dim` | `#d8dadc` |
| `--color-surface-bright` | `#f7f9fb` |
| `--color-surface-white` | `#ffffff` |
| `--color-surface-container-lowest` | `#ffffff` |
| `--color-surface-container-low` | `#f2f4f6` |
| `--color-surface-container` | `#eceef0` |
| `--color-surface-container-high` | `#e6e8ea` |
| `--color-surface-container-highest` | `#e0e3e5` |
| `--color-surface-variant` | `#e0e3e5` |

### Foreground (`on-*` roles)

Each surface has a matching foreground. Pair them — `on-surface` on `surface`,
`on-primary` on `primary` — and contrast takes care of itself.

| Token | Value |
|---|---|
| `--color-on-surface` | `#191c1e` |
| `--color-on-surface-variant` | `#45464d` |
| `--color-inverse-surface` | `#2d3133` |
| `--color-inverse-on-surface` | `#eff1f3` |
| `--color-background` | `#f7f9fb` |
| `--color-on-background` | `#191c1e` |
| `--color-text-primary` | `#0f172a` |
| `--color-text-secondary` | `#64748b` |

### Outlines

| Token | Value |
|---|---|
| `--color-outline` | `#76777d` |
| `--color-outline-variant` | `#c6c6cd` |
| `--color-border-subtle` | `#e2e8f0` |

### Semantic

| Token | Value |
|---|---|
| `--color-success` | `#22c55e` |
| `--color-on-success` | `#ffffff` |
| `--color-warning` | `#f59e0b` |
| `--color-on-warning` | `#ffffff` |
| `--color-danger` | `#ef4444` |
| `--color-error` | `#ba1a1a` |
| `--color-on-error` | `#ffffff` |
| `--color-error-container` | `#ffdad6` |
| `--color-on-error-container` | `#93000a` |

Note there are **two** red tokens. `--color-danger` is the bright red used for
destructive buttons and alerts; `--color-error` is the darker Material-derived
red that pairs with `--color-error-container`. They are not interchangeable —
match whichever one the surrounding component already uses.

### Venue editor zones

Seat-map section colors, used by the venue editor and the buyer seat map.

| Token | Value |
|---|---|
| `--color-accent-blue` | `#3b82f6` |
| `--color-vip-purple` | `#8b5cf6` |
| `--color-gold-yellow` | `#eab308` |
| `--color-ga-green` | `#22c55e` |

## Typography

One family: **Inter**, loaded from Google Fonts at the top of `globals.css`.
`--font-sans: "Inter", sans-serif`.

The scale uses Tailwind v4's compound text tokens, so a single class
(`text-headline-lg`) carries size, line-height, letter-spacing and weight
together.

| Token | Size / line-height | Weight | Tracking |
|---|---|---|---|
| `--text-headline-xl` | 48 / 56 | 700 | -0.02em |
| `--text-headline-lg` | 32 / 40 | 700 | -0.02em |
| `--text-headline-lg-mobile` | 28 / 36 | 700 | — |
| `--text-headline-md` | 24 / 32 | 600 | -0.01em |
| `--text-headline-sm` | 20 / 28 | 600 | — |
| `--text-body-lg` | 18 / 28 | 400 | — |
| `--text-body-md` | 16 / 24 | 400 | — |
| `--text-body-sm` | 14 / 20 | 400 | — |
| `--text-label-md` | 14 / 20 | 600 | 0.05em |
| `--text-label-sm` | 12 / 16 | 500 | — |

`headline-lg-mobile` exists because `headline-lg` is too large on phones — swap
it at the `sm:` breakpoint rather than inventing an in-between size.

## Border radius

| Token | Value | Used for |
|---|---|---|
| `--radius-sm` | `0.25rem` (4px) | |
| `--radius-DEFAULT` | `0.5rem` (8px) | Buttons & inputs |
| `--radius-md` | `0.75rem` (12px) | |
| `--radius-lg` | `1rem` (16px) | Cards & event banners |
| `--radius-xl` | `1.5rem` (24px) | Modals & large UI blocks |
| `--radius-full` | `9999px` | Pills, avatars |

## Spacing

Layout constants only — for ordinary gaps and padding, use Tailwind's built-in
numeric scale (`p-4`, `gap-6`).

| Token | Value |
|---|---|
| `--spacing-container-max` | `1280px` |
| `--spacing-gutter` | `1.5rem` |
| `--spacing-margin-mobile` | `1rem` |
| `--spacing-margin-desktop` | `2.5rem` |
| `--spacing-stack-sm` | `0.5rem` |
| `--spacing-stack-md` | `1rem` |
| `--spacing-stack-lg` | `2rem` |
| `--spacing-section-gap` | `5rem` |

## Shadows

Only two, both navy-tinted rather than neutral black:

| Token | Purpose |
|---|---|
| `--shadow-elevated` | Cards and raised surfaces — a small sharp shadow plus a large soft low-opacity blur |
| `--shadow-overlay` | Modals, drawers, popovers — deep diffused shadow |

There is deliberately no `sm`/`md`/`lg` shadow ramp. Depth is carried by the
surface-container ramp instead, and shadows are reserved for genuinely floating
elements.

## Base layer

`@layer base` in the same file sets three things you inherit for free:

- `body` gets `--color-surface`, `--color-text-primary`, and Inter with
  antialiasing.
- `:focus-visible` gets a 2px `--color-secondary` outline at 2px offset. **Do
  not remove focus outlines** in components — this is the platform-wide
  keyboard affordance.
- `@media (prefers-reduced-motion: reduce)` collapses all animation,
  transition, and scroll behavior. Any animation you add is already covered.

## Custom utilities

`@layer utilities` defines the handful of things Tailwind can't express:

| Class | What it does |
|---|---|
| `.glass-card` | Translucent white + 12px backdrop blur + subtle border |
| `.shimmer` | Sweeping highlight gradient, 3s loop — skeleton loading |
| `.seat-dot` | 14px seat square in the venue editor, with `:hover` / `.active` / `.selected` states |
| `.canvas-grid` | Radial-dot grid background; cell size and offset are set inline by `SeatMapperCanvas` so dots track the snap step during pan/zoom |
| `.animate-scanline` | Vertical laser sweep for the check-in scanner |
| `.animate-fade-in` | 0.3s staggered card entrance |
| `.animate-spin-slow` | 12s rotation |

## Rules

1. **No hardcoded hex values in components.** If you need a color that isn't
   here, add a token first.
2. **No arbitrary Tailwind values** (`bg-[#eceef0]`, `text-[13px]`) for things
   the scale already covers.
3. **Changing a token changes the whole app.** That is the point — a token edit
   should never require touching a component.
4. **Add tokens to `@theme`, not `:root`.** Only `@theme` generates utilities.
