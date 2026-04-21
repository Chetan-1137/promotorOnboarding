# Promotor Portal — Climate Capital Market

A Zoho Creator widget dashboard for promotors (project owners) on the Climate Capital Market platform.

---

## Overview

The Promotor Portal is a single-page widget built on the Zoho Creator SDK. It enables promotors to manage their green building projects, track investor interest through a capital raise pipeline, monitor certifications, and configure their profile — all within the Zoho Creator environment.

---

## Features

| Module | Description |
|---|---|
| **Dashboard** | Summary of activities, live project stats, total capital overview |
| **Onboarding & Listing** | Multi-step form — Registration, Project Details, Requirements & Sign-Off |
| **My Projects** | Project cards with status, area, funding, certification badges |
| **Capital Raise** | 6-phase kanban pipeline — Interest Received → Investor Meeting → Data Room Access → Due Diligence → Final Negotiation → Definitive Agreement |
| **Certification Tracker** | Track USGBC, BEE, IGBC, GRIHA certification progress |
| **Data Room** | Secure document/image room for investor due diligence |
| **Notifications** | In-app notification feed with read/unread tracking |
| **Settings** | Security (Password/MFA), Currency & Display, Notifications preferences |
| **Profile** | Promotor registration details, company info, edit mode |

---

## Tech Stack

- **Platform:** Zoho Creator (Widget SDK v2)
- **Frontend:** Vanilla JS, HTML5, CSS3 (no external frameworks)
- **API:** Zoho Creator Data API v2.1 (`ZOHO.CREATOR.DATA`)
- **Auth:** Zoho Creator row-level permissions (users see only their own records)

---

## Project Structure

```
app/
├── dashboard.html        # Main widget — all rendering logic (single-file architecture)
├── index.html            # Widget entry point
├── js/
│   └── app.js            # Onboarding form logic, field prefill, save handlers
├── css/
│   └── style.css         # Design system — variables, components, layout
├── config/
│   └── fields.js         # Field definitions for all onboarding form steps
├── assets/
│   └── ccm_logo.png      # CCM brand logo
└── translations/
    └── en.json           # English string translations
```

---

## Zoho Creator Reports Used

| Report Name | Purpose |
|---|---|
| `promotor_registration_Report` | Promotor profile & settings |
| `project_creation_Report` | Project listing records |
| `requirements_signoff_Report` | Capital & certification requirements |
| `All_Necessary_Information` | Registration step 1 data |
| `All_Investment_Pipelines` | Capital raise investor pipeline |
| `All_Certification_Trackers` | Certification tracking records |
| `All_Currency` | Exchange rates for currency conversion |
| `All_Notifications` | In-app notification records |

---

## Currency Conversion

- **Base currency:** INR (all amounts stored in Zoho in INR)
- **Display currency:** Selected by promotor in Settings → Currency & Display
- **Conversion:** `Display = INR × Exchange_Rate` (from `All_Currency` dataset)
- **On save:** Values are converted back to INR before writing to Zoho

---

## Capital Raise Pipeline — Actions

| Phase | Action Label | Fields Updated |
|---|---|---|
| Phase 1 — Interest Received | Unlock Project | `Actions_field: Unlock/Deny` |
| Phase 3 — Data Room Access | Grant Access | `Grant_Access: Grant/Deny` + `Actions_field` |

---

## Setup

1. Upload the `app/` folder as a Zoho Creator widget
2. Set `appName` in `ZOHO_CFG` inside `dashboard.html` to match your Zoho app link name
3. Ensure all report names in `ZOHO_CFG.reports` match your Zoho Creator report link names
4. Deploy the widget and embed it in your Zoho Creator page

---

## Branch Strategy

| Branch | Purpose |
|---|---|
| `main` | Stable production-ready code |
| `feature/promotor-dashboard` | Active development branch |
