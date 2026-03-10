

# Underground Fashion: Add Brands & Shops from PDF

## Tag Analysis

After examining the PDF, the brands span **punk**, **goth**, **rager** (dark hype streetwear), **gothic lolita**, **kawaii**, **latex/fetish**, and **dark luxury**. The two best umbrella terms that cover the vast majority are:

1. **`underground`** -- covers punk, goth, dark streetwear, alternative, fetish, occult, dark luxury (Rick Owens, Chrome Hearts, Ann Demeulemeester), and rager brands (Hellstar, Sp5der, Vlone, Warren Lotas, Revenge). This is the term used in the PDF title itself.

2. **`gothic`** -- covers Gothic Lolita, Elegant Gothic Aristocrat, dark romantic, visual kei, and classic goth brands. Many of the Japanese brands (Baby TSSB, Atelier Pierrot, Moi-même-Moitié, h.NAOTO, Angelic Pretty, Metamorphose, Putumayo, Innocent World) fit this more specifically.

These two new values will be added to the `category_type` enum in the database, making them available for filtering in the Index page, HOT style tags, and shop/brand management.

---

## Schema Change

Add two new values to the `category_type` enum:
```sql
ALTER TYPE public.category_type ADD VALUE 'underground';
ALTER TYPE public.category_type ADD VALUE 'gothic';
```

Also add `"underground"` and `"gothic"` to the `STYLE_TAG_OPTIONS` array in `StreetSpottedCreatePost.tsx` so users can tag HOT posts with these styles.

Update `BulkBrandImport.tsx` `VALID_CATEGORIES` to include the new values.

---

## Brands to INSERT (new only, 32 brands)

Skipping: Supreme, Rick Owens, Chrome Hearts, Pleasures, Undercover, Wasted Paris, Wasted Youth (already exist).

| Brand | Category | Country |
|-------|----------|---------|
| Vivienne Westwood | underground | United Kingdom |
| Dr. Martens | underground | United Kingdom |
| Killstar | gothic | United Kingdom |
| Disturbia | gothic | United Kingdom |
| Boy London | underground | United Kingdom |
| Cyberdog | underground | United Kingdom |
| Atsuko Kudo | underground | United Kingdom |
| Necessary Evil | gothic | United Kingdom |
| Attitude Clothing | gothic | United Kingdom |
| Ann Demeulemeester | underground | Belgium |
| Gallery Dept | underground | United States |
| Vlone | underground | United States |
| Hellstar | underground | United States |
| Sp5der | underground | United States |
| Warren Lotas | underground | United States |
| Revenge | underground | United States |
| Blackcraft Cult | gothic | United States |
| Strange Cvlt | gothic | United States |
| Kreepsville 666 | gothic | United States |
| Hysteric Glamour | underground | Japan |
| h.NAOTO | gothic | Japan |
| Sex Pot ReVeNGe | gothic | Japan |
| Baby, The Stars Shine Bright | gothic | Japan |
| Alice and the Pirates | gothic | Japan |
| Atelier Pierrot | gothic | Japan |
| Moi-même-Moitié | gothic | Japan |
| 6%DokiDoki | gothic | Japan |
| Candy Stripper | underground | Japan |
| Angelic Pretty | gothic | Japan |
| Metamorphose temps de fille | gothic | Japan |
| Putumayo | gothic | Japan |
| Innocent World | gothic | Japan |

---

## Shops to INSERT (new only, ~40 shops)

Skipping: DSM New York, GR8 Harajuku, Rokit Brick Lane, Beyond Retro (already exist). Will insert all others including flagship stores for new brands (Vivienne Westwood World's End, Dr. Martens Camden, etc.) and independent shops (Trash and Vaudeville, Pentagramme, Darkland Paris, etc.).

---

## Code Changes

| File | Change |
|------|--------|
| `src/components/StreetSpottedCreatePost.tsx` | Add `"underground"`, `"gothic"` to `STYLE_TAG_OPTIONS` |
| `src/components/BulkBrandImport.tsx` | Add `"underground"`, `"gothic"` to `VALID_CATEGORIES` |

---

## Execution Order

1. Database migration: add enum values
2. Database inserts: brands (32 rows)
3. Database inserts: shops (~40 rows)
4. Code changes: update tag/category arrays

