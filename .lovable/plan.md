
## Scrollbar: Thumb Visually Centered Inside the Track

### The Problem

The scrollbar is 3px wide. The track is also 3px wide. The thumb fills the entire width of the track, so there's no visual "groove" — they read as the same element. This makes the scrollbar look blunt and unrefined.

### The Approach — Inset Shadow on the Thumb

WebKit scrollbars don't support `margin` or `padding` on the thumb element to shrink it inside the track. The correct technique is to use a transparent `border` on the thumb combined with `background-clip: content-box`. This makes the thumb's painted background narrower than its actual hit area — so it appears centered inside the track with visible track on either side.

Since the track is 3px and we want the thumb to look like ~1px centered within it, we set a `1px` transparent border on all sides of the thumb. This leaves a 1px painted thumb in the center of the 3px track with 1px of visible track on each side.

### Change — `src/index.css`

```css
::-webkit-scrollbar-track {
  background: hsl(var(--border) / 0.2);   /* slightly more subtle track */
  border-radius: 9999px;
  margin-block: 85%;
}
::-webkit-scrollbar-thumb {
  background: hsl(var(--border) / 0.8);   /* slightly stronger thumb for contrast */
  border-radius: 9999px;
  border: 1px solid transparent;          /* creates 1px gap between thumb and track wall */
  background-clip: content-box;           /* clips the fill to inside the border, making thumb appear narrower */
  transition: background 0.2s ease;
}
::-webkit-scrollbar-thumb:hover {
  background: hsl(var(--muted-foreground) / 0.5);
  background-clip: content-box;
}
```

### Visual Result

```text
Before:
┌───┐  ← 3px track
│███│  ← 3px thumb fills entire track, no groove visible
└───┘

After:
┌───┐  ← 3px track (faint)
│ █ │  ← 1px thumb centered, 1px gap each side
└───┘
```

The thumb now reads as a distinct element riding inside the track — like a pill in a slot — rather than a block that replaces it.

### Files Changed

| File | Change |
|------|--------|
| `src/index.css` | Add `border: 1px solid transparent` + `background-clip: content-box` to thumb; tune opacities |
