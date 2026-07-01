---
name: CrowdFlow
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#45464d'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#565e74'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#131b2e'
  on-primary-container: '#7c839b'
  inverse-primary: '#bec6e0'
  secondary: '#1d4ed8'
  on-secondary: '#ffffff'
  secondary-container: '#4069f2'
  on-secondary-container: '#fffbff'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#00201c'
  on-tertiary-container: '#009485'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#dce1ff'
  secondary-fixed-dim: '#b7c4ff'
  on-secondary-fixed: '#001551'
  on-secondary-fixed-variant: '#0039b5'
  tertiary-fixed: '#71f8e4'
  tertiary-fixed-dim: '#4fdbc8'
  on-tertiary-fixed: '#00201c'
  on-tertiary-fixed-variant: '#005048'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
  success: '#22C55E'
  warning: '#F59E0B'
  danger: '#EF4444'
  text-primary: '#0F172A'
  text-secondary: '#64748B'
  border-subtle: '#E2E8F0'
  surface-white: '#FFFFFF'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-max: 1280px
  gutter: 1.5rem
  margin-mobile: 1rem
  margin-desktop: 2.5rem
  stack-sm: 0.5rem
  stack-md: 1rem
  stack-lg: 2rem
  section-gap: 5rem
---

## Brand & Style

The design system is engineered for a premium, enterprise-grade ticketing ecosystem. It balances the high-stakes reliability of financial software with the excitement of live entertainment. The brand personality is authoritative, sophisticated, and technologically advanced, targeting large-scale event organizers and discerning ticket buyers.

The visual direction follows a **Corporate / Modern** style with heavy influences from **Minimalism** and **Tactile** design. It emphasizes extreme clarity, generous whitespace, and a meticulous hierarchy. Surfaces should feel high-end, utilizing subtle depth and precise alignment to establish trust. The overall aesthetic is "Engineered Luxury"—functional enough for a data-heavy auditor dashboard, yet polished enough for a premium concert discovery experience.

## Colors

This design system utilizes a high-contrast palette anchored by **Deep Navy** to convey stability and enterprise authority. **Blue** serves as the primary action color for navigation and functional interactions, while **Teal** is reserved for accents, AI-powered features, and highlighted states.

The color system is designed for "Dark Mode Ready" implementation. Use `#FFFFFF` for the base background and `#F8FAFC` for surface containers to create a subtle layered effect. Semantic colors (Success, Warning, Danger) are vibrant to ensure immediate recognition in high-pressure environments like real-time queue management or ticket validation.

## Typography

The system relies exclusively on **Inter** to maintain a systematic, utilitarian aesthetic that scales from complex data tables to marketing heroes. 

- **Headlines:** Use Bold (700) for primary titles and Semi-Bold (600) for section headers. Tighten letter spacing on larger sizes to mimic premium editorial styles.
- **Body:** Use Regular (400) weight. Maintain a generous line height (1.5x) to ensure readability during long administrative sessions.
- **Labels:** Use Semi-Bold for interactive elements and small uppercase labels to provide visual distinction from body text.

## Layout & Spacing

This design system uses a **Fixed Grid** model for desktop dashboards and a **Fluid Grid** for the public discovery experience. 

- **Desktop:** 12-column grid with 24px (1.5rem) gutters. Content is centered within a 1280px container.
- **Tablet:** 8-column grid with 20px gutters.
- **Mobile:** 4-column grid with 16px margins. 

The spacing rhythm is "Generous." Use large vertical gaps (`section-gap`) between homepage blocks to allow content to breathe. In dashboard contexts, prioritize white space over borders to define groups, ensuring the interface never feels "cramped" despite high information density.

## Elevation & Depth

Hierarchy is established through **Tonal Layers** and **Ambient Shadows**. 

1.  **Level 0 (Background):** Pure `#FFFFFF`.
2.  **Level 1 (Surfaces):** `#F8FAFC` cards or containers with no shadow and a subtle `#E2E8F0` border.
3.  **Level 2 (Interactive):** Elevated cards or modals using "Stripe-style" shadows: a combination of a small, sharp shadow and a large, soft, low-opacity (4-6%) blur.
4.  **Level 3 (Overlays):** Modals and dropdowns use a deep, diffused shadow with a subtle navy tint (`#0F172A` at 10% opacity) to anchor the element in the foreground.

Avoid inner shadows or heavy bevels. Use backdrop blurs (12px-20px) behind sticky navigation bars and modals to maintain context.

## Shapes

The shape language is "Rounded" to soften the corporate edge of the Navy palette. 

- **Buttons & Inputs:** Use the base `0.5rem` (8px) radius.
- **Cards & Event Banners:** Use `rounded-lg` (1rem / 16px) to create a friendly, modern container.
- **Modals & Large UI Blocks:** Use `rounded-xl` (1.5rem / 24px) for a premium, mobile-app-like feel on desktop.
- **Interactive Seat Map:** Individual seats should remain slightly rounded (2px-4px) to maintain a tactile feel without sacrificing the grid's precision.

## Components

- **Buttons:** Primary buttons use a solid Navy (`#0F172A`) background with white text. Secondary buttons use a subtle gray border with a Blue (`#1D4ED8`) text hover state. Use a "Pill" variant for the Ticket Resale Marketplace to distinguish it from the primary ticketing flow.
- **Inputs:** Clean, white backgrounds with `#E2E8F0` borders. On focus, the border transitions to Blue (`#1D4ED8`) with a 2px soft outer glow.
- **Cards:** Event cards feature high-quality imagery with a `rounded-lg` corner. Metadata (Date/Price) should be clearly separated using secondary text weights.
- **Chips/Badges:** Use "Success" green for verified tickets and "Danger" red for sold-out states. Badges should have a low-opacity background tint of their respective color.
- **Seat Selection:** Available seats use a light teal tint; selected seats use the solid Primary Navy. Use smooth AlpineJS transitions for pan and zoom interactions.
- **AI Venue Builder:** Use "Animated Skeletons" and a distinct Teal (`#14B8A6`) pulse effect during the AI detection phase to signify active processing.
- **Tickets:** Digital tickets should utilize a physical metaphor—subtle "perforated" edges or notch cut-outs—to reinforce the concept of ownership.