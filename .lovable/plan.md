

## Plan: Use padded logo for PWA home screen icons

The PWA home screen icon appears too large because the current icon fills the entire 512x512 canvas with no padding. The uploaded `AAA_FAVICON_RED_small_png_710_x_710.png` has more whitespace around the figure, which will look better as a home screen icon.

### Changes

| File | Action |
|------|--------|
| `public/pwa-192x192.png` | Replace with uploaded padded logo |
| `public/pwa-512x512.png` | Replace with uploaded padded logo |

`public/favicon.png` and `public/favicon.svg` remain unchanged — only the PWA install icons are swapped.

After updating, uninstall the app from your phone, clear browser cache, and reinstall to see the new icon.

