

## Coordinate Precision Fix — 146 Shops

### Current State
- **260 shops** have genuine 7-8 digit precision (accurate to ~1m)
- **146 shops** have only 5 significant digits padded with trailing zeros (accurate to ~110m) — enough to land on the wrong side of a street or the wrong building entirely
- Examples: `51.50843000` (5 real digits) vs `51.51276110` (8 real digits)

### Root Cause
The previous Mapbox batch geocode returned lower-precision results for some addresses (especially in Asia and for market/mall locations). The trailing zeros masked this.

### Plan — Use Existing Mapbox API (No New Keys Needed)

**Step 1: Create a batch re-geocode edge function**
- New edge function `batch-precision-geocode` that:
  - Queries only the 146 shops with padded coordinates (trailing `000`)
  - For each, calls Mapbox Geocoding API with a more specific query string (including street number + city + country)
  - Only updates if the new result has more significant digits than the current value
  - Adds a 200ms delay between calls to respect rate limits
  - Returns a report of what changed vs what stayed the same

**Step 2: Run it and generate an audit report**
- Execute the function, capture results
- Generate a CSV/markdown report showing before/after coordinates for review
- Flag any shops where Mapbox still returns low precision (these would need manual correction from Google Maps)

**Step 3: Manual fallback for stubborn cases**
- For shops Mapbox can't resolve precisely (markets, malls, small shops), the admin UI already accepts 8+ digit coordinates — those can be entered manually from Google Maps

### Cost & Risk
- **Cost**: Zero. Mapbox free tier includes 100,000 geocode requests/month. We need 146.
- **Risk**: Low. We only overwrite if the new coordinate has higher precision. Original values preserved in the audit report.

No database schema changes. No new API keys. No UI changes needed (the text input fix from earlier already supports full precision entry).

