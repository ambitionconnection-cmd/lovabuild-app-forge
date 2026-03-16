

## Plan: Replace Onboarding + Add App Guide

### What changes

| # | File | Action |
|---|------|--------|
| 1 | `src/components/OnboardingCards.tsx` | **Create** — copy uploaded file, fix language codes (`zh-hans`→`zh-CN`, `zh-hant`→`zh-TW`), wire `i18n.changeLanguage()` in `selectLang` |
| 2 | `src/components/AppGuideScreen.tsx` | **Create** — copy uploaded file as-is |
| 3 | `src/App.tsx` | Replace `OnboardingTutorial` import with `OnboardingCards`. Add `<Route path="/guide" element={<AppGuideScreen />} />` |
| 4 | `src/pages/More.tsx` | Add "App Guide" menu item (with a Book icon) pointing to `/guide` |
| 5 | `src/pages/Settings.tsx` | Update "Replay tutorial" button to clear the new key `flyaf_onboarded_v2` instead of `flyaf_onboarding_complete` |

### Things to flag

1. **Language codes**: The uploaded `OnboardingCards.tsx` uses `zh-hans`/`zh-hant` but your i18next uses `zh-CN`/`zh-TW`. Will fix in the LANGS array and in `selectLang`.
2. **i18n wiring**: The `selectLang` TODO will be replaced with `i18n.changeLanguage(code)` using your existing i18next instance.
3. **New localStorage key**: `flyaf_onboarded_v2` — all existing users (who completed the old tutorial via `flyaf_onboarding_complete`) will see the new cards once. The Settings replay button will clear this new key.
4. **Old OnboardingTutorial.tsx**: Will be kept on disk (not deleted) as backup but no longer imported. The `data-onboarding` attributes on other components become inert (no harm).
5. **AppGuideScreen uses `dangerouslySetInnerHTML`**: This is expected since the guide is self-contained HTML/CSS/JS. The content is static and trusted (no user input), so no XSS risk.

### No other issues detected — ready to implement.

