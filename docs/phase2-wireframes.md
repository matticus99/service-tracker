# Phase 2 — UI Wireframes & Interaction Spec
**Vehicle Service Tracker**
**Date:** March 1, 2026
**Status:** Draft — Design Decisions Resolved

---

## Screens in Scope

| # | Screen | Description |
|---|--------|-------------|
| 1 | App Shell | Navigation, vehicle selector, layout frame |
| 2 | Dashboard | Vehicle health snapshot, alerts, quick actions |
| 3 | Service History | Unified timeline of all service work |
| 4 | Interval Tracker | Maintenance items with status + cost projections |

---

## 1. App Shell & Navigation

The app shell wraps all screens and provides consistent navigation + vehicle context.

### Mobile Layout (< 768px)

```
┌──────────────────────────────────────┐
│ ◀ Back    Screen Title       [⚙] [⋮]│  ← Top bar (contextual)
├──────────────────────────────────────┤
│                                      │
│                                      │
│         [ Screen Content ]           │
│                                      │
│                                      │
│                                      │
├──────────────────────────────────────┤
│   🏠      📋       🔧       📝      │  ← Bottom tab bar (4 tabs)
│  Dash   History  Tracker   Notes     │
└──────────────────────────────────────┘
```

**Top Bar behavior:**
- Dashboard: Shows vehicle selector dropdown (tap to switch vehicles)
- Sub-screens: Shows "◀ Back" + screen title
- Right side: ⚙ gear icon (opens Settings) + contextual action (search on History, + on Tracker, etc.)

**Bottom Tab Bar:**
- 4 tabs: Dashboard | History | Tracker | Notes
- Settings moved to top-bar gear icon (reduces tab crowding on small phones)
- Active tab highlighted with filled icon + accent color
- Badge count on Dashboard tab when overdue items exist
- Persists on all top-level screens, hides on detail/edit views

### Desktop Layout (≥ 1024px)

```
┌──────────────────────────────────────────────────────────┐
│  [🔧] Service Tracker    2016 Toyota Tacoma ▼   191,083 mi │  ← Top header bar
├────────────┬─────────────────────────────────────────────┤
│            │                                             │
│  Dashboard │                                             │
│  History   │          [ Screen Content ]                 │
│  Tracker   │                                             │
│  Notes     │                                             │
│  Settings  │                                             │
│            │                                             │
│            │                                             │
│            │                                             │
├────────────┴─────────────────────────────────────────────┤
```

**Desktop differences:**
- Left sidebar navigation replaces bottom tabs — **always visible** (persistent, not collapsible)
- Vehicle selector + mileage display lives in the top header bar
- More horizontal space: cards can sit side-by-side
- Settings link lives at the bottom of the sidebar (with gear icon)

### Vehicle Selector

Currently only one vehicle exists (Tacoma), but the selector is present from day one.

```
┌─────────────────────────────┐
│  2016 Toyota Tacoma       ▼ │  ← Tap to open
├─────────────────────────────┤
│  ✓ 2016 Toyota Tacoma       │  ← Currently selected
│    191,083 mi               │
├─────────────────────────────┤
│  + Add Vehicle              │  ← Always last item
└─────────────────────────────┘
```

---

## 2. Dashboard

The first screen the user sees. Answers: "What needs attention right now?"

### Mobile Wireframe

```
┌──────────────────────────────────────┐
│  2016 Toyota Tacoma ▼       [⚙] [⋮] │
├──────────────────────────────────────┤
│                                      │
│  ┌──────────┐  ┌──────────────┐      │  ← Quick actions at TOP
│  │+ Service │  │+ Observation │      │    (scroll off with content)
│  │ Record   │  │              │      │
│  └──────────┘  └──────────────┘      │
│                                      │
│  ┌──────────────────────────────┐    │
│  │  ⚠ NEEDS ATTENTION           │    │
│  │                              │    │
│  │  🔴 2 Overdue                │ ›  │
│  │  Spark Plugs, Trans Fluid    │    │
│  │                              │    │
│  │  🟡 3 Due Soon               │ ›  │
│  │  Oil Change, Brake Pads,     │    │
│  │  Coolant Flush               │    │
│  └──────────────────────────────┘    │
│                                      │
│  ┌──────────────────────────────┐    │
│  │  🛢 Next Oil Change           │    │
│  │                              │    │
│  │  Due at 196,083 mi           │    │
│  │  4,700 mi remaining          │    │
│  │  ≈ 6 weeks away              │    │
│  │                              │    │
│  │  Last: 11/29/2025 at Take 5  │    │
│  └──────────────────────────────┘    │
│                                      │
│  ┌──────────────────────────────┐    │
│  │  💰 Upcoming Costs (N)         │    │
│  │  (overdue + due soon only)    │    │
│  │                              │    │
│  │  Overdue services (N) $347.00│    │
│  │  Due soon services (N)$289.00│    │
│  │  ─────────────────────────── │    │
│  │  Subtotal            $636.00 │    │
│  │  Shop fee             $40.00 │    │
│  │  Tax (7%)             $47.32 │    │
│  │  ─────────────────────────── │    │
│  │  Estimated total     $723.32 │    │
│  └──────────────────────────────┘    │
│                                      │
│  ┌──────────────────────────────┐    │
│  │  📊 Stats          │    │
│  │                              │    │
│  │  Daily     42 mi             │    │
│  │  Weekly   294 mi             │    │
│  │  Monthly 1,260 mi            │    │
│  │                              │    │
│  │  Based on 14 oil changes     │    │
│  └──────────────────────────────┘    │
│                                      │
│  ┌──────────────────────────────┐    │  ← Vehicle card at BOTTOM
│  │ ┌──────┐  2016 Toyota Tacoma │    │    on mobile
│  │ │      │  Double Cab V6·Gray │    │
│  │ │ 📷   │                     │    │  ← Thumbnail (photo or
│  │ │ photo│     191,083 mi      │    │     placeholder with icon)
│  │ └──────┘  [Update Mileage]   │    │
│  └──────────────────────────────┘    │
│                                      │
├──────────────────────────────────────┤
│  🏠Dash   📋Hist   🔧Track   📝Notes │
└──────────────────────────────────────┘
```

### Desktop Wireframe (content area only)

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐                       │  ← Quick actions at TOP
│  │ + Service Record │  │ + Observation    │                       │
│  └─────────────────┘  └─────────────────┘                       │
│                                                                 │
│  ┌──────────────────┐ ┌────────────────┐ ┌────────────────────┐ │  ← Row 1: 3 columns
│  │ ⚠ NEEDS ATTENTION│ │ 🛢 Next Oil     │ │ 💰 Upcoming Costs(N)│ │
│  │                  │ │  Change        │ │                    │ │
│  │ 🔴 2 Overdue   › │ │ Due at         │ │ Overdue (N) $XXX.XX│ │
│  │ Spark Plugs,     │ │ 196,083 mi     │ │ Due soon(N) $XXX.XX│ │
│  │ Trans Fluid      │ │                │ │ ────────────────── │ │
│  │                  │ │ 4,700 mi left  │ │ Subtotal + fees    │ │
│  │ 🟡 3 Due Soon  › │ │ ≈ 6 weeks      │ │ Total      $XXX.XX│ │
│  │ Oil, Brakes,     │ │                │ │                    │ │
│  │ Coolant          │ │ Last: 11/29/25 │ │                    │ │
│  └──────────────────┘ └────────────────┘ └────────────────────┘ │
│                                                                 │
│  ┌────────────────────────┐ ┌──────────────────────────────────┐│  ← Row 2: 2 columns
│  │ 📊 Stats    │ │ ┌──────┐ 2016 Toyota Tacoma      ││
│  │                        │ │ │      │ Double Cab V6 · Gray    ││
│  │ Daily     42 mi        │ │ │ 📷   │                         ││  ← Vehicle card on RIGHT
│  │ Weekly   294 mi        │ │ │ photo│  191,083 mi             ││    with thumbnail
│  │ Monthly 1,260 mi       │ │ └──────┘ [ Update Mileage ]      ││
│  └────────────────────────┘ └──────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Dashboard Interactions

| Element | Tap/Click Action |
|---------|-----------------|
| Vehicle selector | Opens vehicle dropdown |
| Update Mileage button | Opens mileage update modal (number input + save) |
| Overdue row (🔴) | Navigates to Interval Tracker, filtered to overdue items |
| Due Soon row (🟡) | Navigates to Interval Tracker, filtered to due-soon items |
| Next Oil Change card | Navigates to Service History, filtered to oil changes |
| Upcoming Costs card | Navigates to Interval Tracker (full view with cost footer) |
| + Add Service Record | Opens Add Service Record form (Phase 3, placeholder for now) |
| + Add Observation | Opens Add Observation form (Phase 3, placeholder for now) |
| ⋮ menu (mobile) | Refresh data |

### Dashboard Data Notes

- **Mileage averages** are calculated from oil change history: total miles between first and last oil change, divided by total days between them.
- **"≈ X weeks"** on next oil change uses average daily mileage to project when the due mileage will be reached.
- **Upcoming costs** only include items with status overdue or due_soon. Ad-hoc items are excluded since they have no due date.
- If there are **no overdue or due-soon items**, the "Needs Attention" card shows a green checkmark: "✓ All services up to date"

---

## 3. Service History

Unified chronological view of all service work (oil changes + other services merged).

### Mobile Wireframe

```
┌──────────────────────────────────────┐
│  ◀ Back    Service History      🔍   │
├──────────────────────────────────────┤
│  ┌──────────────────────────────┐    │
│  │ Filter: All ▼ │ Facility ▼  │    │
│  │ Date range: All time ▼      │    │
│  └──────────────────────────────┘    │
│                                      │
│  ── November 2025 ──────────────     │
│                                      │
│  ┌──────────────────────────────┐    │
│  │  🛢 Oil Change            ›  │    │
│  │  Take 5 Oil Change           │    │
│  │  11/29/2025 · 188,321 mi     │    │
│  │                              │    │
│  │  • Vehicle serviced          │    │
│  │  • Oil and filter changed    │    │
│  └──────────────────────────────┘    │
│                                      │
│  ── May 2025 ───────────────────     │
│                                      │
│  ┌──────────────────────────────┐    │
│  │  🛢 Oil Change            ›  │    │
│  │  Take 5 Oil Change           │    │
│  │  05/31/2025 · 183,746 mi     │    │
│  │                              │    │
│  │  • Vehicle serviced          │    │
│  │  • Oil and filter changed    │    │
│  │  • Wiper(s) replaced         │    │  ← Max 3 items shown
│  └──────────────────────────────┘    │
│                                      │
│  ┌──────────────────────────────┐    │
│  │  🔧 Service              ›  │    │
│  │  Bass Auto Care              │    │
│  │  05/01/2025 · 182,998 mi     │    │
│  │                              │    │
│  │  • Brake pads replaced       │    │
│  │  • Rotors resurfaced         │    │
│  │  and 2 more...               │    │  ← Truncated, tap for full list
│  └──────────────────────────────┘    │
│                                      │
│  ── January 2025 ───────────────     │
│                                      │
│  ┌──────────────────────────────┐    │
│  │  🔧 Service              ›  │    │
│  │  DIY                         │    │
│  │  01/15/2025 · 180,200 mi     │    │
│  │                              │    │
│  │  • Air filter replaced       │    │
│  │  "K&N drop-in filter"        │    │
│  └──────────────────────────────┘    │
│                                      │
│         [ Load More ]                │
│                                      │
├──────────────────────────────────────┤
│  🏠Dash   📋Hist   🔧Track   📝Notes │
└──────────────────────────────────────┘
```

### Service History — Detail View (tap a record)

```
┌──────────────────────────────────────┐
│  ◀ Back    Service Detail    [Edit]  │
├──────────────────────────────────────┤
│                                      │
│  🛢 Oil Change                       │
│                                      │
│  Facility                            │
│  Take 5 Oil Change                   │
│                                      │
│  Date                                │
│  November 29, 2025                   │
│                                      │
│  Odometer                            │
│  188,321 mi                          │
│                                      │
│  Interval                            │
│  4,575 mi · 5.9 months              │
│  (since previous oil change)         │
│                                      │
│  Services Performed                  │
│  • Vehicle serviced                  │
│  • Oil and filter changed            │
│                                      │
│  Notes                               │
│  Full synthetic 0W-20, Mobil 1       │
│                                      │
│  Attachments                         │
│  No attachments  [+ Add]             │
│  (Phase 3)                           │
│                                      │
│  ─────────────────────────────────   │
│                                      │
│  [ Delete Record ]  (red text)       │
│                                      │
└──────────────────────────────────────┘
```

### Search Behavior (🔍 icon)

Tapping the search icon expands an inline search bar below the top bar:

```
┌──────────────────────────────────────┐
│  ◀ Back    Service History      ✕    │
├──────────────────────────────────────┤
│  🔍 Search services...              │
├──────────────────────────────────────┤
│  Results filtered by keyword...      │
```

- Searches across: facility name, services performed, notes
- Debounced (300ms) — results update as you type
- Clearing the search restores the full list

### Filter Bar Details

```
┌────────────────────────────────────────────┐
│  Type:  [ All ▼ ]   Facility: [ All ▼ ]   │
│  Date:  [ All Time ▼ ]                     │
└────────────────────────────────────────────┘
```

**Type filter options:**
- All (default)
- Oil Changes only
- Other Services only

**Facility filter options:**
- All (default)
- Dynamically populated from distinct facility values in history
- e.g., "Take 5 Oil Change", "Bass Auto Care", "DIY"

**Date range options:**
- All Time (default)
- Last 6 months
- Last year
- Last 2 years
- Custom range (date pickers)

### Grouping

Records are grouped by month/year with sticky section headers:
```
── November 2025 ──────────────
  [card] [card]
── May 2025 ───────────────────
  [card] [card]
```

### Empty State

If no records match filters or the vehicle has no history:

```
┌──────────────────────────────────────┐
│                                      │
│        📋                            │
│                                      │
│    No service records yet            │
│                                      │
│    Add your first service record     │
│    to start tracking.                │
│                                      │
│    [ + Add Service Record ]          │
│                                      │
└──────────────────────────────────────┘
```

---

## 4. Interval Tracker

The most important screen. Shows every maintenance item being tracked, its status, and projected costs.

### Mobile Wireframe

```
┌──────────────────────────────────────┐
│  ◀ Back   Interval Tracker     [+]  │
├──────────────────────────────────────┤
│                                      │
│  ┌──────────────────────────────┐    │
│  │ [Normal Schedule ▓▓] [Severe]│    │  ← Toggle (UI only Phase 2)
│  └──────────────────────────────┘    │
│                                      │
│  ── 🔴 OVERDUE (2) ─────────────    │
│                                      │
│  ┌──────────────────────────────┐    │
│  │  Spark Plugs          $85   ›│    │
│  │  Regular                     │    │
│  │                              │    │
│  │  Last: 08/12/2023 · 158,200  │    │
│  │  Due at: 188,200 mi          │    │
│  │  ████████████▓▓ 2,883 mi over│    │  ← bar overflows past 100%
│  └──────────────────────────────┘    │
│                                      │
│  ┌──────────────────────────────┐    │
│  │  Trans Fluid (OEM)   $195   ›│    │
│  │  Regular                     │    │
│  │                              │    │
│  │  Last: 03/20/2024 · 170,500  │    │
│  │  Due at: 190,500 mi          │    │
│  │  ██████████████▓ 583 mi over │    │  ← bar overflows past 100%
│  └──────────────────────────────┘    │
│                                      │
│  ── 🟡 DUE SOON (3) ────────────    │
│                                      │
│  ┌──────────────────────────────┐    │
│  │  Oil Change           $65   ›│    │
│  │  Regular                     │    │
│  │                              │    │
│  │  Last: 11/29/2025 · 188,321  │    │
│  │  Due at: 193,321 mi          │    │
│  │  ██████████░░ 2,238 left≈3wk │    │
│  └──────────────────────────────┘    │
│                                      │
│  ┌──────────────────────────────┐    │
│  │  Brake Pads (Front)  $124   ›│    │
│  │  Regular                     │    │
│  │                              │    │
│  │  Last: 05/01/2025 · 182,998  │    │
│  │  Due at: 192,998 mi          │    │
│  │  ███████████░ 1,915 left≈3wk │    │
│  └──────────────────────────────┘    │
│                                      │
│  ┌──────────────────────────────┐    │
│  │  Coolant Flush        $100  ›│    │
│  │  Regular                     │    │
│  │                              │    │
│  │  Last: 01/10/2024 · 168,000  │    │
│  │  Due at: 193,000 mi          │    │
│  │  ███████████░ 1,917 left≈3wk │    │
│  └──────────────────────────────┘    │
│                                      │
│  ── ✅ OK (5) ──── [collapsed ▶]     │  ← Collapsed by default
│                                      │
│  ── ⚪ AD-HOC (3) ── [collapsed ▶]   │  ← Collapsed by default
│                                      │
│  (Tap group header to expand)        │
│                                      │
│  ┌──────────────────────────────┐    │
│  │  COST SUMMARY                │    │
│  │                              │    │
│  │  All items subtotal  $1,247  │    │
│  │  Shop fee               $40  │    │
│  │  Tax (7%)               $90  │    │
│  │  ───────────────────────────  │    │
│  │  Estimated total     $1,377  │    │
│  └──────────────────────────────┘    │
│                                      │
├──────────────────────────────────────┤
│  🏠Dash   📋Hist   🔧Track   📝Notes │
└──────────────────────────────────────┘
```

### Interval Tracker — Item Detail (tap a row)

```
┌──────────────────────────────────────┐
│  ◀ Back    Spark Plugs       [Edit]  │
├──────────────────────────────────────┤
│                                      │
│  ┌──────────────────────────────┐    │
│  │       🔴 OVERDUE             │    │
│  │    2,883 miles overdue       │    │
│  └──────────────────────────────┘    │
│                                      │
│  Type                                │
│  Regular interval                    │
│                                      │
│  Last Serviced                       │
│  August 12, 2023 at 158,200 mi      │
│                                      │
│  Interval                            │
│  Every 30,000 miles                  │
│                                      │
│  Next Due                            │
│  188,200 mi (2,883 mi ago)           │
│                                      │
│  Due-Soon Threshold                  │
│  500 miles before due                │
│                                      │
│  Estimated Cost                      │
│  $85.00                              │
│                                      │
│  Notes                               │
│  NGK Iridium, gap 0.044"            │
│                                      │
│  ─────────────────────────────────   │
│                                      │
│  [  ✓ Mark as Serviced  ]            │  ← Primary action button
│                                      │
│  [ Delete Item ]  (red text)         │
│                                      │
└──────────────────────────────────────┘
```

### "Mark as Serviced" Flow

When the user taps "Mark as Serviced":

```
┌──────────────────────────────────────┐
│                                      │
│  Mark Spark Plugs as Serviced        │
│                                      │
│  Service Date                        │
│  [ 03/01/2026          📅 ]          │  ← Defaults to today
│                                      │
│  Odometer Reading                    │
│  [ 191,083            ]              │  ← Defaults to current_mileage
│                                      │
│  Next due at: 221,083 mi             │  ← Auto-calculated
│  (interval: 30,000 mi)               │
│                                      │
│  ─────────────────────────────────   │
│                                      │
│  [ Cancel ]        [ Confirm ]       │
│                                      │
└──────────────────────────────────────┘
```

- Presented as a bottom sheet (mobile) or modal (desktop)
- Date defaults to today, odometer defaults to current vehicle mileage
- Next due auto-calculates: entered_odometer + interval_miles
- On confirm: updates `last_service_date`, `last_service_miles`, recalculates `next_service_miles`, updates vehicle `current_mileage` if higher

### Desktop Layout (content area) — Interval Tracker

On desktop, the tracker uses a table layout instead of cards:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Interval Tracker                          [Normal ▓▓][Severe]    [ + Add ] │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  🔴 OVERDUE (2)                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ Item              │ Last Service     │ Next Due    │ Status    │ Cost  │  │
│  ├───────────────────┼──────────────────┼─────────────┼───────────┼───────┤  │
│  │ Spark Plugs       │ 08/12/23 158,200 │ 188,200 mi  │ 2,883 over│  $85  │  │
│  │ Trans Fluid (OEM) │ 03/20/24 170,500 │ 190,500 mi  │ 583 over  │ $195  │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  🟡 DUE SOON (3)                                                             │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ Oil Change        │ 11/29/25 188,321 │ 193,321 mi  │ 2,238 left│  $65  │  │
│  │ Brake Pads (Front)│ 05/01/25 182,998 │ 192,998 mi  │ 1,915 left│ $124  │  │
│  │ Coolant Flush     │ 01/10/24 168,000 │ 193,000 mi  │ 1,917 left│ $100  │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ✅ OK (5)                                                                    │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ Differential Fluid│ 06/15/24 175,000 │ 205,000 mi  │ 13,917 left│ $90  │  │
│  │ ...               │                  │             │           │       │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ⚪ AD-HOC (3)                                                               │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ Serpentine Belt   │ Never            │ As Needed   │ Ad-Hoc    │  $45  │  │
│  │ ...               │                  │             │           │       │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  Subtotal: $1,247   Shop fee: $40   Tax: $90   Total: $1,377         │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

- Table rows are clickable → opens detail panel or inline expansion
- Right-click or row-action menu: Edit, Mark as Serviced, Delete
- Sortable columns (click header to sort)

---

## 5. Interaction Patterns & Shared Behaviors

### Update Mileage Modal

Accessible from Dashboard and potentially from nav menu.

```
┌──────────────────────────────────────┐
│                                      │
│  Update Current Mileage              │
│                                      │
│  Current: 191,083 mi                 │
│                                      │
│  New mileage                         │
│  [ 191,500                ]          │
│                                      │
│  ⚠ This will recalculate all         │
│  interval item statuses.             │
│                                      │
│  [ Cancel ]        [ Save ]          │
│                                      │
└──────────────────────────────────────┘
```

- Input validates: must be ≥ current mileage (warn if lower, allow override)
- On save: updates `vehicles.current_mileage`, all interval statuses recalculate
- Dashboard refreshes automatically

### Status Color System

| Status | Color | Hex (suggested) | Usage |
|--------|-------|-----------------|-------|
| Overdue | Red | `#DC2626` | Badge, left border, status text, progress bar fill (overflows past track) |
| Due Soon | Amber | `#D97706` | Badge, left border, status text, progress bar fill |
| OK | Green | `#16A34A` | Badge, left border, status text, progress bar fill |
| Ad-Hoc | Gray | `#6B7280` | Badge, left border, status text (no progress bar) |

Cards use a **left color border** (4px) to indicate status at a glance — visible without reading text.

**Progress bar behavior:**
- Track (background): light gray (`#E5E7EB`)
- Fill color matches status (green → amber → red)
- OK items: green fill, e.g. `[████████░░░░░░] 53%`
- Due Soon items: amber fill, e.g. `[██████████░░░░] 85%`
- Overdue items: red fill that **extends past the track endpoint**, visually communicating "past due"
- Ad-Hoc items: no progress bar (no interval to measure against)

### Loading States

```
┌──────────────────────────────────────┐
│  ┌──────────────────────────────┐    │
│  │  ░░░░░░░░░░░░░░░░░░░░░      │    │  ← Skeleton card
│  │  ░░░░░░░░░░░░                │    │
│  │  ░░░░░░░░░░░░░░░░            │    │
│  └──────────────────────────────┘    │
│  ┌──────────────────────────────┐    │
│  │  ░░░░░░░░░░░░░░░░░░░░░      │    │
│  │  ░░░░░░░░░░░░                │    │
│  │  ░░░░░░░░░░░░░░░░            │    │
│  └──────────────────────────────┘    │
```

Skeleton loaders that match card shapes — not spinners.

### Error States

```
┌──────────────────────────────────────┐
│                                      │
│        ⚠                             │
│                                      │
│    Couldn't load data                │
│    Check your connection and         │
│    try again.                        │
│                                      │
│    [ Retry ]                         │
│                                      │
└──────────────────────────────────────┘
```

### Toast Notifications

Confirmation toasts appear at the bottom of the screen, above the tab bar:

```
                    ┌──────────────────────────┐
                    │ ✓ Mileage updated         │
                    └──────────────────────────┘
──────────────────────────────────────────────────
  🏠Dash  📋Hist  🔧Track  📝Note  ⚙️
```

- Auto-dismiss after 3 seconds
- Slide up animation
- Green check for success, red for errors

### Delete Confirmation

All deletes use a confirmation dialog:

```
┌──────────────────────────────────────┐
│                                      │
│  Delete this record?                 │
│                                      │
│  This action cannot be undone.       │
│                                      │
│  [ Cancel ]     [ Delete ] (red)     │
│                                      │
└──────────────────────────────────────┘
```

---

## 6. Resolved Design Decisions

| # | Question | Decision |
|---|----------|----------|
| 1 | Interval Tracker: OK and Ad-Hoc group visibility | **Collapsed by default.** Only Overdue and Due Soon expanded. Tap header to expand. |
| 2 | Dashboard cost card scope | **Overdue + Due Soon only.** More actionable, shows what's imminent. |
| 3 | Bottom nav tab count | **4 tabs.** Settings moved to top-bar gear icon. Tabs: Dashboard, History, Tracker, Notes. |
| 4 | Progress bars on interval items | **Yes.** Visual progress bar on each item showing position within service interval. Overflows past 100% for overdue items. |

## 7. Additional Resolved Decisions

| # | Question | Decision |
|---|----------|----------|
| 5 | Service History card density | **Max 3 line items** per card. Additional items shown as "and X more..." link. Tap card for full detail. |
| 6 | Desktop sidebar | **Always visible (persistent).** Navigation always accessible for fast screen switching. |
| 7 | Progress bar color behavior | **Color matches status.** Green fill for OK, amber for due-soon, red for overdue. Overdue bars visually overflow past the track endpoint with red fill. |

## 8. Ad-Hoc Scheduling

Ad-hoc items can optionally be **scheduled** with a target date and/or target mileage, turning them into tracked items with status and progress bars.

### How it works

| State | Behavior |
|-------|----------|
| **Unscheduled** (default) | Shows in Ad-Hoc group with "As Needed" label. No progress bar, no status color. Detail view has a **"Schedule Service"** button. |
| **Scheduled** | Shows target mileage/date, progress bar, and status (OK/Due Soon/Overdue). Badge changes from "Ad-Hoc" to "Scheduled" (purple). Still appears in the Ad-Hoc collapsed group. |
| **Serviced** | Resets to unscheduled state (one-time target, does not repeat like regular intervals). |

### Schedule Service flow

When the user taps "Schedule Service" on an unscheduled ad-hoc item:

```
┌──────────────────────────────────────┐
│                                      │
│  Schedule Service                    │
│  Serpentine Belt                     │
│                                      │
│  Target Mileage (optional)           │
│  [ 200,000              ]            │
│                                      │
│  Target Date (optional)              │
│  [ ____/__/____          📅 ]        │
│                                      │
│  Alert Threshold                     │
│  [ 1,000              ] miles before │
│                                      │
│  ─────────────────────────────────   │
│                                      │
│  [ Cancel ]        [ Schedule ]      │
│                                      │
└──────────────────────────────────────┘
```

- At least one of target mileage or target date is required
- If both are set, the item becomes due when **either** is reached (whichever comes first)
- The threshold defines when the item enters "Due Soon" status

### Data model addition

The existing `interval_items` table gains two optional fields:

| Column | Type | Description |
|--------|------|-------------|
| `target_date` | DATE | One-time target date (NULL for regular or unscheduled) |
| `target_miles` | INTEGER | One-time target mileage (NULL for regular or unscheduled) |

These work alongside the existing `recommended_interval_miles` / `next_service_miles` fields. Regular items use intervals; scheduled ad-hoc items use targets.

---

## 9. Layout Change Log

| Change | Rationale |
|--------|-----------|
| Quick actions moved to top of dashboard | Primary user action — should be immediately accessible, scrolls off naturally |
| Desktop row 1: Attention &#124; Oil Change &#124; Costs | Most actionable info first; 3-column layout uses desktop width |
| Vehicle card moved to row 2 right (desktop) / bottom (mobile) | Vehicle info is reference data, not an action trigger. De-prioritized but still visible |
| Ad-hoc scheduling added | Users need to plan one-time services (e.g., battery replacement at a target mileage) without creating a recurring interval |

All design questions resolved. Ready for implementation.
