

## Plan: 5 Tasks

### 1. Add translations for Underground, Gothic, Record Shops

Add the three missing category keys to `fr.json`, `ja.json`, `ko.json`, `th.json`, `zh-CN.json`, and `zh-TW.json`:

| Key | FR | JA | KO | TH | ZH-CN | ZH-TW |
|---|---|---|---|---|---|---|
| underground | Underground | アンダーグラウンド | 언더그라운드 | อันเดอร์กราวด์ | 地下文化 | 地下文化 |
| gothic | Gothique | ゴシック | 고딕 | โกธิค | 哥特 | 哥特 |
| records | Disquaires | レコードショップ | 레코드숍 | ร้านแผ่นเสียง | 唱片店 | 唱片店 |

**Files**: All 6 locale JSON files, adding 3 keys each in the `categories` section.

---

### 2. Accent/symbol-insensitive search across all search bars

Create a shared `normalizeSearch` utility in `src/lib/utils.ts`:

```ts
export function normalizeSearch(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(/[-_&'.]/g, '')          // strip symbols
    .toLowerCase();
}
```

Apply it in every `.filter(...)` search comparison:
- `src/pages/GlobalIndex.tsx` (brand search, ~line 117-121)
- `src/pages/Drops.tsx` (drop search)
- `src/components/MediaManagement.tsx` (brand/shop search)
- `src/components/BrandManagement.tsx`, `ShopManagement.tsx`, `DropManagement.tsx` (admin search bars)
- Any other search inputs found

---

### 3. Admin: Edit detected items on approved posts

The current `SpotModerationQueue` only loads **pending** posts. We need a new admin component or section to manage **approved** posts' detected items.

**Approach**: Add a new "Manage Approved Posts" section in the admin panel (new component `ApprovedPostsManager.tsx`) that:
- Fetches approved `street_spotted_posts`
- Shows each post with its image, caption, and editable detected items (same inline editing UI as SpotModerationQueue)
- Allows adding/removing/editing items and saving via `supabase.update()`
- Re-run AI detection button
- Add as a new admin sidebar section

**Files**: New `src/components/ApprovedPostsManager.tsx`, update `src/pages/Admin.tsx` and `src/components/AdminSidebar.tsx`.

---

### 4. 404 Link Audit

After scanning all internal routes (`to=`, `navigate()`, `href=`) against the route definitions in `App.tsx`, **no broken internal links were found**. All navigation targets (`/`, `/auth`, `/global-index`, `/brand/:slug`, `/feed`, `/route`, `/more`, `/about`, `/settings`, `/contact`, `/collections`, `/profile`, `/admin`, `/analytics`, `/notifications`, `/my-heardrop`) have matching route definitions.

No action needed here.

---

### 5. Nearby shop cards: Icons on distance line (Option B)

Restructure the shop card in `ShopsBottomSheet.tsx` to remove the separate icon row and place the 3 action buttons inline with the distance text:

```text
Before:
┌─────────────────────────────┐
│ Daily Paper London Flagship │
│ 14-16 Great Pulteney St...  │
│ 110m away                   │
│              [i] [↗] [▶]   │  ← separate line
└─────────────────────────────┘

After:
┌─────────────────────────────┐
│ Daily Paper London Flagship │
│ 14-16 Great Pulteney St...  │
│ 110m away        [i] [↗] [▶]│  ← same line
└─────────────────────────────┘
```

Move the `TooltipProvider` / buttons block into the same `div` as the distance, using `flex items-center justify-between`. Remove the `flex-col gap-1.5` wrapper. Reduce button size to `h-7 w-7` with `w-3.5 h-3.5` icons.

**File**: `src/components/ShopsBottomSheet.tsx` lines 388-476.

