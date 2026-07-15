---
name: CrowdFlow Executive
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
  secondary: '#515f74'
  on-secondary: '#ffffff'
  secondary-container: '#d5e3fd'
  on-secondary-container: '#57657b'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#0b1c30'
  on-tertiary-container: '#75859d'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#d5e3fd'
  secondary-fixed-dim: '#b9c7e0'
  on-secondary-fixed: '#0d1c2f'
  on-secondary-fixed-variant: '#3a485c'
  tertiary-fixed: '#d3e4fe'
  tertiary-fixed-dim: '#b7c8e1'
  on-tertiary-fixed: '#0b1c30'
  on-tertiary-fixed-variant: '#38485d'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
  surface-white: '#ffffff'
  border-subtle: '#e2e8f0'
  accent-blue: '#3b82f6'
typography:
  display-lg:
    fontFamily: Hanken Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  title-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gap-6: 1.5rem
  gap-8: 2rem
  container-padding: 2rem
  card-padding: 1.5rem
  section-margin: 3rem
---

## Brand & Style

The design system is engineered for high-level data visualization and operational oversight. It targets professional users who require clarity without sacrificing aesthetic sophistication. The brand personality is **Modern, Premium, and Professional**, evoking a sense of calm authority and precision.

The visual style follows a **Modern Corporate** direction with heavy influences from **Minimalism** and **Bento-Grid** layouts. It utilizes high-contrast anchor points against expansive, clean backgrounds to create a structured hierarchy that feels both compact and airy. The emotional response should be one of reliability and "high-fidelity" control—where every pixel serves a functional purpose within a luxurious digital environment.

## Colors

The palette is anchored by **Deep Slate/Navy (#0f172a)**, used for primary high-contrast elements, sidebars, or focal hero cards within the Bento grid. This is balanced against a dominance of **Pure White** and **Light Gray (#f8fafc)** to ensure the dashboard remains legible and "breathable."

- **Primary:** Deep Slate is used for critical interactive elements and dark-mode-style cards that anchor the layout.
- **Surface Strategy:** Use white for primary content cards and light gray for the global application background to create subtle depth.
- **Accents:** Use a restrained blue or slate scale for data visualization and secondary actions to maintain a professional, monochromatic lean.

## Typography

This design system uses **Hanken Grotesk** for headlines to provide a sharp, contemporary edge that feels premium. **Inter** is utilized for body text and labels to ensure maximum legibility for data-heavy dashboard modules.

Typography should follow a strict hierarchy:
- **Display & Headlines:** Use Hanken Grotesk with tight letter-spacing for a "tech-forward" look.
- **Body & Data:** Use Inter. For numerical data in dashboard widgets, favor Medium (500) or SemiBold (600) weights to ensure key metrics are scannable.
- **Captions:** Use uppercase labels for category headers within cards to reinforce the structured, professional feel.

## Layout & Spacing

The layout is divided into two distinct logical zones:
1.  **Top Section (Bento Grid):** A compact, multi-column arrangement of varying card sizes. This area is for high-level summaries and "at-a-glance" metrics.
2.  **Bottom Section (Minimalist Grid):** A more traditional, spacious grid for detailed data lists and long-form charts.

**Grid Philosophy:**
- **Fluid Grid:** Use a 12-column system that adapts to screen width.
- **Rhythm:** Maintain a firm **gap-6 (1.5rem) to gap-8 (2rem)** between all cards. This "loose" spacing is critical to achieving the premium, high-end feel. 
- **Breakpoints:**
    - **Desktop:** Full 12-column bento/grid layout.
    - **Tablet:** Shift bento cards to a 2-column stack; reduce gaps to 1rem.
    - **Mobile:** Single column flow; card padding reduces to 1rem.

## Elevation & Depth

This design system avoids heavy drop shadows in favor of **Tonal Layers** and **Low-contrast Outlines**. 

- **Surface Levels:** 
    - Level 0: Global Background (#f8fafc).
    - Level 1: Primary Cards (#ffffff) with a 1px border (#e2e8f0).
    - Level 2: High-contrast Anchor Cards (#0f172a) used sparingly in the Bento grid.
- **Shadows:** Use a single, very soft ambient shadow for "active" or "hovered" cards (0px 4px 20px rgba(15, 23, 42, 0.05)).
- **Interactions:** Use subtle scale transforms (98%) or slight border-color shifts to indicate interactivity, maintaining the flat but premium aesthetic.

## Shapes

The shape language is defined by **Rounded (0.5rem)** corners for standard UI elements like buttons and inputs, and **Rounded-XL (1.5rem)** for the main dashboard cards and Bento containers. 

This contrast between "sharp-ish" inner components and "softly rounded" outer containers creates a modern, high-fidelity appearance typical of premium OS-level dashboards.

## Components

- **Buttons:** Primary buttons use the Deep Slate (#0f172a) background with white text. Secondary buttons use a white background with a 1px slate border. Both utilize a 0.5rem corner radius.
- **Bento Cards:** Must have a 1.5rem corner radius. Use a mix of white backgrounds and Deep Slate backgrounds. Interior padding should be a consistent 1.5rem.
- **Input Fields:** Minimalist styling with a 1px subtle border (#e2e8f0). Focus states should use a 1px Deep Slate border—avoid heavy glow effects.
- **Chips/Badges:** Small, pill-shaped elements with low-saturation background tints (e.g., light blue background with dark blue text) to indicate status without cluttering the visual field.
- **Data Visualizations:** Charts should use a refined palette derived from the slate and accent-blue colors. Lines should be thin (2px) and points should be minimal.
- **Lists:** Clean rows with 1px bottom dividers. Remove all unnecessary borders; let the white space define the rows.