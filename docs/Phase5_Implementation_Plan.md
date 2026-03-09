# Phase 5: Major Updates — Implementation Plan

## Context

The Vehicle Service Tracker needs a major functional redesign per `docs/Major_Updates_Phase5.md`. An interactive HTML mockup (`docs/mockup-v2.html`) has been completed and validated across 4 phases. This plan implements those mockup designs into the actual React frontend + FastAPI backend.

**Key changes:** Oil changes consolidated into regular services, Notes integrated into History timeline, new Shops page, category/service system, multi-service cost tracking, note-service bidirectional linking, and navigation restructure.

**Design decisions confirmed:**

- Categories/services: Seed data only (15 categories, 51 services inserted on startup, not user-editable). Custom services handled via `custom_service_name` field.
- Google Places: Test mode first (hardcoded fake results). Real API integration deferred.

---

## Pre-Phase: Commit Existing Uncommitted Work

12 files have uncommitted changes (record_type on interval_items, mark-serviced facility field, frontend tweaks). These are compatible with Phase 5.

**Actions:**

- Delete the accidental `nul` file in repo root
- Commit all 12 changed files + migration `003_add_interval_item_record_type.py` as: _"Add record_type to interval items and facility to mark-serviced"_
- This gives us a clean baseline for Phase 5

---

## Phase 5.1: Categories, Services & Shops — Database + API

**Goal:** Create foundation tables, seed 15 categories / 51 services, add Shops CRUD.

### Migration 004: New tables

| Table                  | Key Columns                                                                                                                                   |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `service_categories`   | id (UUID PK), name, display_order, created_at                                                                                                 |
| `service_definitions`  | id (UUID PK), category_id (FK), name, created_at; UNIQUE(category_id, name)                                                                   |
| `shops`                | id (UUID PK), vehicle_id (FK), name, address, phone, website, hours, google_place_id, created_at                                              |
| `service_record_items` | id (UUID PK), service_record_id (FK CASCADE), service_definition_id (FK NULL), custom_service_name (NULL), cost (Numeric NULL), display_order |
| `note_service_links`   | id (UUID PK), observation_id (FK CASCADE), service_record_id (FK CASCADE); UNIQUE(observation_id, service_record_id)                          |

**Alter `service_records`:** ADD `shop_id` (FK NULL), `total_cost`, `shop_fee`, `tax` — keep existing `facility` + `services_performed` columns for backward compat.

**Alter `interval_items`:** ADD `service_definition_id` (FK NULL), `category_id` (FK NULL).

### New backend files

- `backend/app/models/service_category.py` — ServiceCategory model
- `backend/app/models/service_definition.py` — ServiceDefinition model
- `backend/app/models/shop.py` — Shop model
- `backend/app/models/service_record_item.py` — ServiceRecordItem model
- `backend/app/models/note_service_link.py` — NoteServiceLink model
- `backend/app/schemas/service_category.py` — CategoryOut (with nested services), ServiceDefinitionOut
- `backend/app/schemas/shop.py` — ShopCreate, ShopUpdate, ShopOut
- `backend/app/api/categories.py` — `GET /categories` (list all with nested services)
- `backend/app/api/shops.py` — Full CRUD: list, create, update, delete
- `backend/app/services/seed.py` — Idempotent seed function (15 categories, 51 services from `docs/Categories_and_Services.md`)
- `backend/alembic/versions/004_add_categories_shops_junctions.py`

### Modified backend files

- `backend/app/models/__init__.py` — Import new models
- `backend/app/models/service_record.py` — Add shop_id FK, cost columns, relationships to items + links
- `backend/app/models/interval_item.py` — Add service_definition_id, category_id FKs
- `backend/app/models/observation.py` — Add relationship to note_service_links
- `backend/app/models/vehicle.py` — Add shops relationship
- `backend/app/api/router.py` — Register categories + shops routers
- `backend/app/main.py` — Call seed function in lifespan

### Verification

- `docker compose up` → migration runs, seed populates 15 categories + 51 services
- `GET /api/v1/categories` → returns all categories with nested service arrays
- `POST/GET/PATCH/DELETE /api/v1/vehicles/{id}/shops` → CRUD works
- Existing app still functions (no breaking changes)

---

## Phase 5.2: Oil Change Consolidation — Data Migration

**Goal:** Migrate oil_change records into service_records, update dashboard to stop depending on oil_changes table.

### Migration 005: Data migration

For each `oil_changes` row:

1. Create `service_records` row (same vehicle_id, service_date, facility, odometer, notes, created_at)
2. Set `services_performed = ['Oil & Filter Change']` on the new record
3. Create `service_record_items` row linking to "Oil & Filter Change" service_definition
4. Update any `attachments` with `record_type='oil_change'` to point to new service_record id with `record_type='service_record'`
5. **Keep** oil_changes table intact (do NOT drop — safety net)

### Modified backend files

- `backend/app/api/dashboard.py` — Compute mileage_stats from service_records (filter by "Oil & Filter Change" service_definition) instead of oil_changes table. Update NextOilChange to query service_records.
- `backend/app/api/interval_items.py` — In `mark_serviced`, always create service_record + service_record_item (remove oil_change creation branch). For "Oil & Filter Change", store interval data in notes.
- `backend/app/api/oil_changes.py` — Add deprecation warning headers to all responses. Keep endpoints functional.
- `backend/app/schemas/service_record.py` — Add `ServiceRecordItemOut`, `ServiceRecordDetailOut` (with nested items, cost fields, linked_observations). Update `ServiceRecordCreate` to accept `items: list[ServiceRecordItemCreate]`, `shop_id`, cost fields.
- `backend/app/api/service_records.py` — Update create endpoint to handle service_record_items. Add eager loading of items on list/get. Add linking endpoints.

### Verification

- Run migration → verify oil_change records now have matching service_records
- Dashboard mileage stats still calculate correctly
- `mark_serviced` on "Oil & Filter Change" interval item creates a service_record (not oil_change)
- Oil change attachments now accessible under their new service_record IDs

---

## Phase 5.3: Note-Service Linking + Facility→Shop Rename (Backend)

**Goal:** Bidirectional note↔service linking API. Rename "facility" references to "shop" throughout backend.

### New backend files

- `backend/app/schemas/note_service_link.py` — LinkCreate, LinkOut

### Modified backend files

- `backend/app/api/observations.py` — Add link/unlink endpoints: `POST /{id}/observations/{obs_id}/links`, `DELETE .../links/{link_id}`. Update ObservationOut to include linked_service_record_ids.
- `backend/app/api/service_records.py` — Add link/unlink endpoints: `POST /{id}/service-records/{rec_id}/links`, `DELETE .../links/{link_id}`. Update detail to include linked_observations.
- `backend/app/schemas/observation.py` — Add `linked_service_record_ids: list[UUID]` to ObservationOut

### Verification

- Create a service record and observation → link them via POST
- Both sides show the link in their response
- Delete link → both sides updated
- CASCADE: delete the service record → link auto-deleted

---

## Phase 5.4: Frontend Infrastructure — Types, API, Shops Page, Navigation

**Goal:** Add all new TypeScript types, API client methods, React Query hooks. Build Shops page. Restructure navigation (remove Notes, add Shops).

### New frontend files

- `frontend/src/pages/ShopsPage.tsx` — Shop list with search, cards grid, Add/Edit modal
- `frontend/src/components/forms/AddShopModal.tsx` — Create/edit shop form (manual entry for now; Places search in Phase 5.8)
- `frontend/src/components/forms/ShopAutocomplete.tsx` — Dropdown to select from saved shops (replaces FacilityAutocomplete)

### Modified frontend files

- `frontend/src/types/api.ts` — Add: `ServiceCategory`, `ServiceDefinition`, `Shop`, `ShopCreate`, `ServiceRecordItem`, `ServiceRecordItemCreate`, `NoteServiceLink`. Update: `ServiceRecord` (add shop_id, shop, items, cost fields), `Observation` (add linked_service_record_ids). Add `ServiceHistoryEntry` type for note entries.
- `frontend/src/lib/api.ts` — Add: `api.categories.list()`, `api.shops.*` (CRUD + search), `api.serviceRecords.getDetail()`, `api.noteServiceLinks.*`. Deprecate: `api.oilChanges`.
- `frontend/src/hooks/useApi.ts` — Add: `useCategories()`, `useShops()`, `useCreateShop()`, `useUpdateShop()`, `useDeleteShop()`. Remove: `useCreateOilChange()`, `useFacilities()`.
- `frontend/src/App.tsx` — Replace `/notes` route with `/shops` → ShopsPage. Add `/notes` redirect to `/history`.
- `frontend/src/components/layout/TabBar.tsx` — Replace Notes tab with Shops tab (`Store` icon).
- `frontend/src/components/layout/Sidebar.tsx` — Replace Notes nav item with Shops (`Store` icon).

### Verification

- Navigation shows: Dashboard, History, Tracker, Shops
- `/notes` redirects to `/history`
- Shops page renders, CRUD works (add/edit/delete shops)
- `useCategories()` returns 15 categories with services
- No TypeScript errors, no console errors

---

## Phase 5.5: Enhanced Add Service Record Form

**Goal:** Rebuild AddServiceRecordModal with cascading category→service selects, dynamic rows, per-service costs, shop selection, note linking.

### Modified frontend files

- `frontend/src/components/forms/AddServiceRecordModal.tsx` — **Full rewrite:**
  - Shop selector (ShopAutocomplete dropdown)
  - Dynamic service rows: Category dropdown → Service dropdown (cascading from `useCategories()`), optional cost per row, add/remove rows
  - Cost auto-calc: subtotal (sum per-service) + shop fee + tax = total
  - Notes textarea
  - "Link Existing Notes" dropdown (unresolved observations) with removable chips
  - Submit creates service_record with items[] and linked note IDs
- `frontend/src/components/forms/AddObservationModal.tsx` — Add optional "Link to Service Record" dropdown (recent records, selected as chip)

### Files to delete

- `frontend/src/components/forms/AddOilChangeModal.tsx` — Oil changes now go through the standard service record form
- `frontend/src/components/forms/FacilityAutocomplete.tsx` — Replaced by ShopAutocomplete
- `frontend/src/components/forms/TagInput.tsx` — No longer needed (services selected via dropdowns, not free-text tags)

### Verification

- Open Add Service Record → select category → service options populate
- Add 2+ service rows with costs → total auto-calculates
- Select a shop from saved shops
- Link an unresolved note → chip appears
- Submit → record created with items and links in backend
- Open Add Note → link to existing service record works

---

## Phase 5.6: Enhanced History Page — Unified Timeline + Detail Modal

**Goal:** Mixed service+note timeline, 3 filter dropdowns, full-screen detail modal matching mockup.

### Modified frontend files

- `frontend/src/lib/history.ts` — Rewrite `mergeHistory()` to accept service records + observations, producing unified `HistoryEntry[]`. Remove oil change merging.
- `frontend/src/pages/HistoryPage.tsx` — **Major rewrite:**
  - **Filter bar:** Category, Service, Shop dropdowns + search toggle + Add dropdown (click-toggle)
  - **Add dropdown:** "Service Record" and "Note" (no more "Oil Change")
  - **Service cards:** Icon, service name(s) — single name if 1 service, "N Services" + first 2-3 listed if multiple. Date, odometer, shop, cost, link badge.
  - **Note cards:** Smaller, left accent border, text preview, date, resolved badge, link badge if linked.
  - **Detail modal:** Full-screen overlay with backdrop blur. Sections: header (date, odometer, shop+address), services by category with per-service costs, cost summary (subtotal + fee + tax = total), linked notes, record notes, attachments.

### Verification

- History shows mixed timeline of services and notes, grouped by month
- All 3 filter dropdowns filter correctly
- Search works across card content
- Click service card → full-screen detail with costs, categories, linked notes
- Click note card → note detail with linked service records

---

## Phase 5.7: Enhanced Tracker + Dashboard

**Goal:** Tracker group toggle (By Status / By Category). Dashboard "Top 3 Upcoming" replacing oil change card.

### Modified frontend files

- `frontend/src/pages/TrackerPage.tsx` — Add group toggle: "By Status" (default, current behavior) / "By Category" (group by category_id). Add category badge to cards. Update MarkServicedModal to use ShopAutocomplete.
- `frontend/src/pages/DashboardPage.tsx` — Replace `OilChangeCard` with "Top 3 Upcoming" card (3 nearest-due interval items with status dot, name, category, miles remaining, mini progress bar). Single "Add Service Record" QuickAction (remove Observation button). Update mileage stats text.
- `frontend/src/components/forms/IntervalItemFormModal.tsx` — Add category/service dropdowns from catalog. Selecting auto-fills name and links to service_definition_id.

### Backend minor update

- `backend/app/schemas/dashboard.py` — Add `upcoming_items: list[IntervalItemOut]` (top 3 nearest-due) to DashboardOut.
- `backend/app/api/dashboard.py` — Compute top 3 upcoming items. Update mileage stats source.

### Verification

- Tracker group toggle switches between By Status / By Category views
- Category badges visible on tracker cards
- Dashboard shows Top 3 Upcoming card with correct data
- "Add Service Record" is the only quick action
- Mileage stats still calculate correctly

---

## Phase 5.8: Google Places Integration + Cleanup

**Goal:** Backend proxy for Google Places search (test mode). Final cleanup of deprecated code.

### New backend files

- `backend/app/api/places.py` — `GET /api/v1/shops/search?q=...` endpoint. Rate limited (5 req/min). Test mode (`GOOGLE_PLACES_TEST_MODE=true`, default) returns hardcoded results. Real mode requires `GOOGLE_PLACES_API_KEY`.

### Modified files

- `backend/app/config.py` — Add `GOOGLE_PLACES_API_KEY`, `GOOGLE_PLACES_TEST_MODE` settings
- `backend/app/api/router.py` — Register places router
- `frontend/src/components/forms/AddShopModal.tsx` — Add Places search input with debounced API call, results dropdown, auto-fill on selection, "Or enter manually" toggle

### Cleanup

- Delete `frontend/src/pages/NotesPage.tsx`
- Remove all remaining `facility` string references in frontend (use `shop`/`shop_id` everywhere)
- Clean up unused oil change imports/references in DashboardPage

### Optional Migration 006 (defer to later)

- Drop `oil_changes` table
- Drop `service_records.facility` column
- Drop `service_records.services_performed` column
- Update `recordtype` enum in attachments

### Verification

- Google Places search works in test mode (hardcoded results)
- Selecting a place auto-fills shop form
- No dead code remains
- Full app works end-to-end: create shop via Places → add service record → view in history → filter → detail modal

---

## Dependency Graph

```
Pre-Phase (commit existing changes)
    │
    ▼
Phase 5.1 (Categories, Services, Shops DB + API)
    │
    ├──────────────────────┐
    ▼                      ▼
Phase 5.2 (Oil Change     Phase 5.4 (Frontend infra:
  Consolidation)            types, API, Shops page, nav)
    │                      │
    ▼                      ├─────────────┬─────────────┐
Phase 5.3 (Note-Service    ▼             ▼             ▼
  Linking + Rename)    Phase 5.5     Phase 5.6     Phase 5.7
    │                  (Add Record   (History      (Tracker +
    │                   Form)         Page)         Dashboard)
    │                      │             │             │
    └──────────────────────┴─────────────┴─────────────┘
                                    │
                                    ▼
                            Phase 5.8 (Google Places
                              + Cleanup)
```

**Phases 5.2-5.3** (backend) and **5.4** (frontend infra) can run in parallel.
**Phases 5.5, 5.6, 5.7** depend on 5.4 but are independent of each other.
**Phase 5.8** is final polish after everything else.

---

## Critical Files Summary

| File                                                      | Phases   | Change Type                      |
| --------------------------------------------------------- | -------- | -------------------------------- |
| `backend/app/models/service_record.py`                    | 5.1, 5.2 | Add columns + relationships      |
| `backend/app/api/dashboard.py`                            | 5.2, 5.7 | Refactor away from oil_changes   |
| `backend/app/api/service_records.py`                      | 5.2, 5.3 | Multi-service items + linking    |
| `frontend/src/types/api.ts`                               | 5.4      | Add all new types                |
| `frontend/src/hooks/useApi.ts`                            | 5.4      | Add hooks, remove deprecated     |
| `frontend/src/pages/HistoryPage.tsx`                      | 5.6      | Major rewrite — unified timeline |
| `frontend/src/components/forms/AddServiceRecordModal.tsx` | 5.5      | Full rewrite — cascading selects |
| `frontend/src/pages/TrackerPage.tsx`                      | 5.7      | Add group toggle                 |
| `frontend/src/pages/DashboardPage.tsx`                    | 5.7      | Top 3 Upcoming card              |

## Risk Mitigations

1. **Oil change data migration (5.2):** Keep oil_changes table intact, migration is additive only, reversible
2. **Dashboard breakage (5.2/5.7):** Update dashboard API atomically with migration
3. **Type changes (5.4):** Add new types without changing existing HistoryPage rendering (that's 5.6)
4. **Attachment references (5.2):** Migration updates attachment record_type + record_id for migrated oil changes
