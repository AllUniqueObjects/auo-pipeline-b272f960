
# Fix Graph Container to Fill Viewport

## Root Cause

The console logs confirm the container height is still **150px** instead of filling the viewport. This is a CSS flexbox height inheritance issue:

```text
Current layout hierarchy:
div (min-h-screen flex flex-col)
  └── div (flex-1 + height: calc(...))  ← CONFLICT: flex-1 ignores height
        └── SignalGraph (h-full)        ← Gets 150px from parent content height
```

When using `flex-1` (which expands to fill available space) combined with an explicit `height` property, the flexbox algorithm prioritizes the flex behavior over the height. The child with `h-full` then inherits the content-based height (~150px from header + summary) rather than the viewport-filling height.

## Solution

Remove the `flex-1` class and use **only** the explicit height calculation. This tells the browser to use the exact calculated height instead of letting flexbox determine it:

### File: `src/pages/Signals.tsx`

**Change**: Line 134-136

```tsx
// FROM:
<div 
  className="flex-1 px-10 pb-10"
  style={{ height: 'calc(100vh - 120px)' }}
>

// TO:
<div 
  className="px-10 pb-10"
  style={{ height: 'calc(100vh - 120px)' }}
>
```

By removing `flex-1`, the explicit `height: calc(100vh - 120px)` becomes the authoritative height, and the child's `h-full` will correctly inherit ~680px (on a typical viewport) instead of 150px.

## Expected Result

- Container height: **~680px** (viewport height minus 120px for header/summary)
- Graph will render with nodes spread across the full area
- Clusters will be well-spaced and centered
