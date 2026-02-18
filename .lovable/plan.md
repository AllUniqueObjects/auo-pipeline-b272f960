
## Make the Scrollbar Track Extremely Short

### Single Change

**File: `src/index.css`** — increase `margin-block` from `30%` to `80%`:

```css
::-webkit-scrollbar-track {
  background: transparent;
  margin-block: 80%;  /* was 30% — track now only occupies middle 40px-ish of the panel height */
}
```

At `80%` inset from both top and bottom, the track is compressed into just the middle ~20px of any scrollable panel — a tiny, almost invisible floating tick near the center. The thumb slides within that tiny zone only.
