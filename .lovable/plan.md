
# Expand FLYAF to Africa

## Current State
- **3 African brands** in DB: KituKali (Kenya), Unlimited Legacy (Nigeria), Baye Fall Spirit (Senegal)
- **1 African shop**: KituKali Nairobi
- **Zero African cities** in CityChip selector
- Missing many African countries from the flags/dropdown lists

---

## Phase 1 -- Research African Streetwear Brands (AI web search)

Use multiple web searches to compile 30-50 streetwear, contemporary, and designer brands across:
- **West Africa**: Nigeria, Ghana, Senegal, Ivory Coast, Cameroon
- **East Africa**: Kenya, Tanzania, Uganda, Rwanda, Ethiopia
- **Southern Africa**: South Africa, Zimbabwe, Botswana, Namibia

For each brand: name, country, Instagram URL, official website, category, short description.

## Phase 2 -- Research African Retail Locations (AI web search)

Search for physical streetwear/fashion retail stores, concept shops, and multi-brand retailers in:
- Lagos, Abuja (Nigeria)
- Accra (Ghana)
- Nairobi (Kenya)
- Johannesburg, Cape Town (South Africa)
- Dakar (Senegal)
- Kigali (Rwanda)
- Dar es Salaam (Tanzania)
- Addis Ababa (Ethiopia)
- Casablanca (Morocco)
- Abidjan (Ivory Coast)

For each shop: name, address, city, country, coordinates (8+ decimal places), brand associations, Instagram, website.

## Phase 3 -- Database Inserts (automated)

I will insert all discovered brands and shops directly into the database using the insert tool:
- New brands into `brands` table (with slug, country, category, links, `is_active: true`, `brand_tier: 'new_wave'`)
- New shops into `shops` table (with precise coordinates, city, country, brand linkages where applicable)
- No manual work required from you

## Phase 4 -- Update Country and City Infrastructure (code changes)

1. **CityChip selector** (`src/components/CityChip.tsx`): Add Lagos, Nairobi, Johannesburg, Cape Town, Accra, Dakar with correct coordinates and zoom levels.

2. **Country flags** (`src/lib/countryFlags.ts`): Add missing African countries (Rwanda, Tanzania, Uganda, Cameroon, Ivory Coast, Ethiopia, Zimbabwe, Botswana, Mozambique, Namibia, Togo, Benin, Burkina Faso, DR Congo, Angola, Mauritius, Madagascar).

3. **Country dropdown** in the same file: Add all new countries to `getCountryList()`.

4. **CSV reference files**: Append new entries to `public/brands-list.csv`, `public/shops-by-brand.csv`, `public/brands-list-full.csv`.

5. **Memory**: Update international city support memory to include African hubs.

## Phase 5 -- QA

Verify new shops appear on the map at correct locations. Confirm new cities work in CityChip. Spot-check brand pages load correctly.

---

### Technical Details

- Coordinates use 8+ decimal places per project standards
- Emerging African brands get `brand_tier: 'new_wave'`
- Brand-owned stores get `is_unique_shop: true`; multi-brand retailers get `false`
- Research uses `websearch--web_search` calls batched by region
- Database inserts use the Supabase insert tool (not migrations)
- Estimated scope: 30-50 new brands, 40-60 new shops across 10+ cities
