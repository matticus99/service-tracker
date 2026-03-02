# Vehicle Service Tracker — Application Specification
**Version:** 1.0  
**Date:** March 1, 2026  
**Author:** Project Owner  
**Status:** Draft — Ready for Development

---

## 1. Project Overview

### 1.1 Purpose
A self-hosted Progressive Web Application (PWA) for tracking vehicle service history, monitoring upcoming maintenance, and estimating future service costs. The design is inspired by CarFax Car Care but stripped down to exactly what matters — no bloat, no subscription, no third-party cloud.

### 1.2 Design Philosophy
- **Data stays home.** All data lives on the owner's home server. No external services, no cloud sync, no telemetry.
- **Spreadsheet parity.** The app must replicate every meaningful capability of the existing `Tacoma_Service_20251125.xlsx` tracking system, then improve on it with a proper UI.
- **Not over-engineered.** Features are added only when they serve a real tracking need. No gamification, no social features, no repair shop marketplace.

### 1.3 Reference Material
- **Existing spreadsheet:** `Tacoma_Service_20251125.xlsx` — the authoritative source for data structure and business logic
- **UI Reference:** CarFax Car Care app screenshots (provided) — visual style and UX patterns to draw from

---

## 2. Deployment Architecture

### 2.1 Environment
| Concern | Decision | Reason |
|---|---|---|
| Host OS | Ubuntu/Debian Linux | Existing home server OS |
| Containerization | Docker + Docker Compose | Operator's preferred deployment method; isolates services cleanly |
| Database | PostgreSQL | Robust, self-hosted, handles relational data well; future-proof for multi-vehicle |
| Backend | Python + FastAPI | Modern, fast, excellent documentation, type-safe, pairs naturally with PostgreSQL via SQLAlchemy/asyncpg |
| Frontend | React + Vite (PWA) | Component-based UI, offline-capable via service worker, works on desktop and mobile |
| Reverse Proxy | Nginx (in Docker) | Routes traffic, serves static frontend files, SSL termination point |

### 2.2 Docker Compose Services
```
┌─────────────────────────────────────────────┐
│  docker-compose.yml                          │
│                                              │
│  nginx        → port 80/443 (public)         │
│  frontend     → React build (served by nginx)│
│  backend      → FastAPI on port 8000         │
│  db           → PostgreSQL on port 5432      │
│                                              │
│  Volume: postgres_data (persistent on host)  │
└─────────────────────────────────────────────┘
```

### 2.3 Data Persistence
- PostgreSQL data stored in a named Docker volume mapped to the host filesystem
- Daily backup script (provided) exports the database to a `.sql` dump file in a user-defined backup directory
- The existing spreadsheet is imported once during initial setup via a migration script

---

## 3. Multi-Vehicle Architecture

The application is architected to support multiple vehicles from day one, even though only one vehicle (the Tacoma) will be used initially.

**What this means in practice:**
- Every database table that contains vehicle-specific data has a `vehicle_id` foreign key
- The UI has a vehicle selector (currently shows one, expands naturally when more are added)
- Adding a second vehicle requires no schema changes — only data entry

---

## 4. Data Model

The following tables directly map to the structure of the existing spreadsheet.

### 4.1 `vehicles`
Stores one row per vehicle. Maps to the "Truck Details" sheet.

| Column | Type | Description |
|---|---|---|
| `id` | UUID (PK) | Unique vehicle identifier |
| `year` | INTEGER | Model year |
| `make` | VARCHAR | e.g., Toyota |
| `model` | VARCHAR | e.g., Tacoma |
| `trim` | VARCHAR | e.g., 2WD Double Cab V6 |
| `color` | VARCHAR | e.g., Gray |
| `vin` | VARCHAR | Vehicle Identification Number |
| `current_mileage` | INTEGER | Last known odometer reading |
| `created_at` | TIMESTAMP | Record creation time |

### 4.2 `oil_changes`
Maps directly to the "Oil Changes" sheet. Kept separate because oil changes have a distinct dual-interval (miles AND months) cadence.

| Column | Type | Description |
|---|---|---|
| `id` | UUID (PK) | |
| `vehicle_id` | UUID (FK) | |
| `service_date` | DATE | When service occurred |
| `facility` | VARCHAR | Shop name (e.g., "Take 5", "DIY") |
| `odometer` | INTEGER | Mileage at time of service |
| `interval_miles` | INTEGER | Miles since last oil change |
| `interval_months` | NUMERIC | Months since last oil change (calculated) |
| `notes` | TEXT | Oil type, filter brand, observations |
| `created_at` | TIMESTAMP | |

### 4.3 `service_records`
Maps to the "Other Services" sheet. Covers all non-oil-change work.

| Column | Type | Description |
|---|---|---|
| `id` | UUID (PK) | |
| `vehicle_id` | UUID (FK) | |
| `service_date` | DATE | |
| `facility` | VARCHAR | Shop or "DIY" |
| `odometer` | INTEGER | NULL allowed (some records had "Unknown") |
| `services_performed` | TEXT[] | Array of service line items |
| `notes` | TEXT | Freeform notes |
| `created_at` | TIMESTAMP | |

### 4.4 `interval_items`
The heart of the app. Maps directly to the "Interval Tracking" sheet. Each row is one thing being tracked for future service.

| Column | Type | Description |
|---|---|---|
| `id` | UUID (PK) | |
| `vehicle_id` | UUID (FK) | |
| `name` | VARCHAR | e.g., "Transmission (OEM Fluid)" |
| `type` | ENUM | `regular` or `ad_hoc` |
| `last_service_date` | DATE | When it was last done |
| `last_service_miles` | INTEGER | Odometer when last done |
| `recommended_interval_miles` | INTEGER | NULL for ad-hoc items |
| `next_service_miles` | INTEGER | NULL for ad-hoc (shown as "As Needed") |
| `due_soon_threshold_miles` | INTEGER | User-configured per item (e.g., 500) |
| `estimated_cost` | NUMERIC | Estimated cost for next service |
| `notes` | TEXT | Optional notes for this item |
| `created_at` | TIMESTAMP | |
| `updated_at` | TIMESTAMP | |

**Status logic (computed at query time, not stored):**

| Status | Condition |
|---|---|
| `overdue` | `current_mileage >= next_service_miles` |
| `due_soon` | `current_mileage >= (next_service_miles - due_soon_threshold_miles)` |
| `ok` | Everything else |
| `ad_hoc` | `type = 'ad_hoc'` — shown with last service info, no due date |

### 4.5 `observations`
Maps to the "Misc - Observations" sheet. Freeform journal entries for things noticed but not yet serviced.

| Column | Type | Description |
|---|---|---|
| `id` | UUID (PK) | |
| `vehicle_id` | UUID (FK) | |
| `observation_date` | DATE | |
| `odometer` | INTEGER | NULL allowed |
| `observation` | TEXT | Freeform observation text |
| `resolved` | BOOLEAN | Whether the issue was eventually addressed |
| `resolved_date` | DATE | NULL until resolved |
| `created_at` | TIMESTAMP | |

### 4.6 `app_settings`
Global configurable values. Stored in DB so they survive container restarts.

| Column | Type | Description |
|---|---|---|
| `id` | INTEGER (PK) | Always 1 (single settings row) |
| `shop_fee` | NUMERIC | Default shop fee added to cost estimates (e.g., $40) |
| `tax_rate` | NUMERIC | Tax rate as decimal (e.g., 0.07 = 7%) |

---

## 5. Feature Specifications

### 5.1 Dashboard (Home Screen)
The first screen seen when opening the app. Gives a snapshot of the vehicle's health.

**Displays:**
- Vehicle summary card (Year, Make, Model, current mileage)
- **Overdue items** — highlighted in red, count badge
- **Due Soon items** — highlighted in yellow/amber
- **Next oil change** — mileage and estimated date based on average usage
- **Upcoming cost summary** — total estimated cost of all overdue + due soon services (with shop fee + tax applied)
- Quick-access buttons: Add Service Record, Update Mileage, Add Observation

**Average mileage calculations** (derived from oil change history, updated on each new entry):
- Average daily mileage
- Average weekly mileage
- Average monthly mileage

These are used to project when interval items will come due (displayed as "approximately X weeks").

### 5.2 Service History
Chronological log of all service work. Combines oil changes and other services in one unified timeline view. Mirrors the "Service History" screen in the CarFax screenshots.

**Features:**
- Unified timeline (oil changes + other services, sorted newest first)
- Each entry shows: date, facility, odometer, services performed, notes
- Filter by: type (oil change / service), facility, date range
- Search by keyword
- Edit and delete any record
- Tap a record to see full detail view

### 5.3 Interval Tracker
The most important screen. Direct equivalent of the "Interval Tracking" spreadsheet tab.

**Displays a list of all tracked items with per-item:**
- Item name
- Type badge (Regular / Ad-Hoc)
- Last serviced: date + mileage
- Next due: mileage (Regular items only)
- Miles remaining until due (positive = still ok, negative = overdue)
- Estimated months until due (based on average daily mileage)
- Status indicator: OK (green) / Due Soon (amber) / Overdue (red) / Ad-Hoc (gray)
- Estimated cost

**Footer summary:**
- Subtotal of all active estimated costs
- Shop fee (from settings)
- Tax (from settings)
- Grand total

**Actions:**
- Add new interval item
- Edit any item (name, interval, cost estimate, due-soon threshold)
- Mark an item as serviced (auto-fills last service date/miles from current mileage)
- Delete an item

**Schedule toggle:** Normal / Severe (future enhancement, show UI only for now)

### 5.4 Add Service Record
Form to log a completed service. Mirrors the "Add Service Record" screen from the CarFax screenshots.

**Fields:**
- Date (defaults to today)
- Facility (text field with autocomplete from past entries)
- Odometer reading
- Services performed (checklist of common items + free-text "Other")
- Notes (up to 1000 characters)
- Service type toggle: Oil Change / Other Service (determines which table it saves to)

**On save:**
- Updates the vehicle's `current_mileage` if the entered odometer is higher than stored
- If it's an oil change, recalculates interval_miles and interval_months
- Optionally prompts: "Would you like to update any interval tracker items based on this service?"

### 5.5 Observations / Journal
Dedicated section for freeform observations — things noticed but not yet serviced.

**Features:**
- List of all observations, newest first
- Each entry: date, odometer, observation text, resolved status
- Add new observation
- Edit observation
- Mark as resolved (with optional resolution date)
- Filter: show all / unresolved only

### 5.6 Settings
- Update current mileage (manual override)
- Shop fee (dollar amount)
- Tax rate (percentage)
- Vehicle information (editable)
- Export data (JSON or CSV)
- Import data (from spreadsheet — initial setup only, via CLI script)

---

## 6. Data Import (Spreadsheet Migration)

A one-time Python CLI script will import all existing data from `Tacoma_Service_20251125.xlsx`.

**Import mapping:**

| Sheet | → | Table |
|---|---|---|
| Truck Details | → | `vehicles` |
| Oil Changes | → | `oil_changes` |
| Other Services | → | `service_records` |
| Misc - Observations | → | `observations` |
| Interval Tracking | → | `interval_items` |

**Script behavior:**
- Idempotent — safe to run multiple times (uses upsert logic)
- Logs all rows imported, skipped, or errored
- Handles the "Unknown" mileage values in Other Services (stores as NULL)
- Handles previous-owner records (flags them with a `previous_owner` boolean column)

---

## 7. API Design (Backend)

RESTful JSON API served by FastAPI. All endpoints prefixed with `/api/v1/`.

### Key Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/vehicles` | List all vehicles |
| POST | `/vehicles` | Add a vehicle |
| GET | `/vehicles/{id}/dashboard` | Dashboard summary data |
| GET | `/vehicles/{id}/oil-changes` | Oil change history |
| POST | `/vehicles/{id}/oil-changes` | Add oil change |
| GET | `/vehicles/{id}/service-records` | Service history |
| POST | `/vehicles/{id}/service-records` | Add service record |
| GET | `/vehicles/{id}/interval-items` | All interval tracker items |
| POST | `/vehicles/{id}/interval-items` | Add interval item |
| PATCH | `/vehicles/{id}/interval-items/{item_id}` | Update item |
| POST | `/vehicles/{id}/interval-items/{item_id}/mark-serviced` | Mark as done |
| GET | `/vehicles/{id}/observations` | All observations |
| POST | `/vehicles/{id}/observations` | Add observation |
| GET | `/settings` | Get app settings |
| PATCH | `/settings` | Update settings |
| GET | `/export` | Export all data as JSON |

---

## 8. PWA Requirements

The app must function as a PWA so it can be installed on both desktop and mobile devices via the browser.

| Requirement | Implementation |
|---|---|
| Installable | `manifest.json` with name, icons, theme color |
| Works offline | Service worker caches app shell; data pages show cached state with "offline" indicator |
| Mobile-friendly | Responsive layout — single column on mobile, wider layout on desktop |
| Home screen icon | App icon provided (Tacoma-themed or generic wrench) |
| No native app store | Installed directly from browser via "Add to Home Screen" |

---

## 9. UI / Visual Style

Inspired by the CarFax Car Care app screenshots with the following direction:

- **Primary color:** CarFax blue (`#3A6FD8` or similar)
- **Status colors:** Green (OK), Amber (Due Soon), Red (Overdue), Gray (Ad-Hoc)
- **Typography:** Clean sans-serif (Inter or system-ui)
- **Layout:** Card-based, list views with chevron arrows for drill-down
- **Bottom navigation bar** (mobile): Dashboard | History | Tracker | Observations | Settings
- **Top navigation** (desktop): Sidebar or top nav

*Full UI specification will be developed in a separate design session.*

---

## 10. Out of Scope (Deliberately Excluded)

These features from CarFax Car Care are explicitly **not** being built:

| Feature | Reason Excluded |
|---|---|
| Repair cost estimates by zip code | Requires external API, not needed |
| Shop finder / invite shop | Not relevant for personal use |
| CarFax shop finder / invite shop | Not relevant for personal use |
| Emissions / inspection reminders | Can be added as interval items manually |
| Fuel cost tracking | Removed per owner preference |
| CarFax vehicle history report | External service, not applicable |
| Multi-user / sharing | Single-owner app |

---

## 11. Development Phases

### Phase 1 — Foundation
- Docker Compose setup (PostgreSQL + FastAPI + Nginx)
- Database schema creation with migrations (Alembic)
- Data import script from spreadsheet
- Core API endpoints

### Phase 2 — Core Features
- React frontend scaffold (Vite + React + Tailwind)
- PWA manifest and service worker
- Dashboard screen
- Service History screen
- Interval Tracker screen

### Phase 3 — Full Feature Set
- Add/Edit forms for all record types
- Observations / Journal section
- Settings screen
- Export functionality

### Phase 4 — Polish
- Mobile responsiveness review
- Offline behavior testing
- Performance optimization
- Backup script

*Note: Phases have been superseded by the updated plan in Section 13.*

---

## 12. Resolved Design Decisions

The following were confirmed by the owner after initial spec review.

### 12.1 Auto-Update Interval Items on Service Record Entry

**Decision: Yes — prompt the user to update matching interval items.**

When a service record is saved, the backend checks all `interval_items` for the vehicle. If any item's name fuzzy-matches one of the services performed (e.g., saving "Transmission Fluid Changed" matches the "Transmission (OEM Fluid)" interval item), the app will:

1. Display a confirmation prompt: *"Would you like to mark these interval items as serviced?"*
2. Show the matched items as a checklist (user can deselect any)
3. On confirm: update `last_service_date` and `last_service_miles` on the selected items, and recalculate `next_service_miles`

This prevents double-entry and keeps the tracker in sync automatically.

**Implementation note:** Matching is fuzzy (case-insensitive substring match), not exact. The user can always manually edit interval items if the auto-match is wrong.

---

### 12.2 Push Notifications

**Decision: Yes — browser push notifications, including iOS PWA support.**

#### What gets notified
- An interval item becomes **Overdue** (crossed the due mileage)
- An interval item enters **Due Soon** status (within the per-item threshold)
- A configurable weekly digest: *"You have X items due soon and Y overdue"*

#### How it works (Web Push API)
The app uses the **Web Push API** (VAPID protocol), which is the standard across Chrome, Firefox, Edge, and Safari. The notification is triggered server-side by the FastAPI backend on a schedule (daily cron job checks mileage status and fires notifications to subscribed clients).

#### iOS-specific requirements and limitations

| Requirement | Detail |
|---|---|
| Minimum iOS version | **16.4+** (released March 2023) |
| Installation required | User **must add the app to Home Screen** via Safari's Share menu. Push does NOT work from a browser tab on iOS — this is an Apple restriction, not a bug. |
| Permission prompt | iOS will only show the push permission dialog after the app is opened from the Home Screen icon. The app will guide the user through this on first launch. |
| Safari only on iOS | On iOS, all browsers use WebKit under the hood. The PWA must be added via Safari specifically. |
| Background delivery | iOS delivers push notifications even when the app is closed, same as native apps, once permission is granted. |

#### Backend implementation
- FastAPI generates a **VAPID key pair** (one-time setup, stored in `app_settings`)
- A `push_subscriptions` table stores each device's push endpoint and keys
- A daily background job (APScheduler or system cron calling a FastAPI endpoint) evaluates all interval items against current mileage and fires notifications where warranted
- Uses the `pywebpush` Python library for VAPID-signed push delivery

#### New database table: `push_subscriptions`

| Column | Type | Description |
|---|---|---|
| `id` | UUID (PK) | |
| `vehicle_id` | UUID (FK) | |
| `endpoint` | TEXT | Browser-provided push endpoint URL |
| `p256dh` | TEXT | Browser encryption key |
| `auth` | TEXT | Browser auth secret |
| `device_label` | VARCHAR | User-friendly label (e.g., "iPhone", "Desktop") |
| `created_at` | TIMESTAMP | |

#### Settings additions
The Settings screen will include a **Notifications** section:
- Enable/disable push notifications (per device)
- Weekly digest: on/off + day of week
- Test notification button (fires an immediate test push)

---

### 12.3 File Attachments

**Decision: Yes — photo/file attachments for both service records and observation journal entries.**

#### What can be attached
- **Service records:** Receipt photos, invoice scans, any relevant document
- **Observations:** Screenshots, photos of the issue, reference images

#### Storage
Files are stored on the **host filesystem** via a Docker volume mount, not in the database. The database stores only metadata (filename, path, MIME type, size). This keeps the database lean and makes backups straightforward.

```
Host path:   /your/server/path/vehicle-tracker-uploads/
Docker path: /app/uploads/  (mounted volume)
Structure:   /uploads/{vehicle_id}/{record_type}/{record_id}/{filename}
```

#### Supported file types
- Images: JPEG, PNG, WEBP, HEIC (iPhone native format)
- Documents: PDF
- Maximum file size: **10 MB per file** (configurable in settings)
- Maximum files per record: **10**

#### New database table: `attachments`

| Column | Type | Description |
|---|---|---|
| `id` | UUID (PK) | |
| `vehicle_id` | UUID (FK) | |
| `record_type` | ENUM | `service_record`, `oil_change`, `observation` |
| `record_id` | UUID | FK to the parent record |
| `filename` | VARCHAR | Original filename |
| `stored_path` | TEXT | Relative path within uploads volume |
| `mime_type` | VARCHAR | e.g., `image/jpeg` |
| `file_size_bytes` | INTEGER | |
| `created_at` | TIMESTAMP | |

#### API additions
| Method | Path | Description |
|---|---|---|
| POST | `/attachments/upload` | Upload a file, returns attachment record |
| GET | `/attachments/{id}` | Download/view a file |
| DELETE | `/attachments/{id}` | Delete a file and its record |

#### UI behavior
- Attachment section appears at the bottom of each service record and observation detail view
- Tap "+" to open device camera or file picker
- Thumbnails shown inline for images; PDF icon for documents
- Tap thumbnail to view full-size; long-press or swipe to delete
- On desktop: drag-and-drop supported

---

## 13. Updated Development Phases

### Phase 1 — Foundation
- Docker Compose setup (PostgreSQL + FastAPI + Nginx + uploads volume)
- Database schema + Alembic migrations (including attachments + push_subscriptions)
- VAPID key pair generation (stored in app_settings on first run)
- Data import script from spreadsheet
- Core API endpoints

### Phase 2 — Core Features
- React frontend scaffold (Vite + React + Tailwind)
- PWA manifest, service worker, and Web Push subscription flow
- iOS Home Screen installation guide (shown on first visit from Safari)
- Dashboard screen
- Service History screen
- Interval Tracker screen

### Phase 3 — Full Feature Set
- Add/Edit forms for all record types
- Auto-update interval item prompt on service record save
- Observations / Journal section
- File attachment upload and display
- Settings screen (including notification settings + VAPID management)
- Export functionality

### Phase 4 — Notifications & Polish
- Daily background job for push notification evaluation
- Weekly digest notification
- Mobile responsiveness review
- Offline behavior testing
- Backup script (PostgreSQL dump + uploads folder)
- Performance optimization

---

## 14. Open Questions / Future Enhancements
- Severe vs. Normal maintenance schedule toggle (UI placeholder in Phase 2, logic in future phase)
- Should HEIC files be auto-converted to JPEG on upload for better browser compatibility?
- Should the weekly digest include a cost estimate for overdue items?
