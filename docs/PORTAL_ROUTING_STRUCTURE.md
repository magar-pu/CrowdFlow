# CrowdFlow
# Portal Routing Structure
Version: 1.0
Last Updated: July 2026

---

# Overview

CrowdFlow menggunakan arsitektur multi-portal.

Setiap role memiliki dashboard, layout, middleware, controller, route, dan permission masing-masing.

Hal ini bertujuan untuk:

- Memisahkan tanggung jawab setiap role.
- Mempermudah maintenance.
- Mempermudah pengembangan fitur.
- Mendukung RBAC (Role Based Access Control).
- Meningkatkan keamanan.
- Membuat URL lebih konsisten.

---

# Portal Architecture

Public Website

↓

User Portal

↓

Organizer Portal

↓

Auditor Portal

↓

Admin Portal

↓

Super Admin Portal (Future)

---

# Route Prefix

| Portal | Prefix |
|---------|---------|
| Public | / |
| User | /user |
| Organizer | /organizer |
| Auditor | /auditor |
| Admin | /admin |
| Super Admin | /super-admin |

---

# Public Website

Base URL

/

Halaman publik yang dapat diakses tanpa login.

Routes

/

Landing Page

/login

Register

/register

Events

/events

Event Detail

/events/{slug}

Venue

/venues

Pricing

/pricing

Help Center

/help

FAQ

/faq

About

/about

Contact

/contact

Privacy

/privacy

Terms

/terms

---

# User Portal

Base URL

/user

Dashboard

/user

Profile

/user/profile

Settings

/user/settings

My Tickets

/user/tickets

Ticket Detail

/user/tickets/{id}

Orders

/user/orders

Order Detail

/user/orders/{id}

Payments

/user/payments

Refunds

/user/refunds

Notifications

/user/notifications

Wishlist

/user/wishlist

Support

/user/support

---

# Organizer Portal

Base URL

/organizer

Dashboard

/organizer

---

## Event Management

/organizer/events

/organizer/events/create

/organizer/events/{id}

/organizer/events/{id}/edit

---

## Ticket Management

/organizer/tickets

/organizer/tickets/{id}

---

## Orders

/organizer/orders

/organizer/orders/{id}

---

## Check In

/organizer/checkin

---

## Attendees

/organizer/attendees

---

## Venue

/organizer/venues

/organizer/venues/{id}

---

## Vendors

/organizer/vendors

---

## Logistics

/organizer/logistics

---

## Marketing

/organizer/marketing

Coupons

/organizer/coupons

Promo Codes

/organizer/promotions

Affiliate

/organizer/affiliate

---

## Finance

/organizer/finance

Revenue

/organizer/revenue

Transactions

/organizer/transactions

Invoices

/organizer/invoices

---

## Payout

/organizer/payouts

Request Payout

/organizer/payouts/request

Payout Detail

/organizer/payouts/{id}

---

## Compliance

/organizer/compliance

---

## Documents

/organizer/documents

---

## Reports

/organizer/reports

---

## Settings

/organizer/settings

---

## Profile

/organizer/profile

---

# Auditor Portal

Base URL

/auditor

Dashboard

/auditor

---

## Reviews

/auditor/reviews

/auditor/reviews/{id}

---

## Documents

/auditor/documents

/auditor/documents/{id}

---

## Organizers

/auditor/organizers

/auditor/organizers/{id}

---

## Payouts

/auditor/payouts

/auditor/payouts/{id}

---

## Audit Logs

/auditor/logs

/auditor/logs/{id}

---

## Reports

/auditor/reports

/auditor/reports/{id}

---

## Settings

/auditor/settings

---

# Admin Portal

Base URL

/admin

Dashboard

/admin

---

## User Management

/admin/users

/admin/users/{id}

---

## Organizer Management

/admin/organizers

/admin/organizers/{id}

---

## Auditor Management

/admin/auditors

/admin/auditors/{id}

---

## Event Management

/admin/events

/admin/events/{id}

---

## Categories

/admin/categories

---

## Venues

/admin/venues

/admin/venues/{id}

---

## Vendors

/admin/vendors

/admin/vendors/{id}

---

## Ticket Management

/admin/tickets

/admin/tickets/{id}

---

## Orders

/admin/orders

/admin/orders/{id}

---

## Payments

/admin/payments

/admin/payments/{id}

---

## Refunds

/admin/refunds

---

## Payouts

/admin/payouts

/admin/payouts/{id}

---

## Promotions

/admin/promotions

---

## Coupons

/admin/coupons

---

## Compliance

/admin/compliance

---

## Reports

/admin/reports

Finance

/admin/reports/finance

Revenue

/admin/reports/revenue

Events

/admin/reports/events

Users

/admin/reports/users

Fraud

/admin/reports/fraud

---

## Audit Logs

/admin/logs

/admin/logs/{id}

---

## Roles

/admin/roles

---

## Permissions

/admin/permissions

---

## System

/admin/system

Queue

/admin/system/queue

Storage

/admin/system/storage

Jobs

/admin/system/jobs

Cache

/admin/system/cache

Health

/admin/system/health

---

## Settings

/admin/settings

---

# Super Admin (Future)

Base URL

/super-admin

Dashboard

/super-admin

Companies

/super-admin/companies

Subscriptions

/super-admin/subscriptions

Plans

/super-admin/plans

Platform Analytics

/super-admin/analytics

Tenants

/super-admin/tenants

System Monitoring

/super-admin/system

Global Settings

/super-admin/settings

API Usage

/super-admin/api

Audit Logs

/super-admin/logs

---

# Laravel Folder Structure

resources/

└── views/

    ├── public/

    ├── auth/

    ├── user/

    ├── organizer/

    ├── auditor/

    ├── admin/

    └── super-admin/

---

# Controller Structure

app/

└── Http/

    └── Controllers/

        ├── Public/

        ├── User/

        ├── Organizer/

        ├── Auditor/

        ├── Admin/

        └── SuperAdmin/

---

# Middleware

Public

web

User

auth

role:user

Organizer

auth

role:organizer

Auditor

auth

role:auditor

Admin

auth

role:admin

Super Admin

auth

role:super_admin

---

# Permission Hierarchy

Super Admin

↓

Platform Admin

↓

Finance Manager

↓

Compliance Manager

↓

Auditor

↓

Organizer

↓

Event Staff

↓

Customer

---

# Navigation Rules

Dashboard setiap portal menggunakan root route.

Contoh

User Dashboard

/user

Organizer Dashboard

/organizer

Auditor Dashboard

/auditor

Admin Dashboard

/ admin

Seluruh halaman lainnya menggunakan sub-route.

Contoh

/organizer/events

/admin/users

/auditor/payouts

/user/orders

---

# Benefits

✓ Setiap portal memiliki URL sendiri.

✓ Mudah dikembangkan.

✓ Mudah diberikan permission.

✓ Mendukung RESTful Routing.

✓ Konsisten dengan Laravel Resource Controller.

✓ Mudah melakukan maintenance.

✓ Struktur enterprise-ready.

✓ Mendukung pengembangan fitur baru tanpa mengubah struktur routing.