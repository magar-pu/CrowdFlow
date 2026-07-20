# CrowdFlow
# Auditor Payout Verification Module
Version: 2.0

---

# Overview

Payout Verification merupakan modul yang digunakan auditor untuk memverifikasi seluruh permintaan pencairan dana dari organizer.

Berbeda dengan versi sebelumnya yang menggunakan drawer/sidebar, seluruh proses review dilakukan pada halaman detail tersendiri agar auditor memiliki ruang yang lebih luas untuk melakukan pemeriksaan.

Flow

Payout List

↓

Open Detail Page

↓

Review

↓

Approve / Request Revision / Reject

---

# Navigation

Auditor Console

Dashboard

Reviews

Documents

Organizers

Payouts

Settings

---

# Payout Dashboard

URL

/auditor/payouts

---

## Dashboard Summary

Menampilkan statistik payout.

Cards

- Pending Requests
- Under Review
- Approved Today
- Rejected Requests
- Total Pending Amount
- Total Paid Today
- Compliance Rate
- Fraud Alerts

---

## Search

Search by

- Request ID
- Event Name
- Organizer
- Bank Account
- Invoice Number

---

## Filter

Status

- Pending
- Under Review
- Need Revision
- Approved
- Processing
- Paid
- Rejected
- On Hold

Organizer

Date Range

Event

Risk Level

Amount

---

## Sorting

- Request Date
- Requested Amount
- Gross Revenue
- Net Revenue
- Organizer
- Risk Score

---

## Table

Columns

Request ID

Organizer

Event

Gross Revenue

Net Revenue

Requested Amount

Risk

Status

Request Date

Action

Actions

- Review
- View History

---

# Payout Detail Page

URL

/ auditor / payouts / {request_id}

Tidak lagi menggunakan Right Drawer.

Halaman penuh digunakan agar auditor dapat melihat seluruh informasi sekaligus.

---

# Header

Menampilkan

Request ID

Status Badge

Risk Level

Created Date

Current Auditor

Back Button

---

# Section 1

Organizer Information

Card

- Organizer Name
- Company
- Email
- Phone
- Business License
- Organizer Status
- Previous Violations

Button

View Organizer Profile

---

# Section 2

Bank Information

Card

- Bank
- Account Holder
- Account Number
- Swift Code
- Verification Status

Checklist

✓ Bank Verified

✓ Account Match

✓ Account Active

---

# Section 3

Event Information

Card

- Event Name
- Venue
- Event Date
- Ticket Capacity
- Tickets Sold
- Event Status

Button

Open Event Detail

---

# Section 4

Revenue Breakdown

Gross Revenue

Platform Fee

Gateway Fee

Entertainment Tax

VAT

Refund Amount

Chargeback

Other Adjustments

Net Revenue

Visual Progress Bar

Revenue Distribution Chart

---

# Section 5

Sales Summary

Cards

Tickets Sold

Gross Revenue

Refund %

Chargeback %

Average Ticket Price

Attendance Rate

---

# Section 6

Compliance Checklist

Automatic Validation

✓ Event Approved

✓ Organizer Verified

✓ Required Documents Complete

✓ Tax Configured

✓ Revenue Calculated

✓ Refund Validated

✓ Chargeback Checked

✓ Bank Verified

✓ No Active Revision

Compliance Score

96%

---

# Section 7

Risk Analysis

Overall Risk

Low

Medium

High

Critical

Risk Indicators

- High Refund Rate

- Chargeback Above Threshold

- Revenue Mismatch

- Duplicate Payout

- Multiple Bank Changes

- Suspicious Organizer

System Recommendation

Safe to Approve

Needs Manual Review

High Risk

---

# Section 8

Fraud Detection

Automatic Checks

Duplicate Request

Revenue Manipulation

Abnormal Sales Spike

Refund Abuse

Chargeback Abuse

Fake Ticket Detection

Multi Account Detection

Status

Passed

Warning

Critical

---

# Section 9

Timeline

Request Submitted

↓

Finance Validation

↓

Automatic Compliance Check

↓

Auditor Review

↓

Final Decision

↓

Payment Processing

↓

Completed

---

# Section 10

Activity Log

Semua aktivitas payout.

- Request Created

- Revenue Updated

- Bank Changed

- Revision Requested

- Auditor Approved

- Payment Sent

---

# Section 11

Revision History

Jika pernah direvisi.

Menampilkan

Revision Date

Reason

Status

Resolved By

Button

View Revision Detail

---

# Section 12

Auditor Notes

Internal Notes

Tidak dapat dilihat organizer.

Organizer Notes

Dapat dikirim ke organizer.

---

# Section 13

Attachments

Invoice

Revenue Report

Settlement Report

Tax Report

Supporting Documents

Action

Preview

Download

---

# Bottom Action Bar

Selalu berada di bagian bawah.

Buttons

Back

Save Draft

Request Revision

Reject Request

Approve Payout

---

# Approval Confirmation

Saat auditor menekan Approve.

Popup

Approve Payout

Organizer

Event

Requested Amount

Net Revenue

Checklist

☐ Revenue verified

☐ Bank verified

☐ Tax verified

☐ Compliance completed

Buttons

Cancel

Approve

---

# Request Revision

Auditor dapat membuat banyak revision item.

Category

Finance

Bank

Revenue

Tax

Documents

Organizer

Description

Required Action

Priority

Deadline

Attachment

---

# Reject Request

Auditor wajib memilih alasan.

Reason

Revenue mismatch

Fraud detected

Invalid bank account

Missing documents

Duplicate request

Other

Comment

---

# Export

Auditor dapat mengunduh

Payout Report

Revenue Breakdown

Tax Summary

Compliance Report

Fraud Analysis

Audit Report

---

# Notification

Organizer menerima notifikasi ketika

- Request Received
- Request Under Review
- Revision Requested
- Payout Approved
- Payout Rejected
- Payment Sent

Auditor menerima notifikasi ketika

- Organizer Updated Information
- Revenue Changed
- Bank Changed
- New Supporting Document Uploaded

---

# Permission

Auditor

- View Request
- Review
- Request Revision
- Approve
- Reject

Senior Auditor

Semua hak Auditor ditambah

- Override Decision
- Force Approve
- Force Reject
- Assign Auditor

Finance Manager

- Execute Payment
- View Financial Report
- Download Settlement Report

---

# Future AI Features

- AI Revenue Validation
- AI Tax Verification
- AI Fraud Detection
- AI Chargeback Prediction
- AI Refund Pattern Analysis
- AI Compliance Recommendation
- AI Risk Scoring
- AI Smart Approval Recommendation