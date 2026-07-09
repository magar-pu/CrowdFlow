# CrowdFlow Component Library

Version: 1.0

Project:
CrowdFlow — Secure Ticketing. Seamless Events.

---

# Purpose

This document defines every reusable UI component used throughout CrowdFlow.

Every page should be built using components from this library.

Never duplicate components.

Always extend existing components before creating new ones.

---

# Component Categories

## Foundation

- Button
- Icon Button
- Typography
- Badge
- Avatar
- Divider
- Tooltip
- Chip

---

## Form

- Input
- Textarea
- Select
- Multi Select
- Date Picker
- Time Picker
- Date Time Picker
- Checkbox
- Radio
- Switch
- OTP Input
- Search Box
- Password Input
- File Upload
- Image Upload
- Phone Input

---

## Navigation

- Navbar
- Sidebar
- Bottom Navigation
- Breadcrumb
- Pagination
- Tabs
- Stepper
- Dropdown Menu

---

## Layout

- Container
- Card
- Section
- Grid
- Stack
- Divider

---

## Feedback

- Toast
- Alert
- Modal
- Drawer
- Bottom Sheet
- Confirmation Dialog
- Progress
- Skeleton
- Spinner

---

## Data Display

- Table
- Data Grid
- Timeline
- Accordion
- List
- Empty State
- Error State
- Statistic Card

---

## Ticketing

- Event Card
- Ticket Card
- Seat Map
- Seat Legend
- Queue Indicator
- Ticket Tier Card
- Checkout Summary
- Payment Method Card
- QR Ticket
- Ticket Timeline

---

## Dashboard

- Dashboard Header
- Metric Card
- Revenue Chart
- Sales Chart
- Activity Feed
- Notification Card
- Recent Orders
- User Profile Card

---

# Button

Purpose

Primary action.

Variants

Primary

Secondary

Outline

Ghost

Danger

Link

Sizes

Small

Medium

Large

States

Default

Hover

Pressed

Disabled

Loading

Icon Left

Supported

Icon Right

Supported

Loading Spinner

Required

---

# Icon Button

Variants

Primary

Ghost

Danger

Outline

Sizes

36

40

44

Accessibility

Always provide aria-label.

---

# Badge

Variants

Success

Warning

Danger

Info

Neutral

Dot

Rounded

Pill

Small

Medium

---

# Avatar

Sizes

32

40

48

64

96

Support

Image

Fallback Initial

Status Indicator

---

# Card

Used for

Dashboard

Event

Ticket

Profile

Statistics

Structure

Header

Content

Footer

Optional Actions

Padding

24px

Radius

16px

---

# Statistic Card

Contains

Title

Value

Trend

Icon

Comparison

Sparkline (optional)

---

# Input

States

Default

Focus

Error

Disabled

Required

Label

Placeholder

Helper Text

Error Message

Character Counter

Optional Prefix

Optional Suffix

---

# Search Box

Includes

Search Icon

Clear Button

Loading State

Recent Searches (optional)

---

# Select

Supports

Single Select

Multiple Select

Searchable

Async Loading

Grouped Items

Disabled Items

---

# File Upload

Supports

Drag & Drop

Browse Button

Preview

Progress

Validation

Maximum Size

Supported Formats

---

# Image Upload

Supports

Crop

Preview

Replace

Delete

Zoom

---

# Checkbox

Variants

Default

Indeterminate

Disabled

---

# Radio

Supports

Group

Description

Disabled

---

# Switch

States

On

Off

Disabled

Loading

---

# Date Picker

Supports

Single Date

Range

Month

Year

Time

---

# Modal

Sizes

Small

Medium

Large

Fullscreen

Components

Header

Body

Footer

Close Button

Esc Key

Supported

Backdrop Click

Configurable

---

# Drawer

Desktop

Right Side

Mobile

Bottom Sheet

Supports

Header

Footer

Scrollable Body

---

# Confirmation Dialog

Used For

Delete

Cancel

Reject

Refund

Dangerous Actions

Always

Require confirmation.

---

# Toast

Types

Success

Warning

Error

Info

Position

Top Right

Desktop

Bottom

Mobile

Auto Close

5 Seconds

---

# Skeleton

Every page requires

Skeleton

Never show empty white pages.

---

# Spinner

Only

Small loading indicator.

Never use as page loading.

---

# Alert

Variants

Info

Success

Warning

Danger

Supports

Icon

Title

Description

Action

Dismiss

---

# Empty State

Contains

Illustration

Title

Description

Primary Action

Secondary Action

---

# Error State

Contains

Illustration

Error Message

Retry Button

Support Link

---

# Table

Features

Sorting

Filtering

Pagination

Column Visibility

Sticky Header

Responsive

Row Selection

Bulk Action

Loading State

Empty State

---

# Data Grid

Supports

Inline Edit

Resizable Columns

Infinite Scroll

Virtualization

---

# Timeline

Used For

Order History

Approval History

Refund History

Ticket Activity

---

# Accordion

Supports

Single Open

Multiple Open

Nested Items

---

# Event Card

Displays

Banner

Category

Title

Organizer

Venue

Location

Date

Starting Price

Status

CTA Button

Variants

Grid

List

Compact

Featured

---

# Ticket Card

Displays

QR Preview

Event

Seat

Ticket Holder

Status

Download

Share

Transfer (Future)

---

# Ticket Tier Card

Displays

Tier Name

Price

Remaining Quota

Purchase Limit

Description

Select Button

---

# Seat Map

Supports

Zoom

Pan

Mini Map

Legend

Accessible Seats

VIP

Standing Area

Unavailable Seats

Selected Seats

---

# Seat Legend

States

Available

Reserved

Sold

Selected

VIP

Accessible

Blocked

---

# Queue Indicator

Displays

Queue Position

Estimated Wait Time

Progress

Refresh Status

---

# Checkout Summary

Displays

Tickets

Subtotal

Platform Fee

Gateway Fee

Tax

Discount

Promo

Grand Total

---

# Payment Method Card

Displays

Provider Logo

Provider Name

Fee

Estimated Verification

Selected State

---

# QR Ticket

Displays

QR Code

Ticket Number

Holder

Event

Seat

Entry Time

Dynamic Validation Status

---

# Dashboard Header

Contains

Page Title

Breadcrumb

Actions

Filters

Date Range

---

# Metric Card

Displays

Metric

Current Value

Trend

Comparison

Chart

---

# Activity Feed

Displays

Latest Activities

User

Timestamp

Status

Action

---

# Notification Card

Displays

Icon

Title

Description

Time

Read Status

Action

---

# Revenue Chart

Supports

Daily

Weekly

Monthly

Yearly

---

# Sales Chart

Supports

Ticket Sales

Revenue

Capacity

Resale

---

# User Profile Card

Displays

Avatar

Name

Role

Verification Status

Email

Phone

---

# Loading Pattern

Every page must have

Skeleton

Every table must have

Skeleton Rows

Every card must have

Skeleton Card

---

# Responsive Rules

Desktop

Full Layout

Tablet

Adaptive Layout

Mobile

Single Column

Bottom Navigation

Bottom Sheet

Sticky CTA

---

# Accessibility

Every component must support

Keyboard Navigation

Focus Ring

ARIA Labels

Screen Reader

High Contrast

Minimum Touch Target 44px

---

# Component Folder Structure

components/

ui/

button/

input/

card/

badge/

modal/

drawer/

table/

feedback/

navigation/

forms/

ticket/

dashboard/

layout/

Each component should contain

index.ts

Component.tsx

types.ts

constants.ts

README.md

test.tsx (future)

---

# Naming Convention

Button

Button.tsx

Event Card

EventCard.tsx

Ticket Card

TicketCard.tsx

Queue Indicator

QueueIndicator.tsx

Checkout Summary

CheckoutSummary.tsx

---

# Component Checklist

Before creating a new component

- Search existing component
- Reuse if possible
- Responsive
- Accessible
- Supports loading
- Supports empty state if applicable
- Supports error state if applicable
- Uses design tokens
- Uses Tailwind utility classes only
- No inline styles

---

# Golden Rule

Every screen in CrowdFlow should be assembled from reusable components.

Pages should compose components.

Components should never depend on specific pages.

A component should be reusable across the entire platform.