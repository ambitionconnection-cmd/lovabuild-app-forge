

# Street Spotted: The Final Page Strategy

## Overview

Transform Street Spotted from a simple feed into the app's flagship content page with a visually stunning layout, admin moderation, rich filtering, and multiple monetization paths. Remove Brand Radar entirely. Rename the tab from "Feed" to "Hot".

---

## Part 1: Visual Design (Mobile + Desktop)

### Mobile: Instagram-meets-Pinterest hybrid
- **Masonry grid (2 columns)** for browsing — taller images get more space, creating visual variety
- Tap-to-expand into a **full-screen detail view** with swipe-to-dismiss (using Vaul drawer)
- Brand tags appear as floating pills on images (current behavior, keep it)
- Sticky top filters bar with horizontal scroll chips (City, Country, Brand, Style tag)
- "Trending" section at top: top 5 most-fired posts this week as a horizontal carousel

### Desktop: 3-column masonry grid
- Sidebar filter panel (left) with brand, city, country, style checkboxes
- Hover-to-reveal brand tags + fire count overlay
- Click opens a modal with large image, brand links, and "Shop the Look" links

### Layout change
- Replace the current single-column card feed with CSS masonry using `columns-2 lg:columns-3` + `break-inside-avoid`
- Images keep their natural aspect ratios instead of forced 4:5

---

## Part 2: Admin Moderation System

### New `status` column on `street_spotted_posts`
- Values: `pending`, `approved`, `rejected`
- Default: `pending`
- Public feed only shows `approved` posts
- RLS policy update: SELECT only where `status = 'approved'` (or user's own posts)

### Admin moderation queue
- New section in existing Admin page
- Shows pending posts with Approve / Reject buttons
- Reject sends no notification (silent removal)

---

## Part 3: Enhanced Filtering & Discovery

### New fields on `street_spotted_posts`
- `style_tags` (text array) — e.g. "streetwear", "techwear", "vintage", "minimalist", "y2k"
- Submitter picks 1-3 style tags from a preset list when posting

### Filter options
- **By brand** (existing, via brand tags)
- **By country** (existing field)
- **By city** (existing field)  
- **By style tag** (new)
- **Trending** — sorted by fire count in last 7 days

---

## Part 4: Monetization (4 Revenue Streams)

### Stream 1: "Shop the Look" Affiliate Links
When a user tags brands like Nike, Supreme, etc., the post detail view shows a **"Shop the Look"** section with affiliate links to:
- The brand's official store (from `brands.official_website`)
- StockX, GOAT, or Grailed search for that brand
- Admin can add `affiliate_url` per brand in the brands table

This is the primary revenue driver — every post with brand tags becomes a shoppable moment.

### Stream 2: Sponsored/Featured Spots
- New `is_sponsored` boolean on posts
- Admin can mark any post as "Sponsored" (or create posts on behalf of brands)
- Sponsored posts get a subtle "Sponsored" badge and appear pinned at top
- Brands pay for placement (handled outside the app)

### Stream 3: Brand Profile Boost
- When users tap a brand tag on a post, they go to the brand detail page
- Brand detail page already exists with shop locations — add a "Shop Online" CTA with affiliate link
- Brands with the most community posts get higher visibility

### Stream 4: Premium Content / Early Access (Future)
- Flag certain posts as "Premium" — only visible to logged-in users
- Drives sign-ups and engagement
- Could gate behind a future subscription tier

---

## Part 5: Rename & Navigation Changes

1. Bottom tab: icon stays as `Rss`, label changes from "Feed" to "Hot" in all translation files
2. Route stays at `/feed` (no breaking change)
3. Remove the tabs (Brand Radar / Street Spotted) — page is now single-purpose Street Spotted
4. Page header says "Hot" with a flame accent

---

## Technical Summary

### Database migration
- Add `status` column (`text DEFAULT 'pending'`) to `street_spotted_posts`
- Add `style_tags` column (`text[] DEFAULT '{}'`) to `street_spotted_posts`
- Add `is_sponsored` column (`boolean DEFAULT false`) to `street_spotted_posts`
- Add `affiliate_url` column (`text`) to `brands` table
- Update RLS: public SELECT only `status = 'approved'` OR `user_id = auth.uid()`
- Admin can UPDATE status on any post

### Files to modify
- `src/pages/Feed.tsx` — remove tabs, rename to Hot, single Street Spotted layout
- `src/components/StreetSpottedFeed.tsx` — masonry grid, filters, trending carousel, shop-the-look
- `src/components/StreetSpottedCreatePost.tsx` — add style tag picker
- `src/components/BottomTabBar.tsx` — rename label
- `src/components/DesktopTopNav.tsx` — rename label
- `src/pages/Admin.tsx` — add moderation queue section
- Translation files (en, fr, ja, ko, th, zh-CN, zh-TW) — update "feed" to "hot"

### No external dependencies needed
- Masonry layout via pure CSS (`columns-2`)
- All monetization is link-based (no payment integration needed for affiliate)
- Moderation uses existing admin role system

