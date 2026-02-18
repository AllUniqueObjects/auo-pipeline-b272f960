
## Shorten the Vertical Scrollbar Track

### What's Changing

The vertical scrollbar track currently spans almost the full height of any scrollable area, with only a 10% margin inset at the top and bottom (`margin-block: 10%`). The goal is to make the track significantly shorter so it appears as a compact, floating bar rather than a full-height line.

### Single Change

**File: `src/index.css`** — update one line:

```css
::-webkit-scrollbar-track {
  background: transparent;
  margin-block: 30%;  /* was 10% — track now only occupies middle 40% of the panel height */
}
```

Increasing `margin-block` from `10%` to `30%` means the track (the rail the thumb slides along) is inset by 30% from both the top and bottom, leaving it occupying only the middle 40% of the panel's height. This makes it look noticeably shorter and more contained.

Nothing else changes — thumb size, color, hover state, and scrollbar width all stay the same.

### Technical Note

`margin-block` on `::-webkit-scrollbar-track` is a Chromium/WebKit-specific shortening technique. It does not affect Firefox (Firefox uses `scrollbar-width: thin` which doesn't support track margins), but since this is a visual polish detail the fallback is acceptable.
