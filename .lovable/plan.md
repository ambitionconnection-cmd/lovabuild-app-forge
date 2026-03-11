

## Problem

When pressing "Next," the single background `<div>` swaps its `backgroundImage` instantly. During the CSS `transition-all duration-500`, the old image disappears and the new one may not be painted yet, causing a brief opacity dip where the overlay becomes semi-transparent over nothing — revealing content behind the onboarding screen.

## Solution

Render **all three background images stacked** at all times (preloaded), and crossfade between them using opacity transitions. Only the active slide's background gets `opacity-100`; the others stay at `opacity-0`. This eliminates any loading flash and ensures a smooth crossfade.

### Changes — `src/components/OnboardingSplash.tsx`

1. **Replace the single background div** (lines 56-60) with a loop rendering all three backgrounds stacked, each with `transition-opacity duration-500` and conditional `opacity-100` / `opacity-0`.

2. **Add a foreground content fade**: Wrap the slide content (icon, title, description) in a container with a brief opacity transition keyed to `currentSlide`, so text crossfades smoothly too rather than snapping.

No new dependencies. No database changes. Purely a CSS/rendering fix.

