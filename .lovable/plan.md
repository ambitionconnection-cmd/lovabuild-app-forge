# Caribbean / West Indies expansion — Guadeloupe (phase 1)

Add a parallel "West Indies" surface to FLYAF that hosts Caribbean shops without polluting the streetwear-first mainstream feed. Start with Guadeloupe, then repeat for Martinique, St. Lucia, Dominica.

## Scope of this plan

Only Guadeloupe in this iteration. Same pattern will be reused for the other 3 islands.

## Data model

No schema changes needed.

- `country = 'Guadeloupe'` (own entry, separate from France).
- `city = 'Guadeloupe'` (island-level), per your choice.
- Two-tier classification done via existing fields:
  - **Streetwear-leaning shops** → surfaced everywhere (Map, Brands, Hot, search) like any other FLYAF shop. Linked to a `brands` row when they carry FLYAF-tracked brands; otherwise `is_unique_shop = true` with their own brand row.
  - **Generic local boutiques** (dress, lingerie, plus-size, etc.) → inserted with `category = 'multi_brand'` (or closest existing enum) and a marker that hides them from the mainstream lists. Implementation: a new boolean column would be ideal but to avoid schema change we tag them by `country IN ('Guadeloupe','Martinique','Saint Lucia','Dominica')` AND not linked to a streetwear brand → the West Indies view is a country-filtered slice.

If after review we want a clean toggle, we can add `is_west_indies boolean default false` later. For now country filter is sufficient.

## New "West Indies" surface

- Route: `/west-indies` (and `/west-indies/guadeloupe`, `/martinique`, `/saint-lucia`, `/dominica`).
- Entry points:
  - Subtle CTA card on home page footer area ("Traveling the Caribbean? Open West Indies →").
  - Item in main nav under a new "Explore" group, visually distinct (palm/island icon, warm gradient) so users understand it's a sister tool.
- Page layout per island:
  - Island hero (flag, short intro, tourist-oriented copy in EN/FR).
  - Map (reuses existing Map component, filtered by `country = 'Guadeloupe'`).
  - Shop list with category chips (Streetwear, Boutiques, Beachwear, Accessories, Jewellery, Shoes, Kids).
  - Language toggle hint (EN/FR already supported).
- Mainstream `/map`, `/brands`, `/hot` exclude `country IN (caribbean countries)` UNLESS the shop is linked to a streetwear-tracked brand (so e.g. a Guadeloupean store carrying Stüssy or Carhartt WIP still shows up in the global brand pages).

## CityChip / country / flag updates

- Add 🇬🇵 to `src/lib/countryFlags.ts`.
- Add Guadeloupe to `src/components/CityChip.tsx` city list (label "Guadeloupe", country "Guadeloupe").
- Update `public/brands-list.csv` and `public/shops-by-brand.csv` with the new entries.

## Shop ingestion (Guadeloupe)

Source: your Google Maps PDF export (Pointe-à-Pitre fashion shops).

Workflow per shop:

1. **Research**: web + IG search for official site / IG handle. If neither found → still insert with address-only.
2. **Logo acquisition** (your chosen IG → site → manual fallback):
   - Try IG profile pic via an edge function using IG's public oEmbed / opengraph (most public profiles expose og:image). Save to `brand-images` bucket.
   - If IG blocks/no handle → fetch official site `/favicon.ico` (256+) or `og:image`.
   - If both fail → leave `logo_url` null and add a row to a small `caribbean_logo_todo` note in the plan output (markdown summary in chat) for you to upload manually.
3. **Geocoding**: Google Maps Geocoding API (already have `GOOGLE_MAPS_API_KEY`) to get meter-level lat/lng (8+ decimals per geo-precision rule).
4. **Brand row**: one `brands` entry per unique shop name (since these are mostly single-location indie boutiques).
5. **Shop row**: `country='Guadeloupe'`, `city='Guadeloupe'`, full address, IG, website, phone, opening hours from the Maps export.

### Streetwear-leaning shortlist (visible in main FLYAF feed)

Inserted with `brand_tier='new_wave'` and surfaced globally:

- **Cubstreetwear** — Résidence Hincelin Porte 22 — clear streetwear identity.
- **The Factory Gwadloup** — streetwear/local label.
- **Mby.Fashion** — Centre St John Perse — modern fashion.
- **Ochun Fashion Design** — Centre St John Perse — designer streetwear.
- **JOKO** — 116 Rue Frébault — modern menswear.
- **Glamour Boutique / Glamour Brissac** — review during research; keep only if streetwear.
- Any others discovered during research that match (e.g. dedicated sneaker shops if found).

### Caribbean-only boutiques (West Indies surface only)

The remaining ~70 entries from the Maps export (Mirabelle, Pomme Boutique, Helena, Nancy Boutique, Topaze, Filles du soleil, Melocotton, KOB Boutique, Nana Pampa, INTIME SEDUCTION, La Merveille, etc.) inserted with appropriate sub-category (Ladies, Mens, Kids, Lingerie, Shoes, Jewellery, PlusSize, Workwear, Swimwear).

## Edge function: `caribbean-logo-fetcher`

New small edge function to:
- Accept `{ instagram_handle?, website? }`.
- Try IG og:image (public scrape via fetch with browser UA).
- Fallback to website og:image / favicon.
- Upload to `brand-images` bucket → return public URL.

Called once per shop during ingestion (server-side script, not at runtime).

## Implementation order

```text
1. Schema-light prep
   - Add 🇬🇵 flag + Guadeloupe to CityChip and countryFlags
   - Update brands-list.csv / shops-by-brand.csv

2. Edge function
   - Create caribbean-logo-fetcher (IG → site → null)

3. Routing + UI
   - Create /west-indies index page (4 island cards)
   - Create /west-indies/guadeloupe page (hero + map + filtered shop list)
   - Add nav entry + home CTA
   - Filter mainstream Map/Brands/Hot to exclude Caribbean-only shops

4. Data ingestion (Guadeloupe)
   - Research script: for each shop in OCR list → enrich (IG, site, geocode, logo)
   - Generate insert SQL for brands + shops
   - Apply via supabase migration / insert tool
   - QA: coords precision, no duplicate slugs, foreign keys, flag rendering

5. Memory
   - Save mem://features/west-indies-section describing the parallel surface
   - Save mem://config/supported-countries adding Guadeloupe (+ others as added)
```

## Out of scope for this iteration

- Martinique, St. Lucia, Dominica (separate runs once you send their PDFs).
- Tourist-specific features (transport, beaches, restaurants) — shops only for now.
- Translations of new West Indies copy beyond EN/FR (already supported).

## Confirmation needed before I build

1. Route name `/west-indies` OK, or prefer `/caribbean`?
2. Should the streetwear shortlist (Cubstreetwear etc.) appear in BOTH the West Indies page AND the global FLYAF feed, or only in West Indies even if streetwear?
3. OK to add `is_west_indies boolean` to `shops` for a clean filter (small migration), instead of relying on country list? Recommended.
