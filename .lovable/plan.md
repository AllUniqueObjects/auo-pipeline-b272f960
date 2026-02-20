

# PositionPanel — Design Polish

Nine targeted refinements to `src/components/views/PositionPanel.tsx` only. No other files touched.

---

## Changes

### 1. Title: larger, more commanding
Current `text-xl` (20px) is undersized for the primary artifact. Bump to `text-2xl` with `leading-snug` for better wrapping on long titles.

### 2. Tighter title-to-tone spacing
Title and tone row are a semantic unit. Replace the blanket `space-y-5` container with explicit per-section margins:
- Title to Tone: `mt-2` (8px — paired)
- Tone to Quote: `mt-5`
- Quote to Key Numbers: `mt-5`
- Key Numbers to Memo: `mt-6` (breathing room before main body)
- Memo to Evidence: `mt-6` plus a faint `border-t border-border/30` separator
- Evidence to Actions: keep existing `border-t`

### 3. Owner Quote border: gray to amber
The style intent is "human voice, not machine." Change `border-l border-border/60` to `border-l-2 border-amber-500/30` — warm, subtle, clearly distinct from structural borders.

### 4. Key number index: move to top-right
The "01" label currently sits at `top-1.5 left-2`, colliding with values like "$18.40". Move to `top-1.5 right-2.5` so the index never overlaps with content.

### 5. Memo body text: slightly larger
Bump from `text-sm` (14px) to `text-[15px]` with `leading-[1.75]` for better readability on the primary reading surface.

### 6. Remove duplicate share icon from tone row
The Share2 icon in the tone/date row duplicates the bottom action bar. Remove it — the tone row should be: dot + label + date only. The bottom buttons remain.

### 7. Credibility bar: widen
Increase from `w-10` (40px) to `w-14` (56px) so the fill difference between 50% and 75% is actually perceivable.

### 8. Content-shaped skeleton loader
Replace the 3 identical pulse blocks with a skeleton that mirrors the real layout:
- Wide bar for title
- Short bar for tone/date
- Border-left block for quote
- 2x2 grid of small boxes for key numbers
- 3 paragraph-width bars for memo

### 9. Warmer empty state copy
Change "Start a conversation and ask AUO to build a position." to "When you're ready, ask AUO to build a position from your conversation."

---

## Technical Details

All changes are CSS class and markup adjustments within `PositionPanel.tsx`. No new dependencies, no data changes, no other files modified.

The `space-y-5` on the outer `<div>` in `ActiveState` will be removed entirely. Each section div will receive its own `mt-X` class instead, creating a deliberate spacing rhythm rather than uniform gaps.
