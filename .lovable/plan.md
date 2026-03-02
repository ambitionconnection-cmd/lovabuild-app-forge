

# Roadmap to Completion

Based on your two strategy documents, what's already built, and the removal of the Drops section, here is the consolidated list of remaining work organized by priority.

---

## Already Done (No Action Needed)

- Map with pins, geolocation, navigation, city selector
- Brand directory (Global Index) with 1000+ brands
- Brand detail pages with shops, favorites, social links
- Route builder with drag-and-drop reordering
- Save route (to database for logged-in users, localStorage for guests)
- PDF export with branded header/footer
- Share route (native share + clipboard fallback)
- Contact page with New Brand / New Release submission forms
- Admin dashboard with brand, shop, drop management
- Hot page (Street Spotted) with masonry grid, moderation, style tags, filters
- User auth, profiles, favorites, notifications
- PWA configuration
- i18n (7 languages)
- Security: RLS, login rate limiting, audit logs

---

## What Still Needs to Be Done

### Priority 1: Route Sharing (Shareable Links)
**Problem you raised**: When you share a route, the recipient can't open it and follow the path from their own location.

- Create a `shared_routes` table with a unique short code (e.g., `heardrop.app/route/abc123`)
- Add a new route `/route/:code` that loads the shared route's stops
- The recipient sees the stops on the map starting from **their** location
- Update `shareRoute()` in `routeActions.ts` to generate a shareable link instead of just text
- No auth required to view a shared route

### Priority 2: Discovery Features
From your strategic plan, Section 4:

1. **"Brand of the Week"** on the map homepage
   - Add a `featured_brand_id` field or a small `featured_brands` table with date ranges
   - Show a dismissible card/banner on the Directions page highlighting the featured brand
   - Admin can set the featured brand from the dashboard

2. **"Similar To..." recommendations** on brand detail pages
   - Tag-based matching using existing `category` field
   - Show 4-6 related brands at the bottom of `BrandDetail.tsx`
   - No ML needed — simple category + country matching

3. **Curated Collections** (5 to start)
   - New `collections` table: `id`, `title`, `slug`, `description`, `brand_ids` (uuid[]), `is_active`
   - New `/collections` page or section within Global Index
   - Examples: "Japanese Streetwear", "London Underground Labels", "Heritage Brands"
   - Admin can create/edit collections from dashboard

### Priority 3: "Suggest an Edit" on Brand Pages
- Add a button on `BrandDetail.tsx` that opens a lightweight form
- Submits to `contact_submissions` with `inquiry_type = 'correction'` and the brand ID
- Already partially supported by the Contact page — just needs a shortcut from brand pages

### Priority 4: MyHeardrop Cleanup
- The "Reminders" tab still references Drops (`/drops` route, drop reminders). Since Drops is removed:
  - Either repurpose the tab for saved routes display
  - Or remove the Reminders tab and replace with a **"My Routes"** tab showing saved routes with load/delete actions
- The "Recommendations" tab references drops — update to only recommend brands

### Priority 5: Brand Detail — "Shop Online" CTA
- The `affiliate_url` column already exists on `brands`
- Add a prominent "Shop Online" button on `BrandDetail.tsx` when `affiliate_url` is set
- Track clicks for analytics (reuse `affiliate_analytics` table)

### Priority 6: Deployment Polish
From your short roadmap:

1. **Final PWA verification** — test install on Android/iOS
2. **Service worker** — verify offline capability with `vite-plugin-pwa`
3. **Full walkthrough** on phone — every page, every flow
4. **App name change** — you mentioned HEARDROP will be renamed. When ready:
   - Update all references in code, translations, PDF export, PWA manifest
   - Upload new logo to replace current branding

### Priority 7: Marketing Assets (Post-Deploy)
1. 5 screenshot mockups for social media
2. QR code linking to the app
3. One-page pitch document

---

## Items from Strategic Plan NOT Needed / Deferred

| Item | Status |
|------|--------|
| Drops/Release Calendar | **Removed** — replaced by Hot page |
| Brand Radar (news aggregator) | **Removed** — no third-party dependency |
| Premium user tier | **Deferred** — needs 5,000+ users first |
| City-level sponsorships | **Deferred** — needs multi-city scale |
| Display advertising | **Never** (per your strategic plan) |
| Brand Analytics Dashboard (selling data to brands) | **Deferred** — Year 2 |
| Push notifications for drops | **Removed** with Drops section |

---

## Suggested Implementation Order

```text
Step 1  →  Route sharing (shareable links)
Step 2  →  MyHeardrop cleanup (remove drop references, add My Routes)
Step 3  →  Brand detail: Shop Online CTA + Suggest an Edit
Step 4  →  Similar To... recommendations
Step 5  →  Brand of the Week
Step 6  →  Curated Collections
Step 7  →  Deployment polish + PWA verification
Step 8  →  Name/logo change (when designer delivers)
Step 9  →  Marketing assets
Step 10 →  User testing + feedback fixes
```

Each step is self-contained and deployable. Steps 1-3 are the highest impact for the least effort. Steps 4-6 add discovery and retention. Steps 7-10 are launch prep.

Ready to start with Step 1 (shareable route links) when you give the go-ahead.

