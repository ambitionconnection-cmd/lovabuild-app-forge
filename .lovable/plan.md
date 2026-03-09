

# Install FLYAF Logo, Favicon & Update Branding

## What changes

### 1. Copy uploaded assets into the project
- `FAVICON.png` → `public/favicon.png` (browser tab icon + PWA icon)
- `LOGO_BURLY.svg` → `src/assets/flyaf-logo.svg` (used in components via import)

### 2. Update `index.html`
- Change favicon link from `/favicon.ico` to `/favicon.png`
- Update `apple-touch-icon` to `/favicon.png`

### 3. Update `DesktopTopNav.tsx` (desktop menu)
- Replace the placeholder "H" box + "HEARDROP" text with the actual SVG logo imported from `src/assets/flyaf-logo.svg`
- Display the logo at ~28px height with "FLYAF" text next to it

### 4. Update `OnboardingSplash.tsx` (mobile onboarding)
- Replace the plain "FLYAF" text heading with the SVG logo (matching the mockup layout)
- Keep "Stay Fly & Fabulous" as the red tagline beneath the logo

### 5. Update i18n tagline values (all 7 locale files)
- Change `onboarding.tagline` from "NEVER MISS A DROP" → "STAY FLY & FABULOUS" (and localized equivalents)

### Files modified
| File | Change |
|------|--------|
| `public/favicon.png` | New — copied from upload |
| `src/assets/flyaf-logo.svg` | New — copied from upload |
| `index.html` | Favicon references |
| `src/components/DesktopTopNav.tsx` | Logo + brand name |
| `src/components/OnboardingSplash.tsx` | Logo image + tagline |
| `src/i18n/locales/*.json` (7 files) | `onboarding.tagline` value |

