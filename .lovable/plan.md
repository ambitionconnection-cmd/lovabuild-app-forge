

## Plan: Update PWA PNG favicon

Replace `public/favicon.png`, `public/pwa-192x192.png`, and `public/pwa-512x512.png` with the uploaded 512x512 PNG. The SVG remains as primary favicon for browsers; these PNGs serve as PWA install icons and fallback.

### Files to update
| File | Action |
|------|--------|
| `public/favicon.png` | Copy uploaded PNG |
| `public/pwa-512x512.png` | Copy uploaded PNG |
| `public/pwa-192x192.png` | Copy uploaded PNG |

After updating, you'll need to uninstall the app from your phone, clear browser cache, and reinstall to see the new icon.

