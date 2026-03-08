

# AI-Powered Outfit Detection for HOT Section — Analysis & Plan

## Cost & Feasibility Analysis

### How it works
Lovable AI (powered by Gemini) is already available in your project — no third-party API key needed. Gemini 2.5 Flash excels at image-text tasks and is the cheapest multimodal option.

### Cost estimates (Gemini 2.5 Flash via Lovable AI)
- **Per image analysis**: ~$0.001–0.003 (one image + structured prompt)
- **100 photos/month**: ~$0.10–0.30/month
- **1,000 photos/month**: ~$1–3/month
- **10,000 photos/month**: ~$10–30/month

**Verdict: At these prices, automatic detection on ALL uploads is completely viable** — even at 1,000+ photos/month, the cost is negligible. There is no reason to limit it to admin-selected photos only.

### Recommendation
**Run AI detection automatically on every photo submission**, then present results to the admin in the moderation queue for review before approval. This gives you the best of both worlds: zero manual effort + admin oversight.

---

## UI Recommendation: Option 2 (Inline Collapsible)

Option 2 is better because:
- No extra navigation step — users stay in context
- Higher conversion rate (fewer clicks to buy)
- Works naturally on mobile (accordion/expandable section)
- The "Shop the Look" section already exists — we just enhance it with AI-detected items

The implementation: Below the photo, a collapsible **"SHOP THIS FIT"** section shows each detected item (hat, top, trousers, shoes, accessories) with brand + model name and "Buy on StockX" / "Buy on GOAT" buttons with pre-filled search queries.

---

## Implementation Plan

### 1. Database: Add `detected_items` column to `street_spotted_posts`
A JSONB column storing the AI detection results:
```json
[
  {"category": "shoes", "brand": "Nike", "model": "Air Force 1 '07", "confidence": 0.92},
  {"category": "top", "brand": "Off-White", "model": "Diag Stripe Hoodie", "confidence": 0.85},
  {"category": "scarf", "brand": "Off-White", "model": "Industrial Scarf", "confidence": 0.88}
]
```

### 2. Backend function: `detect-outfit-items`
An edge function that:
- Takes an image URL
- Calls Gemini 2.5 Flash with a structured prompt asking it to identify each clothing item (category, brand, model, confidence 0-1)
- Uses tool calling for structured JSON output
- Only returns items with confidence >= 0.75
- Saves results to the `detected_items` column

### 3. Admin Moderation Queue Enhancement
- **Auto-trigger**: When a photo is submitted, the edge function runs automatically (or the admin can trigger it manually via a "Detect Items" button)
- Show detected items as editable tags in the moderation card
- Admin can edit/remove/add items before approving
- Detected brand names auto-populate the brand tags

### 4. User-facing: "SHOP THIS FIT" collapsible section
- Appears below the post image in `StreetSpottedPostDetail`
- Each detected item shown as a card with category icon, brand, and model
- Two buttons per item: **StockX** and **GOAT** with pre-filled search URLs
- Collapsed by default, expands with a tap

### 5. Affiliate link format
- StockX: `https://stockx.com/search?s={brand}+{model}`
- GOAT: `https://www.goat.com/search?query={brand}+{model}`

---

## Files to create/modify

| File | Action |
|------|--------|
| `supabase/migrations/...` | Add `detected_items jsonb` column |
| `supabase/functions/detect-outfit-items/index.ts` | New edge function for AI detection |
| `src/components/SpotModerationQueue.tsx` | Add "Detect Items" button + editable results |
| `src/components/StreetSpottedPostDetail.tsx` | Add "SHOP THIS FIT" collapsible section |
| `src/components/StreetSpottedFeed.tsx` | Pass `detected_items` data through |

---

## Summary

- **Cost**: Negligible (~$1-3/month for 1,000 photos) — auto-detect everything
- **UI**: Option 2 (inline collapsible "SHOP THIS FIT")
- **Confidence threshold**: 75%
- **Flow**: Photo uploaded → AI auto-detects → Admin reviews/edits in moderation queue → Approves → Users see shoppable items

