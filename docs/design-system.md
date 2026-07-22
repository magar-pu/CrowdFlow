# CrowdFlow Design System

Version: 1.0

Project:
CrowdFlow — Secure Ticketing. Seamless Events.

---

# Design Philosophy

CrowdFlow is a premium event ticketing platform designed for trust, speed, and simplicity.

Every interface should feel:

- Clean
- Modern
- Professional
- Premium
- Enterprise
- Friendly
- Fast

Inspired by

- Stripe
- Airbnb
- Linear
- Apple
- Notion

Avoid

- Gaming UI
- Glassmorphism everywhere
- Neon colors
- Heavy gradients
- Material Design style
- Bootstrap appearance

---

# Design Principles

## 1. Simplicity First

Every page should answer three questions immediately.

- Where am I?
- What can I do?
- What should I do next?

---

## 2. Content First

Content is more important than decoration.

Avoid unnecessary illustrations.

Avoid decorative icons.

---

## 3. Consistency

Buttons should always look identical.

Cards should always have the same spacing.

Typography should never change randomly.

---

## 4. Accessibility

Support

- Keyboard navigation
- Screen readers
- Color contrast
- Focus indicators

Never rely on color only.

---

## 5. Mobile First

Every screen is designed for mobile first.

Desktop is an enhancement.

---

# Brand

## Product Name

CrowdFlow

Tagline

Secure Ticketing. Seamless Events.

---

# Color System

## Primary

Navy

HEX

#0F172A

Usage

Navigation

Primary Button

Headers

Primary Icons

---

## Secondary

Blue

HEX

#1D4ED8

Usage

Links

Highlights

Charts

Selected State

---

## Accent

Teal

HEX

#14B8A6

Usage

CTA

Badges

Interactive Elements

Success Highlights

---

## Background

White

HEX

#FFFFFF

---

## Surface

Light Gray

HEX

#F8FAFC

Cards

Tables

Panels

---

## Border

#E2E8F0

---

## Text Primary

#0F172A

---

## Text Secondary

#64748B

---

## Success

#22C55E

---

## Warning

#F59E0B

---

## Danger

#EF4444

---

## Disabled

Background

#F1F5F9

Text

#94A3B8

---

# Color Usage Rules

Primary

Only one primary action per section.

Danger

Only destructive actions.

Warning

Only temporary states.

Never use more than three accent colors on one screen.

---

# Typography

Font

Inter

Fallback

system-ui

sans-serif

---

# Heading

H1

40px

Bold

---

H2

32px

Bold

---

H3

28px

SemiBold

---

H4

24px

SemiBold

---

H5

20px

SemiBold

---

H6

18px

Medium

---

# Body

Large

18px

Regular

---

Default

16px

Regular

---

Small

14px

Regular

---

Caption

12px

Regular

---

# Font Weight

Regular

400

Medium

500

SemiBold

600

Bold

700

---

# Spacing System

Base Unit

8px

Allowed

4

8

12

16

20

24

32

40

48

56

64

80

96

Never use arbitrary spacing.

---

# Border Radius

Button

12px

Input

12px

Card

16px

Modal

20px

Bottom Sheet

24px

Badge

999px

Avatar

999px

---

# Elevation

Level 1

Cards

shadow-sm

---

Level 2

Dropdown

shadow-md

---

Level 3

Modal

shadow-lg

Never use shadow-2xl.

---

# Grid System

Desktop

12 Columns

Tablet

8 Columns

Mobile

4 Columns

Container Width

1440px

Centered

---

# Responsive Breakpoints

Mobile

<640px

Tablet

640px

Laptop

1024px

Desktop

1280px

Large Desktop

1536px

---

# Icons

Library

Lucide React

Sizes

16

20

24

32

Never mix icon libraries.

---

# Buttons

## Primary

Background

Primary Navy

Text

White

Height

44px

---

## Secondary

White

Border

Gray

Text

Primary

---

## Outline

Transparent

Border

Primary

---

## Ghost

Transparent

No Border

---

## Link

Text Only

---

## Danger

Red Background

White Text

---

Button Sizes

Small

36px

Medium

44px

Large

52px

---

# Inputs

Height

44px

States

Default

Focus

Error

Disabled

Every input must contain

Label

Placeholder

Validation

Error Message

---

# Cards

Every card consists of

Header

Content

Footer (optional)

Padding

24px

Gap

16px

---

# Tables

Support

Sorting

Pagination

Filtering

Responsive

Loading

Empty State

Bulk Actions

Sticky Header

---

# Badge

Success

Green

Warning

Orange

Danger

Red

Info

Blue

Neutral

Gray

---

# Avatar

Sizes

32

40

48

64

96

Rounded Full

---

# Modal

Max Width

640px

Padding

32px

Rounded

20px

Close Button

Top Right

---

# Drawer

Mobile

Bottom Sheet

Desktop

Side Drawer

---

# Navigation

Public Website

Top Navigation

Dashboard

Sidebar

Mobile Dashboard

Bottom Navigation

---

# Dashboard Layout

Header

↓

Statistics

↓

Main Content

↓

Recent Activity

↓

Quick Actions

---

# Skeleton Loading

Every page requires

Skeleton

Never use spinner-only loading.

---

# Empty State

Every empty state should contain

Illustration

Title

Description

Primary Button

---

# Error State

Every error state should contain

Icon

Message

Retry Button

Support Link (optional)

---

# Toast

Types

Success

Warning

Error

Information

Position

Top Right

Mobile

Bottom

---

# Animation

Library

Framer Motion

Duration

150ms

200ms

250ms

Never exceed 300ms.

Avoid

Bounce

Shake

Flash

Spin

---

# Motion Guidelines

Page Transition

Fade

Card Hover

Lift 2px

Dropdown

Fade + Slide

Modal

Fade + Scale

Button

Opacity

---

# Images

Always use

Next Image

Support

Blur Placeholder

Lazy Loading

Responsive Images

---

# Illustrations

Style

Minimal

Flat

Soft Color

Avoid

3D

Cartoon

Anime

---

# Charts

Library

Recharts

Colors

Primary

Secondary

Accent

Success

Warning

Danger

Never use rainbow colors.

---

# Data Visualization

Maximum

6 Colors

Grid

Light Gray

Legend

Always Visible

---

# Accessibility

Minimum Touch Area

44px

Keyboard Support

Required

ARIA Labels

Required

Focus Ring

Visible

Contrast Ratio

WCAG AA

---

# Theme

Default

Light

Future

Dark Mode Ready

Dark mode should use the same spacing, typography, and layout.

Only colors change.

---

# Component Naming

Component

PascalCase

Example

EventCard

TicketCard

SeatMap

CheckoutSummary

QueueIndicator

---

# Design Tokens

Colors

colors.ts

Typography

typography.ts

Spacing

spacing.ts

Radius

radius.ts

Shadow

shadow.ts

Breakpoints

breakpoints.ts

Animation

motion.ts

---

# Design Quality Checklist

Before merging any UI:

- Uses correct colors
- Uses spacing system
- Uses typography scale
- Mobile responsive
- Accessible
- Keyboard friendly
- Loading state exists
- Empty state exists
- Error state exists
- Uses reusable components
- No duplicated UI
- Matches CrowdFlow branding

---

# Golden Rule

If a user visits any page in CrowdFlow, every screen should immediately feel like it belongs to the same product.

Consistency is more important than creativity.