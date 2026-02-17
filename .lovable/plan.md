

# Multi-Insight Position Building with AUO Agent Recommendations

## What We're Building

Two connected features:

1. **Multi-select insights** to build a combined position through conversation
2. **AUO proactively recommends related insights** based on what the user is thinking about

## User Flow

```text
1. User is on Insights list
2. Clicks an insight card -> enters Signal Detail (current behavior)
3. Chat scopes to that insight, AUO asks for their read
4. User shares their thinking: "I think we lock Vietnam FOB now"
5. AUO responds: "That connects to 2 other insights you should consider"
   -> Renders clickable InsightChip cards inline in chat
6. User clicks a chip -> that insight gets ADDED to a selected set
   -> Signal Detail view updates to show combined signals from all selected insights
7. After 2+ messages, AUO generates a PositionCard that references all selected insights
8. User can also manually add/remove insights via pills at the top of Signal Detail
```

## Layout Changes

### Signal Detail View -- Multi-Insight Header

Top of Signal Detail gets a row of selected insight pills:

```text
+--------------------------------------------------+
| [Vietnam FOB Lock x] [880 v15 Shelf Lock x]      |
| [+ Add Insight]                                   |
+--------------------------------------------------+
| (merged signals from all selected insights)       |
```

- Each pill shows truncated insight title with an "x" to remove
- "+ Add Insight" opens a small dropdown of remaining insights
- Signals section merges signals from all selected insight IDs (deduplicated)
- Hero section shows the PRIMARY insight (first selected), with a note like "Combined with 1 other insight"

### Chat View -- AUO Recommends Insights

After the user's first message in a signal-detail context, AUO's mock reply includes an `InsightRecommendation` component -- small clickable cards rendered inline in chat:

```text
AUO: "Locking FOB at $18.40 makes sense if you believe tariffs 
      land above 20%. Two related insights to consider:"

  [Vietnam FOB Inflation...]    <- clickable chip
  [880 v15 Pricing Hold...]     <- clickable chip

"Adding these would strengthen your position with 
 margin compression context."
```

Clicking a chip calls a new `onAddInsight(insightId)` callback that adds the insight to the selected set in Dashboard.

### Chat View -- Position Card Update

The `PositionCard` mock brief updates to list contributing insights:

```text
+------------------------------------------+
| POSITION: Vietnam Supply Chain Lock      |
| Based on: Insight #1, #4                 |
| Call: Lock FOB + accelerate Maine        |
| Why: ...                                 |
| Assumptions: ...                         |
| [Edit] [Share This]                      |
+------------------------------------------+
```

## File Changes

### 1. `src/data/mock.ts`

- Add `INSIGHT_RECOMMENDATIONS` map: for each insight ID, list 1-2 related insight IDs that AUO would recommend
- Add `MULTI_POSITION_BRIEFS` map: keyed by sorted insight ID combos (e.g., `"1,4"`), containing combined position briefs
- Update `MockPosition` to support `insightIds: string[]` (array instead of single `insightId`)

### 2. `src/pages/Dashboard.tsx`

- Change `selectedInsightId: string | null` to `selectedInsightIds: string[]`
- First entry in the array is the "primary" insight
- Add `handleAddInsight(id)` and `handleRemoveInsight(id)` functions
- Pass `selectedInsightIds`, `onAddInsight`, `onRemoveInsight` to both `ChatView` and `SignalDetailView`
- Update position dropdown and navigation to work with arrays

### 3. `src/components/views/ChatView.tsx`

- Accept new props: `activeInsightIds: string[]`, `onAddInsight: (id: string) => void`
- After user's first message in insight context, AUO's mock reply includes recommended insight IDs
- New `InsightChip` sub-component: small clickable card showing insight title + tier dot, calls `onAddInsight` on click
- Render `InsightChip` components inline in specific mock assistant messages using a `__INSIGHT_RECS__` content marker (similar to `__POSITION_CARD__`)
- Update position card generation to use combined insight IDs key
- Contextual prompt updates when multiple insights are selected: "You're combining Vietnam FOB with margin compression. What's the unified call?"

### 4. `src/components/views/SignalDetailView.tsx`

- Accept `insightIds: string[]` instead of single `insightId`
- Add `onAddInsight` and `onRemoveInsight` props
- Render selected insight pills at the top (truncated title + "x" button)
- Render "+ Add Insight" button that opens a dropdown of unselected insights
- Merge signals from all selected insights (deduplicate by signal ID)
- Hero shows primary insight title; if multiple, add subtitle: "Combined with N other insights"
- Decision question shows primary insight's question

### 5. `src/components/views/PositionCard.tsx`

- Add optional `basedOn?: string[]` field to `PositionBrief` interface
- Render "Based on: ..." line showing contributing insight titles

### 6. `src/components/views/ShareWizardView.tsx` and `ThreadView.tsx`

- Update to accept `insightIds: string[]` instead of single `insightId`
- Minor prop threading, no major logic changes

## Mock Data Details

### Insight Recommendations Map

```text
INSIGHT_RECOMMENDATIONS = {
  '1': ['4', '3'],     // Vietnam FOB -> margin compression, pricing
  '2': ['6', '5'],     // Shelf lock -> Brooks competition, On's quality
  '3': ['1', '6'],     // Pricing -> Vietnam FOB, Brooks
  '4': ['1'],          // Margin compression -> Vietnam FOB
  '5': ['2', '7'],     // On's quality -> shelf lock, Anta
  '6': ['3', '2'],     // Brooks -> pricing, shelf lock
}
```

### Combined Position Briefs

A few pre-built combos:

- `"1,4"`: "Vietnam Supply Chain Lock" -- combined FOB + Maine acceleration
- `"1,3"`: "Vietnam FOB + Pricing Hedge" -- lock FOB and hold $150
- `"2,6"`: "Shelf Defense Strategy" -- lock placement + counter Brooks

Fallback: if no pre-built combo exists, use the primary insight's brief with a note about combined signals.

## State Flow

```text
User clicks Insight #1
  -> selectedInsightIds = ['1']
  -> Chat shows contextual prompt for #1
  -> Signal Detail shows #1 signals

User sends message
  -> AUO replies with recommendation chips for #4, #3

User clicks chip for #4
  -> selectedInsightIds = ['1', '4']
  -> Signal Detail merges signals from #1 and #4
  -> Chat prompt updates to reference combined context

User sends 2nd message
  -> AUO generates PositionCard for combo "1,4"

User clicks "x" on #4 pill
  -> selectedInsightIds = ['1']
  -> Back to single-insight view
```

## Files Summary

| File | Action |
|------|--------|
| `src/data/mock.ts` | Add recommendation map, combined briefs, update MockPosition |
| `src/pages/Dashboard.tsx` | selectedInsightIds array, add/remove handlers |
| `src/components/views/ChatView.tsx` | InsightChip component, recommendation rendering, multi-insight context |
| `src/components/views/SignalDetailView.tsx` | Multi-insight pills, merged signals, add/remove UI |
| `src/components/views/PositionCard.tsx` | "Based on" field |
| `src/components/views/ShareWizardView.tsx` | Accept insightIds array |
| `src/components/views/ThreadView.tsx` | Accept insightIds array |

No new dependencies.

