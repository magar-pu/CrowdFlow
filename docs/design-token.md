# CrowdFlow Design Tokens

Version: 1.0

Project:
CrowdFlow — Secure Ticketing. Seamless Events.

---

# Purpose

Design Tokens define the visual language of CrowdFlow.

Every UI component must consume these tokens instead of using hardcoded values.

Never hardcode:

- Colors
- Border Radius
- Spacing
- Shadows
- Typography
- Animation
- Z-index

Always reference tokens.

---

# Token Naming Convention

Category

↓

Property

↓

Variant

↓

State

Example

color.primary.default

color.primary.hover

spacing.6

radius.lg

shadow.md

font.heading.h1

motion.fast

---

# Colors

## Brand

Primary

#0F172A

Secondary

#1D4ED8

Accent

#14B8A6

---

## Background

Default

#FFFFFF

Secondary

#F8FAFC

Tertiary

#F1F5F9

Inverse

#0F172A

---

## Surface

Default

#FFFFFF

Muted

#F8FAFC

Hover

#F1F5F9

Pressed

#E2E8F0

Disabled

#CBD5E1

---

## Border

Default

#E2E8F0

Strong

#CBD5E1

Focus

#1D4ED8

Danger

#EF4444

Success

#22C55E

Warning

#F59E0B

---

## Typography

Primary

#0F172A

Secondary

#64748B

Muted

#94A3B8

Disabled

#CBD5E1

Inverse

#FFFFFF

---

## Status

Success

#22C55E

Warning

#F59E0B

Danger

#EF4444

Info

#1D4ED8

---

## Ticket Status

Available

#22C55E

Reserved

#F59E0B

Sold

#EF4444

Selected

#1D4ED8

VIP

#7C3AED

Accessible

#14B8A6

Blocked

#64748B

---

# Opacity

100%

1

95%

0.95

90%

0.9

80%

0.8

60%

0.6

40%

0.4

20%

0.2

10%

0.1

5%

0.05

---

# Typography

Font Family

Inter

Fallback

system-ui

sans-serif

---

# Font Size

xs

12px

sm

14px

base

16px

lg

18px

xl

20px

2xl

24px

3xl

30px

4xl

36px

5xl

48px

6xl

60px

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

ExtraBold

800

---

# Line Height

Tight

1.2

Normal

1.5

Relaxed

1.75

---

# Letter Spacing

Tight

-0.02em

Normal

0

Wide

0.02em

---

# Spacing Scale

0

0

1

4px

2

8px

3

12px

4

16px

5

20px

6

24px

8

32px

10

40px

12

48px

14

56px

16

64px

20

80px

24

96px

32

128px

40

160px

48

192px

---

# Border Radius

none

0

xs

4px

sm

8px

md

12px

lg

16px

xl

20px

2xl

24px

full

9999px

---

# Border Width

thin

1px

medium

2px

thick

4px

---

# Shadows

none

None

sm

0 1px 2px rgba(15,23,42,.05)

md

0 4px 6px rgba(15,23,42,.08)

lg

0 10px 15px rgba(15,23,42,.10)

xl

0 20px 25px rgba(15,23,42,.12)

Never use stronger shadows.

---

# Blur

none

0

sm

4px

md

8px

lg

12px

xl

16px

---

# Breakpoints

xs

480px

sm

640px

md

768px

lg

1024px

xl

1280px

2xl

1536px

---

# Container Width

sm

640px

md

768px

lg

1024px

xl

1280px

2xl

1440px

---

# Grid

Desktop

12 Columns

Tablet

8 Columns

Mobile

4 Columns

Gap

24px

---

# Z Index

base

0

dropdown

100

sticky

200

overlay

300

drawer

400

modal

500

popover

600

toast

700

tooltip

800

alwaysOnTop

999

---

# Motion

Fast

150ms

Normal

200ms

Slow

300ms

Very Slow

500ms

---

# Easing

Default

ease

In

ease-in

Out

ease-out

In Out

ease-in-out

---

# Icon Size

xs

16px

sm

20px

md

24px

lg

32px

xl

40px

2xl

48px

---

# Avatar Size

xs

24px

sm

32px

md

40px

lg

48px

xl

64px

2xl

96px

---

# Button Height

Small

36px

Medium

44px

Large

52px

---

# Input Height

Small

36px

Medium

44px

Large

52px

---

# Card

Padding

24px

Gap

16px

Radius

16px

---

# Modal

Radius

20px

Padding

32px

Maximum Width

640px

---

# Drawer

Desktop Width

480px

Mobile Height

80%

---

# Navbar

Desktop Height

72px

Mobile Height

64px

---

# Sidebar

Width

280px

Collapsed

88px

---

# Bottom Navigation

Height

72px

---

# Table

Header Height

52px

Row Height

56px

Cell Padding

16px

---

# Touch Target

Minimum

44px

Recommended

48px

---

# Animation Presets

Fade

Opacity

Slide Up

TranslateY

Slide Down

TranslateY

Scale

Scale 95 → 100

Hover Lift

TranslateY -2px

Never use

Bounce

Flash

Shake

Spin

---

# Skeleton

Card

Rounded

Table

Rounded

Avatar

Circle

Button

Rounded

---

# Focus Ring

Width

2px

Color

Primary Blue

Offset

2px

---

# Dark Mode (Future)

The token names remain identical.

Only values change.

Example

color.background.default

Light

#FFFFFF

Dark

#020617

Never create separate token names for dark mode.

---

# Token Usage Rules

Always use tokens.

Never hardcode:

- #FFFFFF
- #000000
- 16px
- 24px
- border-radius values
- transition duration

Wrong

padding: 23px;

Correct

spacing.6

Wrong

color: #0F172A

Correct

color.text.primary

---

# Tailwind Mapping

Primary

bg-primary

Secondary

bg-secondary

Accent

bg-accent

Surface

bg-surface

Border

border-border

Text

text-primary

Muted

text-secondary

Success

bg-success

Danger

bg-danger

Warning

bg-warning

---

# Figma Naming

Colors/

Brand/

Background/

Surface/

Typography/

Spacing/

Radius/

Shadow/

Motion/

Typography/

Components/

Use the same naming across Figma and codebase.

---

# Golden Rule

A designer and a developer should use the exact same token names.

Changing a token should automatically update the entire application without modifying individual components.