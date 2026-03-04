

# Implementation Plan: 5 Fixes for FLYAF

## 1. NEARBY: Selected card text contrast fix

**Problem**: When a shop card in the bottom sheet has a light/white background (selected or highlighted state), the text remains white, making it unreadable. Action icons on the right are also clipped.

**Fix in `src/components/ShopsBottomSheet.tsx`**:
- Add conditional dark text classes when `isSelected` or `inJourney` states apply (e.g., `text-black` for name, `text-gray-600` for address/distance)
- Ensure the icon buttons container has enough right margin and doesn't overflow — add `overflow-visible` or remove any clipping

## 2. ROUTE: Drag-to-reorder stops

**Problem**: Users cannot rearrange route stops. The `RouteBottomSheet.tsx` (mobile) lists stops statically. The desktop `RouteSidePanel.tsx` also has no reorder. Note: `Directions.tsx` already imports `@dnd-kit` and has a `SortableStop` component, but it's only used in the desktop side panel context.

**Fix**:
- **`RouteBottomSheet.tsx`**: Wrap the stops list with `DndContext` + `SortableContext` from `@dnd-kit`. Create sortable stop items with a drag handle (GripVertical icon). On `DragEnd`, call a new `onReorderStops` callback.
- **`Directions.tsx`**: Add `onReorderStops` prop that calls `setJourneyStops(arrayMove(...))` and pass it to both `RouteBottomSheet` and `RouteSidePanel`.
- **`RouteSidePanel.tsx`**: Same DnD treatment for desktop.

## 3. INDEX: Brand cards colour refresh

**Problem**: Brand cards are visually flat and dark, especially when missing a description.

**Fix in `src/pages/GlobalIndex.tsx`**:
- Add subtle accent colour to brand names (e.g., `text-[#C4956A]` for the brand name or a warm white `text-[#E8E0D8]`)
- Add a thin left border accent on each card (`border-l-2 border-[#C4956A]/30`)
- When no description exists, show a placeholder italic text like "Explore this brand →" in a muted accent colour to fill the visual gap
- Make the action links (Web, Insta, Shops) slightly more visible with a subtle background pill

## 4. HOT: Photo download + social handles

**Two sub-tasks**:

### 4a. Download own photo
**Fix in `src/components/StreetSpottedPostDetail.tsx`**:
- Add a download button (visible when `post.user_id === currentUser.id`) that fetches the image URL and triggers a browser download using `<a download>` or `fetch` + `blob` + `URL.createObjectURL`.
- Position it next to the like button or in the action bar.

### 4b. Social handle fields
**Database migration**: Add `instagram_handle` and `tiktok_handle` columns to `street_spotted_posts` table.

**Fix in `src/components/StreetSpottedCreatePost.tsx`**:
- Add two optional input fields for Instagram handle and TikTok handle below caption, with @ prefix hint.
- Save to new columns on submit.

**Fix in `src/components/StreetSpottedPostDetail.tsx`**:
- Display the handles (if present) as tappable links next to the author name.

**Fix in Post interface** across `StreetSpottedFeed.tsx` and `StreetSpottedPostDetail.tsx`: add the two new fields.

## 5. FAVOURITE SHOPS: Add heart button to shop cards + shop detail

**Problem**: There's a Favourite Shops section in MyFLYAF but no way to favourite a shop from the map UI.

**Fix**:
- **`src/components/ShopsBottomSheet.tsx`**: Add a heart icon button in the action buttons row (alongside Info, Directions, Add to Route). Wire it to `useFavorites('shop')`.
- **`src/components/ShopDetailBottomSheet.tsx`**: Add a heart icon in the sticky header (next to the close button). Wire to same hook.
- **`src/components/ShopDetailsModal.tsx`** (desktop): Same treatment.

## 6. App state persistence on close/reopen

**Problem**: When the app is closed and reopened, the map reloads from scratch and saved route stops are lost.

**Current state**: Route stops are in `sessionStorage` (`flyaf_route_stops`) — which is cleared when the browser/app is fully closed. Map position is also in `sessionStorage`.

**Fix in `src/pages/Directions.tsx`**:
- Change `sessionStorage` to `localStorage` for both `flyaf_map_position` and `flyaf_route_stops`, so they persist across app restarts.
- Keep the existing `sessionStorage` writes as well for tab-switching, but read from `localStorage` as fallback when `sessionStorage` is empty.

**Fix in `src/components/Map.tsx`**: Same — read/write map position to `localStorage` instead of (or in addition to) `sessionStorage`.

---

**Summary of files to modify**:
- `src/components/ShopsBottomSheet.tsx` — text contrast fix + favourite heart button
- `src/components/ShopDetailBottomSheet.tsx` — favourite heart button
- `src/components/RouteBottomSheet.tsx` — drag-to-reorder with dnd-kit
- `src/components/RouteSidePanel.tsx` — drag-to-reorder with dnd-kit
- `src/pages/Directions.tsx` — reorder handler + localStorage persistence
- `src/pages/GlobalIndex.tsx` — brand card colour refresh
- `src/components/StreetSpottedPostDetail.tsx` — download button + social handles display
- `src/components/StreetSpottedCreatePost.tsx` — social handle input fields
- `src/components/StreetSpottedFeed.tsx` — Post interface update
- `src/components/Map.tsx` — localStorage persistence
- **Database migration**: Add `instagram_handle` and `tiktok_handle` to `street_spotted_posts`

