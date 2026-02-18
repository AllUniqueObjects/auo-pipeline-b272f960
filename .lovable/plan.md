
## Fix: Shorter Scrollbar + No Overlap with Resize Handle

### The Problem

In the onboarding split view (after the right panel activates), the left panel is a `<Panel>` from `react-resizable-panels`. Inside it, the chat scroll area (`div ref={scrollRef}`) has `overflow-y-auto`. Its scrollbar thumb renders along the right edge of the left panel — exactly where the `PanelResizeHandle` sits. This causes visual overlap between the scrollbar and the resize drag handle.

Additionally, the scrollbar track needs to be shorter than the current `margin-block: 80%`.

### Two-Part Fix

**1. Make the scrollbar track shorter — `src/index.css`**

Increase `margin-block` from `80%` to `85%`. This makes the track and thumb occupy only the middle ~30px of any scrollable area — a very short tick.

```css
::-webkit-scrollbar-track {
  background: transparent;
  margin-block: 85%;
}
```

**2. Push the scrollbar away from the resize handle — `src/pages/Onboarding.tsx`**

The scrollable `div` inside the left `Panel` (line 610) has `overflow-y-auto`. The scrollbar appears on its right edge, which is the same pixel column as the `PanelResizeHandle`.

Fix: add `scrollbar-gutter: stable` and a small `padding-right` (e.g. `pr-2`) on the scrollable div so the scrollbar is inset from the panel edge and no longer touches the resize handle.

Specifically, the two scrollable divs in the left panel at lines 555 and 610:
- Line 555 (full-width mode): `className="flex-1 overflow-y-auto py-10"` → add `pr-2` 
- Line 610 (split mode): `className="flex-1 overflow-y-auto py-10"` → add `pr-2`

This creates a small buffer between the scrollbar thumb and the panel divider handle, so they no longer overlap.

### Files Changed

| File | Change |
|------|--------|
| `src/index.css` | `margin-block: 80%` → `margin-block: 85%` |
| `src/pages/Onboarding.tsx` | Add `pr-2` to the two overflow-y-auto scroll divs in the left panel |

### Why This Works

- `margin-block` on the webkit scrollbar track shortens the usable track region so the thumb only ever appears in a small central zone
- `pr-2` (8px right padding) on the scroll container moves the scrollbar 8px away from the panel's right edge, creating visual separation from the `PanelResizeHandle` which sits at the exact border pixel
