

# Conversational Position Building

## Core Idea

Replace the manual "Your Take" form with a conversational flow. When David views a signal detail, the chat sidebar becomes contextual -- AUO guides him through building a shareable position via natural conversation, then auto-generates a brief template.

## Changes

### 1. Conversational "Your Take" (replaces form)

**Current problem:** Textarea + checkboxes + recommended action input = manual and feels like homework.

**New approach:** When David opens a signal detail, the chat sidebar gets a contextual prompt scoped to that insight. AUO asks structured questions conversationally:

```text
Chat sidebar (when viewing Signal Detail for insight #1):

AUO: "You're looking at the Vietnam FOB decision. 
      What's your initial read -- lock at $18.40 or wait?"

David: "I think we lock. The asymmetric risk is too high."

AUO: "Got it. What assumptions are you making?"

David: "Tariffs land at 20%+, Maine isn't ready for FW26"

AUO: "Clear. Here's your position brief:"

[Auto-generated card appears in chat]
+------------------------------------------+
| POSITION: Vietnam FOB Lock               |
| Call: Lock at $18.40/pair before BOM      |
| Why: Asymmetric tariff risk too high      |
| Assumptions:                              |
|   - Tariffs land at 20%+                  |
|   - Maine not ready for FW26              |
| [Edit] [Share This]                       |
+------------------------------------------+
```

**Technical approach:**
- Remove the "Your Take" section entirely from `SignalDetailView.tsx` (delete lines 153-219 -- textarea, checkboxes, recommended action)
- Remove the "Share This" button from the bottom of SignalDetailView
- Add `activeInsightId` prop to `ChatView` -- when set, chat shows a contextual prompt and scoped placeholder
- Add a new `PositionCard` component rendered inline in chat messages -- shows the generated brief with "Edit" and "Share This" buttons
- Mock the conversation: after 2-3 user messages about the insight, AUO responds with a PositionCard
- "Share This" on the PositionCard triggers `onShare` (navigates to Share Wizard)
- `InvestigationNote` data structure stays but gets populated from the mock conversation flow instead of form inputs

### 2. Minimizable Chat Sidebar

**Current:** Left panel is always 340px, no way to collapse.

**New approach:** Add a collapse/expand toggle on the chat panel border.

- Add `chatCollapsed` state to `Dashboard.tsx`
- When collapsed: left panel shrinks to `w-12` (48px), shows only a vertical "Chat" label or a chat icon button to expand
- When expanded: normal `w-[340px]`
- Toggle button sits on the right edge of the left panel (a small chevron)
- Right panel gets more space when chat is collapsed
- On mobile: no change (already single-panel toggle)

### 3. Expandable Signals with Clickable Sources

**Current:** Signal cards expand to show `analysis_context` and `nb_relevance` text, but no actual source links.

**New approach:** Add mock source URLs to signal data and render them as clickable links.

- Add `source_urls` field to `MockSignal` interface:
  ```
  source_urls: { title: string; url: string; domain: string }[]
  ```
- Add mock URLs to each signal in `MOCK_SIGNALS` (e.g., Reuters, WSJ, industry reports)
- In the expanded `SignalCard` (in `SignalDetailView.tsx`), render source links below the analysis text:
  ```text
  [expanded signal card]
  Analysis context text...
  NB relevance text...
  
  Sources:
  [icon] reuters.com -- "Vietnam tariff policy..."    [external link icon]
  [icon] wsj.com -- "Supreme Court hearing..."        [external link icon]
  ```
- Links open in new tab (`target="_blank"`) -- they're mock URLs so they won't go anywhere real, but the UI shows the pattern

### 4. Position Navigation

**Current:** No concept of saved positions. `investigationNote` resets when switching insights.

**New approach:** Lightweight position list in the header or as a sub-nav.

- Add `MockPosition` type: `{ id, insightId, title, status: 'draft' | 'shared', createdAt }`
- Add `MOCK_POSITIONS` array with 2-3 pre-built positions
- Add a "Positions" section accessible from the header (small dropdown or pill)
- Clicking a position navigates to its signal detail with the saved note pre-loaded
- "New Position" starts from the Insights list -- clicking any insight card starts a new position
- The current `investigationNote` state in Dashboard becomes a map: `Record<string, InvestigationNote>` keyed by insight ID, so switching between insights preserves each position's state

**Starting a new position:** Click any insight card from the Insights list. That's it -- the conversation in the chat sidebar begins scoped to that insight.

**Navigating positions:** A small dropdown in the header shows active positions with their status (draft/shared). Click one to jump back to its signal detail.

## File Changes

| File | Action |
|------|--------|
| `src/pages/Dashboard.tsx` | Add `chatCollapsed` state, position map state, pass `activeInsightId` to ChatView, position dropdown in header |
| `src/components/views/ChatView.tsx` | Accept `activeInsightId` prop, show contextual prompts, render `PositionCard` in messages, handle "Share This" callback |
| `src/components/views/PositionCard.tsx` | New component -- renders the auto-generated position brief inline in chat |
| `src/components/views/SignalDetailView.tsx` | Remove "Your Take" form section (lines 153-219), remove bottom "Share This" button, keep everything else |
| `src/data/mock.ts` | Add `source_urls` to `MockSignal`, add `MockPosition` type and `MOCK_POSITIONS` data, add mock source URLs to each signal |
| `src/data/mock-positions.ts` | Keep `InvestigationNote` type, remove `getDefaultAssumptions` (no longer needed for form) |

No new dependencies.

## Technical Detail

### ChatView prop changes
```
interface ChatViewProps {
  activeInsightId?: string | null;
  onShare?: () => void;
  chatCollapsed?: boolean;
  onToggleCollapse?: () => void;
}
```

When `activeInsightId` changes, ChatView appends a contextual AUO message scoped to that insight (mock). The placeholder text changes to "What's your read on this?" instead of "Ask AUO anything..."

### Position map in Dashboard
```
const [positionNotes, setPositionNotes] = useState<Record<string, InvestigationNote>>({});
```

When user selects insight #1, check if `positionNotes['1']` exists. If not, start fresh. If yes, restore it. This preserves positions across navigation.

### Mock source URLs
```
{
  id: 'scan-003',
  title: 'US Tariff Policy Creates 2026 Overhang...',
  sources: 57,
  credibility: 0.85,
  source_urls: [
    { title: 'Supreme Court Docket: Trade Policy Review', url: 'https://example.com/scotus', domain: 'supremecourt.gov' },
    { title: 'Vietnam FOB Price Index Q1 2026', url: 'https://example.com/fob', domain: 'reuters.com' },
  ],
  ...
}
```
