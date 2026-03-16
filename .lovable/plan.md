

## Plan: Integrate Spotlight Onboarding Tutorial

### Assessment of the uploaded component

The component is well-structured. A few things to adapt for your codebase:

1. **Language codes mismatch**: The component uses `zh-hans` / `zh-hant`, but your app uses `zh-CN` / `zh-TW` via i18next. Need to align these.
2. **Duplicate onboarding**: You already have `OnboardingSplash.tsx` using localStorage key `flyaf_onboarding_done`. The new component uses `flyaf_onboarding_complete`. We should replace the old splash entirely with this new tutorial, using the new key (so existing users see the new tutorial once).
3. **Language selection should call `i18n.changeLanguage()`**: The TODO comment on line 372 needs to be wired to your existing i18next instance.
4. **Tab navigation**: Steps reference different tabs (nearby, route, index, hot). The tutorial needs to actually navigate the user to those pages when each step activates, otherwise the `data-onboarding` targets won't exist in the DOM.
5. **Inline styles vs Tailwind**: The component uses inline styles throughout. This works fine but differs from your codebase convention. Not a blocker -- we can refactor later if desired.

### Changes

| File | Action |
|------|--------|
| `src/components/OnboardingTutorial.tsx` | **Replace** current splash with uploaded component, adapted |
| `src/App.tsx` | Replace `OnboardingSplash` import/usage with new `OnboardingTutorial` |
| `src/pages/Directions.tsx` | Add `data-onboarding="ob-city-selector"` to city selector element |
| `src/components/NearbyShopsSheet.tsx` or equivalent | Add `data-onboarding="ob-nearby-shop-icons"` to shop action icons |
| `src/pages/RoutePage.tsx` | Add `data-onboarding="ob-route-start-nav"` to Start Navigation button |
| `src/pages/GlobalIndex.tsx` | Add `data-onboarding="ob-index-collections"` to Collections button |
| `src/pages/Feed.tsx` | Add `data-onboarding="ob-hot-fab"` to the + FAB button |
| `src/pages/Settings.tsx` | Add "Replay tutorial" button |

### Key adaptations

- Map `zh-hans` to `zh-CN` and `zh-hant` to `zh-TW` to match i18next config
- Wire `handleLanguageSelect` to `i18n.changeLanguage()`
- Add `useNavigate()` to navigate between tabs as each step activates (e.g., step on route tab navigates to `/route`)
- Remove old `OnboardingSplash.tsx` (or keep as backup)
- Delete old localStorage key check (`flyaf_onboarding_done`) from App.tsx

### What stays as-is

The spotlight clip-path logic, translations, tooltip positioning, and progress UI are all solid and will be used directly.

