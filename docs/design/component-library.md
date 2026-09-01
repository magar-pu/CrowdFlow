# Component Library

What actually exists in `frontend/src/components/` today — 106 components
across 25 folders — and the conventions for adding to it.

This is an inventory, not a wishlist. If a component isn't listed here it
isn't built.

## How the library is organised

Components are grouped **by the screen or domain they serve**, not by
component type. There is no atoms/molecules/organisms hierarchy.

```
frontend/src/components/
├── ui/              ← the only genuinely generic primitives
├── layout/          ← public site chrome
├── auth/            ← sign-in, sign-up, session, guards
├── admin/           ← the console shell + admin/auditor screens
│   ├── layout/          shell, header, sidebar, mobile nav
│   ├── shared/          reused across console screens
│   ├── dashboard/ analytics/ events/ finance/ users/ workspace/
├── event-discovery/ ← browse and search
├── event-detail/    ← a single event's public page
├── seat-selection/  ← the buyer seat map
├── waiting-room/    ← queue
├── checkout/        ← attendee details + summary
├── booking/         ← hold timer
├── your-ticket/     ← post-purchase ticket surfaces
├── venue-editor/    ← the 2D layout designer
├── resale-marketplace/
├── documents/       ← upload slots
├── common/          ← cross-cutting one-offs
└── home-v2/ home-v3/ ← homepage iterations
```

### A caveat about `ui/`

`ui/` contains exactly **two** components: `Modal` and `Select`. This is the
real state of the codebase, not an oversight to route around — most primitives
(buttons, inputs, badges, cards) are currently written inline with Tailwind
utility classes at each call site.

Practical consequence: **do not assume a shared `Button` or `Input` exists.**
When you need one, either follow the surrounding file's inline pattern, or
promote a primitive into `ui/` deliberately and migrate the call sites you
touch. Don't add a third pattern.

`Modal` is the one primitive that *was* centralised — all modals across the app
go through `ui/Modal.tsx`. Use it; do not hand-roll an overlay.

## Inventory

### Generic primitives — `ui/`

| Component | Notes |
|---|---|
| `Modal` | The single modal implementation for the whole app |
| `Select` | Styled select |

### Site chrome — `layout/`

`Navbar`, `Footer`

### Auth — `auth/`

| Component | Notes |
|---|---|
| `AuthShell` | Page frame for all auth screens |
| `AuthGuard` | Client-side route protection — **UI only**, never the authorisation boundary |
| `SessionProvider` | Session context, refresh handling |
| `SignInForm`, `SignUpForm`, `ForgotPasswordForm` | |
| `GoogleLogin` | OAuth entry point |
| `PasswordStrengthMeter` | |
| `AuthFooterLink`, `FloatingTicketsBackground` | Presentational |

### Console — `admin/`

The console shell is shared by the admin, auditor and organizer portals.

| Folder | Components |
|---|---|
| `layout/` | `AdminShell`, `Header`, `Sidebar`, `MobileNavDrawer`, `MobileAdminBottomNav` |
| `shared/` | `Pagination`, `RejectReasonModal` |
| `dashboard/` | `DashboardView`, `DashboardStatsGrid`, `DashboardAnalyticsChart`, `DashboardSecurityAlerts` |
| `analytics/` | `AnalyticsView`, `AnalyticsOverviewTab`, `AnalyticsRegionsTab`, `AnalyticsMarketplaceTab`, `AnalyticsStatsGrid` |
| `events/` | `EventManagementView`, `CreateEventView` |
| `finance/` | `FinanceView`, `FinanceStatsGrid`, `PayoutRequestTable`, `TransactionHistory`, `SettingsView` |
| `users/` | `UserManagementView`, `UserDirectoryTable`, `UserDetailDrawer`, `UserRolesManager`, `UserDelegationsPanel`, `RoleBadge`, `VerificationQueue` |
| `workspace/` | `EventWorkspaceView`, `WorkspaceDetailsTab`, `WorkspaceTicketTiersTab`, `WorkspaceSettingsTab`, `WorkspaceLiveTrackerTab` |

Note the `View` suffix convention: `*View` components are screen-level
containers that own data fetching; the components they render are presentational.

### Event discovery — `event-discovery/`

`EventSearchHero`, `FeaturedCarousel`, `EventListingCard`, `CategoryIconsGrid`,
`FilterSidebar`, `QuickFilterBar`, `ResaleMarketplacePromo`,
`EventDiscoveryFooter`

### Event detail — `event-detail/`

`EventHero`, `AboutEventSection`, `TicketTiersSection`, `TicketCtaCard`,
`VenueInfoSection`, `VenueLayoutPreview`, `OrganizerInfoCard`

### Purchase flow

| Folder | Components |
|---|---|
| `waiting-room/` | `QueueHeader`, `QueuePositionDisplay`, `QueueProgressBar`, `QueueWarningBanner` |
| `seat-selection/` | `SeatMapHeader`, `SelectionPanel`, `MapLegend`, `MapZoomControls`, `TicketTypeSelector`, `GaTierCards` |
| `booking/` | `HoldTimer` — counts down the seat/GA hold; expiry releases inventory |
| `checkout/` | `AttendeeDetailsForm` (per-seat attendee + NIK capture), `CheckoutSummary` |

`GaTierCards` is the general-admission counterpart to the seat map — GA events
have no seats to click, so tiers are chosen as cards.

### Post-purchase — `your-ticket/`

| Component | Notes |
|---|---|
| `DigitalTicketCard` | Renders the rotating QR — see [ticketing-and-checkin.md](../architecture/ticketing-and-checkin.md) |
| `BookingWatermark` | Anti-screenshot watermark |
| `PurchaseSuccessHeader`, `TicketActions` | |
| `ResellTicketModal` | Listing a ticket on the resale marketplace |

### Venue editor — `venue-editor/`

`SeatMapperCanvas` (the HTML5 canvas), `EditorSidebar`, `FloatingToolbar`,
`HierarchyPanel`, `SeatPropertiesPanel`, `SeatArrangePanel`,
`TicketConfigPanel`, `LayoutPreview`

`SeatMapperCanvas` sets the `.canvas-grid` cell size and offset inline so the
dot grid tracks the snap step while panning and zooming.

### Resale — `resale-marketplace/`

`ResaleHeroSearch`, `ResaleFilterToolbar`, `ResaleListingCard`,
`ResaleListingDetail`

### Cross-cutting

| Component | Notes |
|---|---|
| `documents/DocumentSlot` | Shared upload slot — enforces the per-document-type size caps and runs client-side image compression |
| `common/Turnstile` | Cloudflare Turnstile widget. ⚠️ Server-side verification currently fails open — see [known-issues.md](../architecture/known-issues.md) |

### Homepage iterations — `home-v2/`, `home-v3/`

`home-v3` is current: `HeroSlider`, `SearchBar`, `TrendingEvents`,
`UpcomingConcerts`, `FlashSaleEvents`, `BentoCollections`, `EventSection`,
`StatsBanner`, `HomeFooterV3`.

`home-v2` retains only `HomeFooterV2`. Build against v3.

## Conventions

### Naming

| Kind | Convention | Example |
|---|---|---|
| Component file | PascalCase `.tsx` | `EventListingCard.tsx` |
| Screen container | `*View` | `FinanceView.tsx` |
| Tab within a screen | `*Tab` | `WorkspaceDetailsTab.tsx` |
| Panel in an editor | `*Panel` | `SeatPropertiesPanel.tsx` |
| Hook | camelCase `use*` in `lib/hooks/` | `useSeatSelection.ts` |
| API module | camelCase in `lib/api/` | `orderAccess.ts` |
| Zustand store | `*Store.ts` in `lib/store/` | `authStore.ts` |

### Imports

Always use the `@/` alias. Never `../../../`.

```tsx
import Modal from "@/components/ui/Modal";
```

### What a component may know

Presentational components receive props and render. They should not fetch,
read auth state, or contain business rules — that belongs in the `*View`
container or a hook in `lib/hooks/`.

## Before adding a component

1. **Search first.** `find frontend/src/components -iname "*Thing*"`. The
   library is domain-grouped, so a component you want may sit under a folder
   you didn't think to look in.
2. **Extend before creating.** Add a prop to the existing component rather
   than forking it.
3. **Put it in the domain folder**, not `ui/` — `ui/` is for genuinely generic
   primitives, and promoting something there is a deliberate decision that
   implies migrating existing call sites.
4. **Cover the states** — loading, empty, error, as applicable.
5. **Tokens only** — see [design-tokens.md](./design-tokens.md).

## The rule that matters

Pages compose components. Components render UI. Components never depend on the
specific page that renders them.
