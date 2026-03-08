Context
The Vehicle Service Tracker needs a major functional redesign per docs/Major_Updates_Phase5.md. Before writing any app code, we'll create an interactive HTML mockup (docs/mockup-v2.html) to validate the new UX. The mockup builds on the v1 mockup architecture at docs/old_artifacts/mockup.html.
Key Design Decisions (Confirmed)

Notes → History: Hybrid approach — notes appear as cards in timeline AND inside linked service detail views
Oil Change Card → Top 3 Upcoming: Dashboard shows 3 nearest-due interval items
Multi-service costs: Optional per-service costs with auto-calculated total, or manual single total
Shops + Google Places: API search to auto-fill shop details
Detail view: Full-screen modal overlay (not page navigation)
Navigation: Dashboard, History, Tracker, Shops (Notes removed, Shops added)
Note-Service linking: Bi-directional (link from either direction)
Facility → Shop: Rename throughout

Output File
docs/mockup-v2.html — Single self-contained HTML file with embedded CSS + JS
Architecture

Reuse v1 mockup shell pattern: CSS vars, switchScreen(), overlays, card system
Lucide CDN (unpkg.com/lucide@latest) for icons instead of inline SVGs (saves hundreds of lines)
Same design tokens from frontend/src/index.css (dark theme, colors, radii, fonts)
~3,500-4,000 lines estimated

Views to Build (7 total)

1. Dashboard

QuickActions: Single "Add Service Record" button (remove Observation)
Top 3 Upcoming card (replaces Oil Change card):

3 nearest-due items with status dot, service name, category, miles remaining, mini progress bar
Sample: Transmission Fluid (overdue), Oil & Filter Change (due soon), Brake Pads (due soon)

Keep: Attention Card, Cost Summary, Mileage Stats, Vehicle Hero

2. History (Major Overhaul)

Filter bar: 3 dropdowns (Services, Categories, Shops) + Search toggle + Add dropdown

Add dropdown uses onclick toggle (not hover — fixes mobile click issue)
Add options: "Service Record" and "Note"

Unified timeline: Service record cards + Note cards mixed chronologically

Service cards: icon, service name(s), date/miles, shop, cost, link indicator, chevron
Single service → show name; Multiple → "4 Services" + first 2-3 listed below
Note cards: smaller, left accent border, note text, date/miles, resolved status
Linked notes show a chain-link badge + "Linked to Service Record"

Sample data: 10+ entries across 4 months mixing services and notes
Data-attribute filtering: Cards get data-category, data-service, data-shop, data-type

3. History Detail (Full-Screen Modal)

backdrop-filter: blur(8px), max-width 600px on desktop, full-width mobile
Sections:

Header: date, odometer, shop (with address)
Services Performed: Line items with service name, category badge, individual cost
Cost Summary: Subtotal + shop fee + tax + total
Linked Notes: Cards for bidirectionally-linked notes
Record Notes: Service record's own notes field
Attachments: Placeholder section

4. Tracker

Group toggle: "By Status" (default) / "By Category" buttons
By Status: Overdue → Due Soon → OK → Ad-Hoc sections (collapsible)
By Category: Brake System, Drivetrain, etc. sections
Cards show: service name, category badge, type badge, cost, last/next service, progress bar
Uses real service names from docs/Caterogies_and_Services.md
Sample: 10 items across statuses

5. Shops (NEW Page)

Search bar + "Add Shop" button
Shop cards (2-col desktop): name, address, phone, website, hours, service record count
Sample: 4 shops (Bass Auto Care, Take 5 Oil Change, Discount Tire, DIY)
Add Shop Modal with fake Google Places search:

Search input with debounced fake results (3-4 hardcoded)
Selecting a result auto-fills form (name, address, phone, website, hours)
"Or enter manually" link shows blank form
Save/Cancel buttons

6. Add Service Record Modal

Date, Odometer, Shop (autocomplete from saved shops)
Services Performed section (dynamic rows):

Category dropdown → populates Service dropdown (cascading from CATEGORIES data)
Optional cost input per service
"+ Add Another Service" button, remove (X) per row

Cost Summary: Auto-calculates from per-service costs + shop fee + tax
Notes textarea
Link Existing Notes: Dropdown of unresolved notes, selected shown as chips
Save/Cancel

7. Add Note Modal (Small)

Date, Odometer, Note textarea
Optional "Link to Service Record" dropdown
Save/Cancel

JavaScript Data & Interactions
Data Structures

CATEGORIES object: 15 categories → 51 services (from docs/Caterogies_and_Services.md)
SHOPS array: 4 sample shops
HISTORY_DATA array: 10+ entries with mixed types
TRACKER_DATA array: 10 interval items

Key Interactions

Screen switching: switchScreen(id) — same as v1
Add dropdown (History): Click-toggle with outside-click close
Cascading selects: Category change rebuilds service options
Dynamic service rows: Add/remove with counter-based IDs
Cost auto-calc: Sum per-service costs + shop fee + tax on input change
Fake Places search: Debounced keyup shows hardcoded results
Data-attribute filtering: History cards filtered by dropdown values
Tracker group toggle: Switch between status/category grouping views
Section collapse: Chevron toggle on section headers
Modal management: Open/close with body scroll lock, Escape key, backdrop click

Google Places API Notes (for future implementation)
Cost Estimate

Place Search (Text): $0.032/request
Place Details: $0.017/request
~10 shops every 4-6 months = ~20 API calls = ~$0.98/year (well within free tier)
Google provides $200/month free credit — this usage is negligible

API Key Setup

Go to Google Cloud Console → Create project
Enable "Places API (New)"
Create API key → Restrict to Places API + HTTP referrer restriction
Store key in .env as GOOGLE_PLACES_API_KEY
Backend proxies requests to avoid exposing key in frontend

Testing Strategy

Use mock data during development (no API calls)
Create a /api/v1/shops/search backend endpoint that proxies to Google
Rate-limit the endpoint (max 5 requests/minute) to prevent runaway costs
Add a test mode flag that returns hardcoded results

Verification

Open docs/mockup-v2.html in browser
Verify all 4 nav tabs switch screens correctly (Dashboard, History, Tracker, Shops)
Test History filters (all 3 dropdowns filter cards)
Test Add dropdown on History page works on click (not just hover)
Open History detail modal — verify full-screen overlay with services, costs, linked notes
Open Add Service Record modal — test cascading category/service selects and dynamic row add/remove
Open Add Note modal from History page
Test Shops page — cards display, Add Shop modal with fake search
Test Tracker group toggle (By Status / By Category)
Test responsive: resize browser to verify mobile tabbar vs desktop sidebar
Test Escape key and backdrop click close all modals
