

# Rebuild Briefing Screen -- Light Theme with Filters

## Overview

Redesign the Briefing screen to match the screenshot reference: light background, cluster filter chips, redesigned insight cards with category labels and decision questions, temporal grouping dividers, and a chat input bar. All changes are UI-only with hardcoded mock data.

---

## Visual Changes

**Theme**: White/light background replacing `#13131a`. Cards on subtle gray (`#f8f8fa`). Text in dark grays.

**Layout (top to bottom)**:
1. Top navigation bar: "Briefing" (active) | "Radar" tabs
2. Horizontal cluster filter chips with colored dots and signal counts
3. Temporal grouping headers (e.g., "EARLIER TODAY", "YESTERDAY")
4. Redesigned insight cards
5. Bottom chat input bar ("Ask AUO anything...")

---

## File Changes

### 1. `src/index.css` -- Switch to light theme

Update CSS custom properties to a light color scheme:
- `--background`: white
- `--foreground`: dark gray (`#1a1a2e`)
- `--card`: light gray (`#f8f8fa`)
- Keep DM Sans font

### 2. `src/components/signals/InsightCard.tsx` -- Redesign card layout

New card structure matching the screenshot:
- **Top row**: Category label (colored uppercase text like "COMPETITIVE INTELLIGENCE") + signal/reference counts on the right ("4 signals, 12 refs")
- **Title**: Bold, dark text, 17-18px
- **Decision question**: Italicized, slightly lighter color, prefixed or styled distinctly
- **Description**: 1-2 line summary in medium gray
- White/light card background with subtle border, no left color bar
- Add `decisionQuestion` field to `InsightData` interface (hardcoded for now)

### 3. `src/components/signals/BriefingView.tsx` -- Full rebuild

Replace the dark conversational layout with:

**Top Nav Bar**:
- "AUO" logo left, "Briefing" and "Radar" tab buttons center/right
- "Briefing" shown as active (underlined or bold)
- "Radar" clickable but non-functional for now

**Cluster Filter Chips**:
- Horizontal row of pill-shaped chips
- Each chip: colored dot + cluster name + signal count
- "All" chip selected by default
- Clicking a chip filters the cards below
- State managed with `useState<string | null>` (null = all)

**Temporal Grouping**:
- Group insights by time buckets: "EARLIER TODAY", "YESTERDAY", "THIS WEEK"
- Small uppercase gray divider text
- For now, use mock timestamps since we're not connecting to DB

**Insight Cards**:
- Render filtered `InsightCard` components under their time groups

**Chat Input Bar**:
- Fixed or sticky at bottom
- Text input with placeholder "Ask AUO anything..."
- Send button icon on right
- Non-functional (visual only)

### 4. `src/components/signals/HighlightedText.tsx` -- Update colors for light theme

Adjust highlight and legend colors to be visible on a white background (darker/more saturated versions of coral, sage, etc.)

### 5. `src/lib/clusterColors.ts` -- Adjust for light theme

Update cluster color values so dots and labels are legible on white backgrounds. Increase saturation of `text` colors.

### 6. `src/pages/Signals.tsx` -- Add mock data fallback

Since we're not connecting to DB yet, add hardcoded mock insights with fields like `decisionQuestion`, `category`, `referenceCount`, and `createdAt` timestamps for temporal grouping. Pass these to `BriefingView` when real data is empty.

---

## Mock Data Structure

Each insight card will use:

```text
{
  id, title, description,
  decisionQuestion: "Should we accelerate our timeline...?",
  category: "competitive" | "market" | "technology" | ...,
  signalCount: 4,
  referenceCount: 12,
  createdAt: Date (for temporal grouping),
  color: cluster color,
  urgentCount
}
```

3-5 mock insights spread across "EARLIER TODAY" and "YESTERDAY" groups.

---

## Technical Notes

- The `BriefingView` component will manage its own filter state (`activeCluster`)
- Temporal grouping uses a helper function that buckets `createdAt` into "EARLIER TODAY", "YESTERDAY", "THIS WEEK"
- The chat input is a presentational `<input>` with no submit handler
- The "Radar" tab will be a no-op button for now
- All existing navigation callbacks (`onSelectInsight`, `onShowFullGraph`) remain wired so clicking a card still navigates to the Insight Graph view

