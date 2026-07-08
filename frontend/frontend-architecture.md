# CrowdFlow Frontend Architecture

Version: 1.0

Project

CrowdFlow — Secure Ticketing. Seamless Events.

---

# Goal

The frontend architecture must be

- Scalable
- Maintainable
- Modular
- Feature-based
- Easy for new developers
- Easy for AI assistants

Business logic must never be mixed with UI.

---

# Tech Stack

Framework

Next.js 15

Language

TypeScript

UI

TailwindCSS

shadcn/ui

State

TanStack Query

Zustand

Forms

React Hook Form

Validation

Zod

HTTP Client

Axios

Animation

Framer Motion

Charts

Recharts

Icons

Lucide React

---

# Architecture Philosophy

Use Feature-Based Architecture.

Instead of organizing by file type,

organize by business feature.

Bad

components/

pages/

hooks/

services/

Good

features/events

features/auth

features/payment

features/tickets

---

# Folder Structure

src/

app/

components/

features/

hooks/

services/

providers/

store/

lib/

types/

constants/

styles/

config/

assets/

public/

---

# App Folder

Responsible only for routing.

Contains

layout.tsx

page.tsx

loading.tsx

error.tsx

not-found.tsx

No business logic.

---

# Features Folder

Each business domain owns itself.

Example

features/

auth/

events/

tickets/

checkout/

payment/

queue/

dashboard/

profile/

notification/

resale/

organizer/

auditor/

admin/

---

# Feature Structure

Example

features/events/

components/

hooks/

services/

schemas/

types/

utils/

constants/

pages/

No feature should import another feature directly.

Shared logic belongs elsewhere.

---

# Shared Components

Reusable UI.

components/

ui/

layout/

feedback/

navigation/

charts/

forms/

tables/

ticket/

dashboard/

---

# Services

Global API services.

Example

auth.service.ts

event.service.ts

payment.service.ts

queue.service.ts

ticket.service.ts

---

# Hooks

Global hooks only.

Examples

useDebounce

useLocalStorage

useWindowSize

useTheme

Business hooks stay inside features.

---

# Lib

Utility libraries.

Examples

axios.ts

dayjs.ts

formatCurrency.ts

formatDate.ts

logger.ts

---

# Config

Contains

API URL

Environment

Routes

Feature Flags

---

# Constants

Contains

Roles

Status

Colors

Routes

Permissions

Regex

---

# Providers

Contains

ThemeProvider

QueryProvider

AuthProvider

ToastProvider

---

# Types

Global shared types only.

Feature types stay inside feature folder.

---

# API Layer

Every API call goes through

Axios Instance

↓

Service

↓

React Query

↓

UI

Never call fetch()

Never call axios directly inside components.

---

# Axios Architecture

axios.ts

↓

Interceptors

↓

Authentication

↓

Refresh Token

↓

Global Error Handler

---

# React Query Flow

Component

↓

Hook

↓

Service

↓

Axios

↓

API

Never call service directly from UI.

---

# Example Flow

User opens Event Detail

↓

useEvent()

↓

event.service.ts

↓

GET /events/:id

↓

React Query Cache

↓

UI

---

# State Management

Use

TanStack Query

for server state.

Use

Zustand

for

Sidebar

Theme

Filters

Drawer

Modal

Selected Seat

Checkout Session

Never duplicate server data inside Zustand.

---

# Authentication Flow

User Login

↓

Access Token

↓

Refresh Token

↓

Axios Interceptor

↓

Protected Route

↓

Role Verification

↓

Dashboard

---

# Route Groups

Public

/

events

categories

about

business

login

register

User

/dashboard

/profile

/tickets

/orders

/resale

Organizer

/organizer

/events

/venue

/orders

Auditor

/auditor

/reviews

/documents

Admin

/admin

/users

/settings

/reports

---

# Route Protection

Public

Accessible to everyone.

Authenticated

Requires login.

Role Protected

Requires specific role.

Never hide page only by UI.

Always verify permissions.

---

# Form Architecture

Page

↓

Form Component

↓

React Hook Form

↓

Zod Schema

↓

Submit Handler

↓

Service

↓

API

Validation must exist

before API request.

---

# Error Handling

Server Error

↓

React Query

↓

Toast

↓

Fallback UI

Never expose raw backend errors.

---

# Loading Strategy

Every page

loading.tsx

Every table

Skeleton Rows

Every card

Skeleton Card

No blank screens.

---

# Empty State Strategy

Every list

↓

Illustration

↓

Title

↓

Description

↓

Primary Action

---

# Caching Strategy

Static Data

24 Hours

Cities

Categories

Venues

Frequently Updated

5 Minutes

Events

Ticket Availability

Live Data

No Cache

Queue

Checkout

Payment Status

Seat Availability

---

# File Naming

Component

PascalCase

EventCard.tsx

Hook

camelCase

useEvents.ts

Service

event.service.ts

Schema

event.schema.ts

Types

event.types.ts

Store

checkout.store.ts

---

# Import Rules

Good

import Button from "@/components/ui/button"

Bad

../../../button

Always use alias.

---

# Component Rules

UI components

must never know

API

Database

Authentication

Business Rules

UI only receives props.

---

# Feature Rules

Feature owns

Hooks

Services

Types

Schemas

Utilities

Do not leak implementation.

---

# Styling Rules

Tailwind only.

Avoid

Inline styles

Styled Components

CSS Modules

Random CSS files

---

# Responsive Strategy

Mobile

↓

Tablet

↓

Desktop

Never desktop-first.

---

# Performance

Lazy Loading

Code Splitting

Image Optimization

Memoization

Dynamic Imports

Infinite Scroll

Virtualized Tables

---

# Accessibility

Keyboard Navigation

ARIA Labels

Visible Focus

High Contrast

44px Touch Area

Screen Reader Support

---

# Security

Never trust frontend.

Every action

must be validated by backend.

Hide sensitive data.

Never expose secret keys.

---

# Logging

Development

Console

Production

Centralized Logger

Never leave console.log in production.

---

# Testing (Future)

Unit Test

Vitest

Component Test

React Testing Library

E2E

Playwright

---

# AI Development Rules

When AI generates code

Always

Use existing components

Use design tokens

Follow folder structure

Use feature architecture

Never duplicate logic

Never invent patterns

Never skip loading state

Never skip empty state

Never skip error state

Never use any

Always use TypeScript

---

# Development Workflow

Requirement

↓

UI Design

↓

Feature Folder

↓

API Service

↓

Hook

↓

Page

↓

Testing

↓

Review

↓

Merge

---

# Golden Rule

Pages orchestrate features.

Features orchestrate business logic.

Components render UI.

Services communicate with APIs.

The architecture should remain predictable regardless of project size.