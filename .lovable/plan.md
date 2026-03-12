

# Plan: Graceful Location Denial + Settings Page

## Problem
When a user denies location permission, the app gets stuck on the map loading spinner. Additionally, there's no way for users to manage preferences like units or re-enable location later.

## Recommendation: Option B (Allow entry with degraded map)

Option A (blocking entry) would lose users permanently — many deny location reflexively or accidentally. Option B is the standard pattern used by Google Maps, Citymapper, and every major map app: the app works, but location-dependent features show a prompt to enable it.

---

## Part 1: Fix Location Denial Blocking the App

### Root Cause
In `Map.tsx` line 279-285, geolocation error is silently logged but the loading overlay (`isLoadingShops`) depends on shops rendering, which works independently. However, the `Directions.tsx` geolocation call (line 228-267) has no proper fallback either. The actual stuck spinner likely comes from a timing issue where `hasInitializedLocation` never gets set to `true` when geolocation is denied, combined with possible map initialization delays.

### Changes

**`src/components/Map.tsx`**
- In the geolocation error handler (around line 282), set `hasInitializedLocation.current = true` so the map proceeds without user location
- Add a `locationDenied` state that gets set on geolocation error code `PERMISSION_DENIED`
- Add a safety timeout (e.g. 8 seconds) that forces `setIsLoadingShops(false)` and `setShowFullOverlay(false)` if they haven't been cleared — prevents infinite spinner regardless of cause
- Pass `locationDenied` status up via `onUserLocationChange(null)` callback

**`src/pages/Directions.tsx`**
- In the geolocation error handler (line 240-258), add handling for `error.code === 1` (PERMISSION_DENIED): set a `locationDenied` state
- When `locationDenied` is true and user taps NEARBY or ROUTE tabs, show an overlay card: "Enable location access to use the map. You can change this in your browser settings." with a "Try Again" button that re-requests `navigator.geolocation`
- The map still renders (centered on London or shop centroid) — just without the blue user dot and without distance sorting

**`src/components/MapLoadingOverlay.tsx`**
- No changes needed — it already respects `isLoading` prop

---

## Part 2: Settings Page

### New file: `src/pages/Settings.tsx`

A clean settings page accessible from the More menu, containing:

1. **Location Access** — Toggle (read-only display of current permission status via `navigator.permissions.query`). "Try Again" button if denied, which calls `navigator.geolocation.getCurrentPosition` to re-trigger the browser prompt
2. **Distance Units** — Toggle between Metric (km) and Imperial (miles). Stored in `localStorage` key `flyaf_distance_unit`. Default: `metric`
3. **Language** — Already exists as LanguageSwitcher, embed it here too for discoverability

Currency is not recommended — the app doesn't display prices, so it would be a dead toggle with no function.

### Integration
- Add Settings route in `App.tsx`: `<Route path="/settings" element={<Settings />} />`
- Add Settings menu item in `More.tsx` with a `Settings` (gear) icon
- Update `Directions.tsx` distance display to read `localStorage` unit preference and convert km ↔ miles accordingly
- Update `ShopsBottomSheet.tsx` and any other distance displays

### localStorage keys
- `flyaf_distance_unit`: `"metric"` | `"imperial"` (default: `"metric"`)
- `flyaf_location_denied`: `"true"` | removed (tracks if user explicitly denied)

---

## Summary of files to create/edit

| File | Action |
|------|--------|
| `src/components/Map.tsx` | Add geolocation denial handling, safety timeout |
| `src/pages/Directions.tsx` | Add location-denied state, show prompt card |
| `src/pages/Settings.tsx` | **Create** — Location, Units, Language settings |
| `src/pages/More.tsx` | Add Settings link |
| `src/App.tsx` | Add `/settings` route |
| `src/i18n/locales/en.json` | Add settings translation keys |

