

# Plan: Fetch Brand Radar News Only for Popular Brands

## Approach

Instead of fetching news for all ~150 active brands nightly, limit to brands that users actually care about. Use **favorited brands** as the popularity signal — only fetch news for brands that have at least 1 user favorite in the `user_favorite_brands` table.

## Changes

### 1. Update `brand-radar-fetch` edge function
- Replace the query that fetches all active brands with a query that joins `brands` with `user_favorite_brands`, grouped by brand, ordered by favorite count descending
- Add a configurable cap (default 30 brands) to limit max API calls
- Fallback: if fewer than 10 brands have favorites, pad with a hardcoded list of popular streetwear brands (Supreme, Nike, Palace, etc.) to ensure the feed isn't empty early on

### 2. Cost impact
- 30 brands x $0.001/request = ~$0.03/night (~$0.90/month) vs $4.50/month for all brands
- ~80% cost reduction

### Technical details
- Query: `SELECT b.id, b.name, COUNT(uf.id) as fav_count FROM brands b JOIN user_favorite_brands uf ON uf.brand_id = b.id WHERE b.is_active = true GROUP BY b.id ORDER BY fav_count DESC LIMIT 30`
- No database migration needed — uses existing tables
- The `limit` parameter from the request body still works as an override

