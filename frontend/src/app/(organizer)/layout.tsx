/**
 * app/(organizer)/layout.tsx
 *
 * Shared shell for every organizer-facing page: fixed-width sidebar +
 * scrollable main content area. The active_href is hardcoded per-page for
 * now (passed down via a simple prop) since Next.js doesn't give the
 * layout the current pathname without `usePathname()` — once more
 * dashboard sub-pages exist, swap this layout to a small client wrapper
 * that calls usePathname() so the sidebar highlights correctly everywhere.
 */

export default function OrganizerLayout({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return <div className="flex h-screen overflow-hidden">{children}</div>;
  }