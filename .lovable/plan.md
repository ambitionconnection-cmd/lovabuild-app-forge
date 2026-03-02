

# Final Fixes Plan

## 1. Translation Helper for Long Text (Brand/Shop Descriptions)

**Options considered:**
- **A) Add a "Translate" button** next to descriptions that opens Google Translate in a new tab with the text pre-filled (using `https://translate.google.com/?sl=en&tl={userLang}&text={encodedText}`)
- **B) Show a banner/tip** advising users to use Google Lens or copy-paste
- **C) Use Lovable AI** to translate on-the-fly via an edge function (adds cost and latency)

**Recommendation: Option A** -- a small "Translate" icon-button next to brand/shop descriptions in `ShopDetailBottomSheet.tsx` and `BrandDetail.tsx`. When tapped, it opens Google Translate with the text pre-filled in the user's current language. Zero cost, instant, and native-feeling. Will only show when the user's language is not English.

**Files to edit:**
- `src/components/ShopDetailBottomSheet.tsx` -- add translate button next to description sections
- `src/pages/BrandDetail.tsx` -- add translate button next to brand description/history

---

## 2. Country Dropdown in HOT Post Form

Replace the free-text Country input with a `<Select>` dropdown using the country list from `countryFlags.ts`. Keep City as free text (too many cities to list). Add a few more countries to the list to cover common streetwear locations.

**Files to edit:**
- `src/components/StreetSpottedCreatePost.tsx` -- replace `<Input>` for country with `<Select>` dropdown
- `src/lib/countryFlags.ts` -- add any missing countries (Thailand, India, etc.)

---

## 3. Shop Images in Bottom Sheets

The bottom sheet shows `brand?.banner_url || shop.image_url`. Shops like Machine-A and Footpatrol have `image_url` populated, while Stussy London does not. The fix is to **fall back to the brand's logo_url** as a styled hero when no banner/image exists, so every bottom sheet has visual content.

**Files to edit:**
- `src/components/ShopDetailBottomSheet.tsx` -- when no `bannerImage`, show a styled fallback with the brand logo centered on the `logo-bg` background

---

## 4. Screenshot Prevention

No action needed -- confirmed it was incognito mode behavior, not our code.

---

## 5. Toast Position Too Low (Blocks Menu)

The Sonner toaster defaults to `bottom-right` which overlaps the bottom tab bar. Change its `position` prop to `top-center` so confirmation toasts appear at the top of the screen and never block navigation.

**Files to edit:**
- `src/components/ui/sonner.tsx` -- add `position="top-center"` to the `<Sonner>` component

---

## Summary of Changes

| Fix | Files | Effort |
|-----|-------|--------|
| Translate button for descriptions | `ShopDetailBottomSheet.tsx`, `BrandDetail.tsx` | Small |
| Country dropdown in HOT form | `StreetSpottedCreatePost.tsx`, `countryFlags.ts` | Small |
| Fallback image in bottom sheet | `ShopDetailBottomSheet.tsx` | Small |
| Toast position higher | `sonner.tsx` | Trivial |

