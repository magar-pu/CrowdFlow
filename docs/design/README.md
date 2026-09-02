# Design

How CrowdFlow looks, and the rules that keep it consistent.

| Document | Read it when |
|---|---|
| [design-system.md](./design-system.md) | You want the philosophy, the principles, and the pre-merge checklist |
| [design-tokens.md](./design-tokens.md) | You need a specific colour, size, radius or shadow |
| [component-library.md](./component-library.md) | You're about to build UI and want to know what already exists |

## The one-paragraph version

Every visual constant lives in `frontend/src/app/globals.css` inside an
`@theme` block. There is no `tailwind.config.ts` — Tailwind v4 generates
utility classes directly from those CSS variables. Components consume the
generated utilities (`bg-surface`, `text-headline-lg`, `shadow-elevated`) and
never hardcode a hex value. Components are grouped by domain under
`src/components/`, not by type, and `ui/` holds only genuinely generic
primitives — currently just `Modal` and `Select`.

## Before you write UI

1. Search `src/components/` for something close — it's domain-grouped, so look
   beyond the folder you expect.
2. Check [design-tokens.md](./design-tokens.md) for the value you need. If it
   isn't there, add a token rather than an arbitrary value.
3. Cover loading, empty and error states.
4. Test at 375px wide.
5. Leave the focus outline alone.

See also [../architecture/frontend.md](../architecture/frontend.md) for the
code architecture behind these screens.
