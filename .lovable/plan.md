

# Detailed Concept: Repurposing the Drops Page into Two Features

## Overview

Replace the current "Drops" tab with a dual-section page combining **Brand Radar** (auto-curated news) and **Street Spotted** (community photo feed). The tab stays in the same position in the bottom nav but becomes a richer, self-sustaining content hub.

---

## Feature 1: Brand Radar — Auto-Curated News Feed

### What it is
A daily-refreshed feed of news, articles, and social posts about the brands in your database. Content appears automatically without manual curation.

### How it works

1. **Nightly edge function** (`brand-radar-fetch`) runs on a cron schedule
2. For each active brand, it searches for recent news using Perplexity or web search (you already have `LOVABLE_API_KEY` for AI models)
3. Results are stored in a new `brand_radar_items` table with title, summary, source URL, thumbnail, brand_id, and published_at
4. The frontend displays them as a scrollable feed, filterable by brand
5. AI summarization (via Gemini Flash) generates a 1-2 sentence blurb for each item

### Database

New table: **`brand_radar_items`**
- `id`, `brand_id` (FK to brands), `title`, `summary`, `source_url`, `thumbnail_url`, `source_name`, `published_at`, `created_at`
- Public read access, service role insert
- Deduplication by `source_url` (unique constraint)

### UI
- Card-based feed with brand logo, article thumbnail, title, summary, source, and time ago
- Filter chips at top for brand selection
- Tapping opens the source URL in-browser
- Skeleton loading states matching the current app style

### Automation
- Edge function uses web search to find "{brand name} streetwear news" for the past 24-48 hours
- Runs nightly via pg_cron
- Auto-cleans items older than 30 days

---

## Feature 2: Street Spotted — Community Photo Feed

### What it is
Users photograph outfits or street style, tag brands and an optional location, and post to a shared feed. Creates a visual, Instagram-like scrollable gallery tied to your brand/shop data.

### How it works

1. Users tap a "+" button to upload a photo from camera or gallery
2. They tag 1+ brands from your existing brand list (autocomplete search)
3. Optionally add a city/location and a short caption
4. Posts appear in a masonry or vertical feed, newest first
5. Other users can "fire" (like) posts
6. You (admin) can post too, seeding initial content

### Database

New tables:

**`street_spotted_posts`**
- `id`, `user_id`, `image_url` (stored in a new `street-spotted` storage bucket), `caption`, `city`, `country`, `created_at`
- RLS: anyone can read, authenticated users can insert their own, users can delete their own, admins can delete any

**`street_spotted_post_brands`** (junction table)
- `id`, `post_id`, `brand_id`
- Public read, authenticated insert with own post

**`street_spotted_likes`**
- `id`, `post_id`, `user_id`, `created_at`
- Unique constraint on (post_id, user_id)
- Users can insert/delete their own

### Storage
- New public bucket: `street-spotted` for user-uploaded images
- Images resized client-side before upload (max 1200px wide)

### UI
- Vertical scrolling feed of full-width photos with overlay info (brands tagged, city, username, like count)
- Filter by brand chips at top (reuses existing brand data)
- Floating "+" button (bottom-right, above tab bar) for new posts
- Post creation: photo upload, brand tag autocomplete, optional caption + city
- Like button with count (fire emoji)
- Tap on brand tag navigates to brand detail page

### Authentication
- Viewing is public (no login required)
- Posting and liking require login (existing auth flow handles this)

---

## Page Structure

The renamed page (keeping `/drops` route for now, or rename to `/feed`) uses tabs:

```text
+----------------------------------+
|  [Brand Radar]  [Street Spotted] |
+----------------------------------+
|                                  |
|   (selected tab content)         |
|                                  |
+----------------------------------+
```

The bottom tab icon changes from `Flame` to `Newspaper` or `Camera`, label changes from "Drops" to "Feed".

---

## Implementation Order

1. Create database tables and storage bucket
2. Build Street Spotted UI (immediate value, no API keys needed)
3. Build Brand Radar edge function and UI
4. Set up cron job for nightly Brand Radar refresh
5. Update bottom tab bar icon and label

---

## Technical Considerations

- **Brand Radar data source**: Can use Perplexity connector (available) or web search via an edge function with AI summarization. No manual work after setup.
- **Street Spotted moderation**: Start simple (admin delete via existing admin panel). Can add reporting later.
- **Existing Drops data**: The drops table and related tables remain intact. The page just stops displaying them as the primary content. Could add a small "Upcoming Releases" section at the bottom of Brand Radar if desired.
- **i18n**: New translation keys needed for both features.

