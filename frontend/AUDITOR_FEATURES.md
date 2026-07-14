# CrowdFlow
# Auditor Module Features
Version: 2.0

---

# Overview

Auditor Module merupakan pusat seluruh proses audit dan compliance event.

Tujuan utama halaman ini adalah agar auditor dapat melakukan review seluruh aspek event tanpa harus berpindah halaman.

Setiap event memiliki halaman detail yang terdiri dari beberapa tab.

---

# Auditor Dashboard

## Compliance Queue

Menampilkan seluruh event yang menunggu review.

### Informasi

- Event Name
- Organizer
- Event Date
- Current Stage
- Risk Level
- Compliance Score
- Missing Documents
- Assigned Auditor
- Last Updated

### Filter

- Pending
- Need Revision
- Approved
- Rejected
- High Risk
- Medium Risk
- Low Risk

### Search

- Event Name
- Organizer
- Location
- Event ID

### Sorting

- Event Date
- Compliance Score
- Last Updated
- Risk Level

---

# Event Detail Modal

Setiap event memiliki halaman detail yang terdiri dari beberapa section.

---

# 1. Overview

## Event Information

- Event Name
- Event ID
- Status
- Risk Level
- Event Category
- Event Date
- Venue
- Organizer

---

## Event Banner

Menampilkan

- Banner Event
- Capacity
- Ticket Sold
- Organizer Logo

---

## Organizer Information

- Company Name
- Business License
- PIC
- Email
- Phone Number
- Address

Button

- View Profile

---

## Compliance History

Menampilkan

- Previous Audit
- Previous Violations
- Previous Revision
- Previous Approved Events

---

## Venue Information

- Venue Name
- Address
- Capacity
- Google Maps
- Website

---

# Venue Validation Checklist

Checklist otomatis.

- Venue Ownership Verified
- Maximum Capacity Verified
- Seating Configuration Valid
- Emergency Exit Verified
- Fire Safety
- Crowd Flow Validation
- Acoustic Safety
- Structural Safety

---

# 2. Documents

## Document Compliance Score

Menampilkan

- Total Documents
- Verified
- Need Review
- Rejected
- Missing

Compliance %

---

## Document Repository

Setiap dokumen memiliki

- Document Name
- Upload Date
- Expired Date
- Uploaded By
- Verification Status

Action

- Preview
- Download
- View Detail

---

## Document Categories

- Business License
- NPWP
- Police Permit
- Fire Department Permit
- Insurance
- Tax Document
- Venue Contract
- Artist Contract
- Vendor Agreement
- Security Agreement
- Medical Team
- Emergency Plan

---

## Internal Auditor Notes

Area khusus auditor.

Berisi

- Notes
- Recommendation
- Follow Up

---

# 3. Venue

## Venue Summary

Menampilkan

- Venue Name
- Capacity
- Compliance Score

---

## Venue Validation

Checklist

- Owner Verified
- Maximum Capacity
- Seating Layout
- Emergency Exit
- Parking Area
- Accessibility
- Fire Extinguisher
- Medical Point
- CCTV
- Security Room

---

## Venue Information

- Address
- Manager
- Contact
- Website
- Google Maps

---

# 4. Logistics

## Logistics Overview

Menampilkan

- Vendor Count
- Security Count
- Medical Team
- Emergency Team

---

## Vendor Verification

Status

- Verified
- Pending
- Rejected

Kategori

- Stage
- Lighting
- Sound
- Food
- Merchandise
- Cleaning
- Security

---

## Emergency Plan

Checklist

- Ambulance
- Fire Truck
- Emergency Exit
- Evacuation Route
- Assembly Point

---

# 5. Finance

## Financial Summary

Menampilkan

- Projected Revenue
- Platform Fee
- Organizer Revenue

---

## Compliance Score

Checklist

- Ticket Price Verified
- Revenue Calculation
- Platform Fee Applied
- Tax Calculation
- Tax Match

---

## Ticket Pricing

Table

Category

- VIP
- Festival
- Regular
- VVIP

Kolom

- Price
- Seat
- Status

---

## Revenue Distribution

Visual Chart

Menampilkan

- Gross Revenue
- Platform Fee
- Gateway Fee
- Tax
- Net Payout

---

## Tax Configuration

Menampilkan

- Entertainment Tax
- PPN
- Region
- Tax Percentage

Checklist

- Region Match
- Tax Applied
- PPN Applied

---

## Organizer Payout

Menampilkan

- Bank
- Account Name
- Account Number
- Verified Status
- Estimated Payout

---

# 6. History

## Timeline

Semua aktivitas auditor.

Contoh

- Event Created
- Document Uploaded
- Venue Updated
- Finance Updated
- Revision Requested
- Auditor Approved

---

## Approval Progress

Timeline

Draft

↓

Submitted

↓

Verified

↓

Final Approval

---

## Activity Timeline

Menampilkan

- User
- Timestamp
- Action
- Detail

---

## Version History

Setiap perubahan event memiliki version.

Contoh

Version 1

↓

Version 2

↓

Version 3

Auditor dapat membuka perubahan setiap versi.

---

# 7. Revision

Halaman khusus revisi.

Berisi

- Revision History
- Requested By
- Request Date
- Deadline
- Status

---

## Revision Detail

Auditor dapat memilih

- Document
- Venue
- Finance
- Organizer
- Logistics

Kemudian memberikan komentar.

---

## Revision Comment

Field

- Title
- Description
- Severity

Severity

- Minor
- Medium
- Critical

---

# Auditor Action Panel

Selalu berada di bagian bawah halaman.

Button

- Close
- Save Draft
- Request Revision
- Reject Event
- Approve Event

---

# Approval Workflow

Draft

↓

Organizer Submit

↓

Auto Validation

↓

Auditor Review

↓

Revision (Optional)

↓

Final Approval

↓

Published

---

# Risk Assessment

Setiap event memiliki Risk Score.

Parameter

- Venue Capacity
- Previous Violations
- Missing Documents
- Finance Issues
- Ticket Price Anomaly
- Tax Issue
- Crowd Density
- Organizer Reputation

Kategori

- Low
- Medium
- High
- Critical

---

# Notification System

Auditor menerima notifikasi ketika

- Event Submitted
- New Document Uploaded
- Revision Completed
- Finance Changed
- Venue Changed
- Organizer Responded

---

# Audit Log

Semua aktivitas dicatat.

Informasi

- User
- Role
- Action
- Before
- After
- Timestamp
- IP Address

---

# Export

Auditor dapat export

- PDF Report
- Compliance Report
- Financial Report
- Audit History
- Document List

---

# Future AI Features

- AI Compliance Analysis
- AI Missing Document Detection
- AI Fraud Detection
- AI Revenue Anomaly Detection
- AI Ticket Pricing Recommendation
- AI Tax Validation
- AI Risk Prediction
- AI Auto Summary
- AI Recommended Approval Decision

---

# Permission

Auditor

- View Event
- Review Documents
- Request Revision
- Approve Event
- Reject Event
- Export Report

Senior Auditor

Semua hak Auditor ditambah

- Override Approval
- Reassign Auditor
- Edit Compliance Score
- Force Approve
- Force Reject

---

# Status

- Draft
- Submitted
- Under Review
- Need Revision
- Resubmitted
- Approved
- Rejected
- Published
