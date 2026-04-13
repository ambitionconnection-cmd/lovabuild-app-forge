

## Plan: Comprehensive Visitor & Usage Analytics System

This is a large feature spanning database tables, a tracking library, instrumentation across all pages, a full analytics dashboard component, PDF export, and cleanup of Drops references from the admin UI.

### Database Changes

Create 3 new tables via migration:

**`visitor_sessions`** — tracks anonymous/authenticated sessions
- `id` (uuid, PK), `session_id` (text, unique), `first_seen` (timestamptz), `last_seen` (timestamptz), `page_count` (int, default 0), `device_type` (text), `browser` (text), `country` (text), `referrer` (text), `user_id` (uuid, nullable), `is_authenticated` (boolean, default false)
- RLS: anon/authenticated can INSERT and UPDATE (upsert pattern); admins can SELECT all

**`page_views`** — every page/tab navigation
- `id` (uuid, PK), `session_id` (text), `page_name` (text), `viewed_at` (timestamptz, default now()), `is_authenticated` (boolean), `user_id` (uuid, nullable)
- RLS: anon/authenticated can INSERT; admins can SELECT all

**`app_events`** — conversion funnel events
- `id` (uuid, PK), `session_id` (text), `event_name` (text), `created_at` (timestamptz, default now()), `is_authenticated` (boolean), `user_id` (uuid, nullable), `metadata` (jsonb, default '{}')
- RLS: anon/authenticated can INSERT; admins can SELECT all

All writes are open to anon+authenticated for INSERT only (lightweight fire-and-forget from the client). Only admins can read.

### New Files

| # | File | Purpose |
|---|------|---------|
| 1 | `src/lib/analytics.ts` | Core tracking library — generates/stores session ID in localStorage, detects device/browser/country from timezone, provides `trackPageView()`, `trackEvent()`, `updateSession()` functions. All calls are non-blocking async with silent error handling. |
| 2 | `src/hooks/usePageTracking.ts` | React hook that calls `trackPageView()` on mount with the current page name. Used in every page component. |
| 3 | `src/components/VisitorAnalyticsDashboard.tsx` | Full admin analytics dashboard component with: overview cards, traffic sources bar chart, page popularity bar chart, conversion funnel visualization, geography table, device split pie chart, retention chart, date range picker (today/7d/30d/custom), auto-refresh every 5 min, and PDF export button. |

### Modified Files

| # | File | Change |
|---|------|--------|
| 4 | `src/pages/Directions.tsx` | Add `usePageTracking('nearby')` + `trackEvent('map_loaded')` after map init |
| 5 | `src/pages/GlobalIndex.tsx` | Add `usePageTracking('index')` + `trackEvent('index_opened')` |
| 6 | `src/pages/Feed.tsx` | Add `usePageTracking('hot')` + `trackEvent('hot_opened')` |
| 7 | `src/pages/BrandDetail.tsx` | Add `usePageTracking('brand')` + `trackEvent('brand_viewed')` |
| 8 | `src/pages/More.tsx` | Add `usePageTracking('more')` |
| 9 | `src/pages/RoutePage.tsx` | Add `usePageTracking('route')` |
| 10 | `src/pages/Collections.tsx` | Add `usePageTracking('collections')` |
| 11 | `src/pages/Auth.tsx` | Track `signup_started`, `signup_completed`, `login_completed` events |
| 12 | `src/components/Map.tsx` | Track `pin_tapped` event on marker click |
| 13 | `src/components/ShopDetailBottomSheet.tsx` or `ShopDetailsModal.tsx` | Track `shop_viewed` event |
| 14 | `src/App.tsx` | Initialize analytics session on app mount (`trackEvent('app_opened')`) |
| 15 | `src/components/AdminSidebar.tsx` | Add "Visitor Analytics" item under Data group; remove or relabel Drops-related items if present |
| 16 | `src/pages/Admin.tsx` | Import and render `VisitorAnalyticsDashboard` for the new tab; remove Drops analytics references from the dashboard header stats |
| 17 | `src/components/UserAnalytics.tsx` | Remove the entire "Affiliate Analytics" section that references Drops (the drop-specific charts, tables, pie chart). Keep user growth metrics. |
| 18 | `src/components/AdminStatsCards.tsx` | Remove "Upcoming Drops" card |

### PDF Export

Use `jsPDF` + `jspdf-autotable` (client-side). The export button captures the currently visible analytics data (respecting date filter), renders: FLYAF logo, date range header, overview metrics, traffic sources, page popularity, funnel with drop-off %, geography table, device split. No server processing needed.

### Drops Cleanup (Frontend Only)

- Remove Drops-related analytics sections from `UserAnalytics.tsx` (affiliate charts/tables)
- Remove "Upcoming Drops" stat card from `AdminStatsCards.tsx`
- Keep Drops management pages (content CRUD) intact — only analytics UI references are removed
- Keep all database tables and edge functions untouched

### Performance Guarantees

- All tracking calls use fire-and-forget pattern: `supabase.from(...).insert(...).then(() => {}).catch(() => {})` — never awaited in the render path
- Session ID generated once and cached in localStorage
- No additional network requests on page load beyond the single insert
- Dashboard queries only run in the admin panel, never for regular users

### Technical Details

- Device detection: `navigator.userAgent` parsed for mobile/desktop + browser name
- Country detection: `Intl.DateTimeFormat().resolvedOptions().timeZone` mapped to country
- Session upsert: uses Supabase upsert on `session_id` to update `last_seen` and `page_count`
- Funnel visualization: sequential bars showing count at each step with percentage drop-off labels between steps
- Auto-refresh: `setInterval` every 5 minutes re-fetches dashboard data

