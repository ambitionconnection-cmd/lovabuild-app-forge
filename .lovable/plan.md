

# Post-Beta Improvements: 4 Items

## 1. Add Coordinates to Shops Detailed CSV Export

**What**: Add `Latitude` and `Longitude` columns to the detailed shops CSV export so you can cross-check pin accuracy against addresses.

**How**: In `src/lib/csvExport.ts`, update the `exportShopsCSV` function:
- Add `latitude, longitude` to the Supabase select query (line 114)
- Add `latitude` and `longitude` fields to the `ShopExport` interface
- Add two new CSV columns after "Address": `Latitude`, `Longitude`
- Update `DataExports.tsx` column list to mention coordinates

---

## 2. Smart Map Loading Strategy for Scale

Currently `Map.tsx` starts with `isLoadingShops = true` on every mount, showing the full overlay even on repeat visits. With 2000+ shops this will get slow.

**Strategy — two changes**:

### A. First-visit-only full overlay
- Track whether shops have loaded at least once this session using a `sessionStorage` flag or a module-level variable
- On first load: show the full "Loading map... Placing N shops" overlay
- On subsequent navigations back to map: show only a small spinner in the corner (not a full blocking overlay), or skip the overlay entirely since data is cached by React Query

### B. Progressive / viewport-priority loading (future-proof)
- Keep using React Query with `staleTime: 30min` (already effectively cached)
- The map already uses GeoJSON source which Mapbox renders efficiently via WebGL — 2000 pins is well within Mapbox's capabilities (it handles 50k+ points natively)
- The real bottleneck is the logo marker DOM elements. Current code creates individual DOM markers per shop. For scale:
  - Keep logo markers only for shops visible at current zoom (already partially done)
  - Use symbol layers with sprite sheets instead of DOM markers for the default view

**Implementation for now** (keeps it simple):
- Add a module-level `let hasLoadedOnce = false` flag in `Map.tsx`
- After first successful load, set it to `true`
- On subsequent mounts, skip the full-screen overlay — show a subtle corner spinner instead
- Update `MapLoadingOverlay` to accept a `minimal` prop for the compact version

---

## 3. Translate Route Bottom Sheet

The `RouteBottomSheet.tsx` has ~15 hardcoded English strings: "Route", "Save", "Print", "Share", "No stops yet", "Start Navigation", "Clear Route", "Your Location", "Distance", "Walking", "Stops", etc.

**How**:
- Add a `route` section to all 7 locale files with keys for each string
- Import `useTranslation` in `RouteBottomSheet.tsx` and `RouteSidePanel.tsx`
- Replace all hardcoded strings with `t('route.xxx')` calls

New i18n keys needed:
```
route.title, route.save, route.print, route.share,
route.noStops, route.noStopsHint, route.startNavigation,
route.clearRoute, route.yourLocation, route.distance,
route.walking, route.stops
```

---

## 4. Beta Backup & Version Safety

This is not a code change — it is guidance for you:

- **Reverting**: Lovable has built-in version history. Every AI message creates a restore point. You can revert to any previous state by clicking the revert button below any message, or via the History tab.
- **GitHub backup**: If you connect to GitHub (Settings > GitHub), every change auto-pushes. You can tag the current commit as `v1.0-beta` in GitHub for a permanent reference point.
- **What to download/save**:
  - The GitHub repo itself (clone it locally) — this contains all source code
  - Your backend secrets list (already documented in your project): `STRIPE_SECRET_KEY`, `RESEND_API_KEY`, `MAPBOX_PUBLIC_TOKEN`, etc.
  - The `FLYAF_BETA_REPORT.md` document (already in `public/`)
  - A database export via the backend viewer (your shops, brands, users data)

No code changes needed for this item — I will provide the History view action after implementation.

---

## Files Modified

| File | Change |
|------|--------|
| `src/lib/csvExport.ts` | Add lat/lng to shops export query + CSV columns |
| `src/components/DataExports.tsx` | Update column description |
| `src/components/Map.tsx` | Add `hasLoadedOnce` flag, skip full overlay on re-visits |
| `src/components/MapLoadingOverlay.tsx` | Add `minimal` prop for compact spinner |
| `src/components/RouteBottomSheet.tsx` | Replace hardcoded strings with i18n |
| `src/components/RouteSidePanel.tsx` | Replace hardcoded strings with i18n |
| `src/i18n/locales/*.json` (7 files) | Add `route.*` translation keys |

