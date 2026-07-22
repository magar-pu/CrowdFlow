# CrowdFlow Frontend AI Agent Guide

Version: 2.0

Project

CrowdFlow — Secure Ticketing. Seamless Events.

---

# Purpose

This document is the master instruction for every AI assistant working on the CrowdFlow frontend.

Supported AI

- ChatGPT
- Claude Code
- Cursor AI
- GitHub Copilot
- Gemini
- Windsurf
- Continue
- Any LLM-based coding assistant

Every generated code must follow the project architecture, design system, and coding conventions.

AI should prioritize **consistency**, **maintainability**, and **reusability** over speed.

---

# AI Priority Order

Before generating any code, AI must read the project documentation in this order.

1. agents.md
2. docs/design-system.md
3. docs/design-token.md
4. docs/component-library.md
5. docs/frontend-architecture.md

If there is any conflict,

follow the higher document.

---

# AI Role

AI is not a designer.

AI is not a product owner.

AI is a software engineer working inside the CrowdFlow team.

Therefore AI should

- Follow existing patterns
- Reuse existing components
- Respect design consistency
- Avoid unnecessary creativity

---

# Core Principles

Always optimize for

- Consistency
- Readability
- Accessibility
- Scalability
- Performance
- Maintainability

Never optimize only for fewer lines of code.

---

# Before Writing Code

Always ask yourself

1.

Does this component already exist?

If yes,

reuse it.

---

2.

Is there already a similar page?

Reuse the same layout.

---

3.

Does this match the Design System?

If not,

change it.

---

4.

Does this follow Design Tokens?

If not,

replace hardcoded values.

---

5.

Does this belong inside an existing feature?

If yes,

do not create a new feature.

---

# Design Rules

Always follow

design-system.md

Never

Invent colors

Invent spacing

Invent typography

Invent animations

Invent shadows

Invent layouts

---

# Component Rules

Always follow

component-library.md

Never

Duplicate Buttons

Duplicate Cards

Duplicate Tables

Duplicate Forms

Duplicate Dialogs

Duplicate Dashboard Widgets

Duplicate Ticket Components

When a reusable component exists,

extend it instead.

---

# Token Rules

Always use

design-tokens.md

Never write

#FFFFFF

#000000

16px

24px

32px

border-radius

transition duration

Use design tokens.

---

# Architecture Rules

Always follow

docs/frontend-architecture.md

Never

Mix UI and business logic.

Never fetch data inside components.

Never place API calls inside pages.

Never store server data inside Zustand.

---

# UI Rules

The interface must feel like

Stripe

+

Airbnb

+

Linear

+

Apple

+

Notion

Never feel like

Bootstrap

Material UI

Gaming Dashboard

Cyberpunk

AdminLTE

---

# Mobile First

Always design for

Mobile

↓

Tablet

↓

Desktop

Never desktop first.

---

# Responsive Rules

Every page must support

Mobile

Tablet

Laptop

Desktop

Large Desktop

---

# Component Hierarchy

Page

↓

Feature

↓

Component

↓

UI Primitive

Business logic stays inside features.

UI components stay dumb.

---

# State Management

Server State

TanStack Query

UI State

Zustand

Form State

React Hook Form

Validation

Zod

Never violate this architecture.

---

# API Rules

Always use

Axios Instance

↓

Service

↓

Hook

↓

Component

Never

fetch()

Never axios inside components.

---

# Accessibility

Every generated component must support

Keyboard Navigation

Focus Ring

ARIA Labels

Screen Reader

Minimum Touch Area

WCAG AA Contrast

Accessibility is mandatory.

---

# Performance

Always consider

Code Splitting

Dynamic Import

Image Optimization

Lazy Loading

Memoization

Skeleton Loading

Virtualization

Avoid unnecessary rerenders.

---

# Loading

Every page

must have

Skeleton

Every table

must have

Skeleton Rows

Every card

must have

Skeleton Card

Never show blank pages.

---

# Empty State

Every data-driven component

must provide

Illustration

Title

Description

Primary Action

---

# Error State

Every feature

must provide

Friendly Message

Retry

Technical logging

Never expose backend errors.

---

# Security

Frontend is never trusted.

Never

Store secrets

Trust role from UI

Expose hidden APIs

Skip backend validation

Always assume backend validates everything.

---

# Code Style

Always

Strict TypeScript

Meaningful variable names

Reusable functions

Reusable hooks

Reusable components

Small files

No duplicated logic

No "any"

---

# Naming Convention

Components

PascalCase

Hooks

camelCase

Services

feature.service.ts

Schemas

feature.schema.ts

Types

feature.types.ts

Stores

feature.store.ts

Constants

UPPER_CASE

---

# Folder Rules

Every new feature should contain

components/

hooks/

services/

schemas/

types/

utils/

constants/

Never place unrelated files together.

---

# Imports

Always use

@

alias.

Never use

../../../

imports.

---

# AI Response Rules

When generating code,

AI must

Explain architecture briefly.

Reuse existing patterns.

Keep components small.

Split large components.

Keep functions focused.

Generate production-ready code.

---

# If Information Is Missing

Do not assume.

Instead,

ask for clarification.

Never invent

API responses

Database fields

Business rules

Permissions

Routes

---

# Definition of Done

Before considering a task complete,

verify:

✓ Uses Design Tokens

✓ Uses existing Components

✓ Matches Design System

✓ Matches Architecture

✓ Mobile Responsive

✓ Accessible

✓ Loading State

✓ Empty State

✓ Error State

✓ Type Safe

✓ Production Ready

---

# Golden Rule

Every new screen should look as if it was designed and developed by the same team from day one.

If users can tell that one page was generated differently from another, the implementation is considered incorrect.