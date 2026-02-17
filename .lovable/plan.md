

# Proactive AUO Agent + Fluid Position Brief

## Core Behavior Change

AUO shifts from a reactive chatbot ("What's your read?") to a **proactive briefing agent** that surfaces connections the moment the user selects insights or signals -- before they type anything.

## How It Works

### 1. First Insight Selected -- AUO Opens with a Briefing

Instead of the current "What's your read -- lock at $18.40 or wait?", AUO opens with substance:

```
"A few things worth knowing here...

Vietnam FOB is sitting at $18.40, but that number hides two converging
pressures: labor inflation running 7-8% annually AND a Supreme Court
tariff ruling that lands 8-12 weeks after your BOM lock deadline.

The timing mismatch is the real issue — you're deciding blind.

There's also a margin compression angle I'm tracking that connects to this:"

  [Vietnam FOB Inflation + Margin...]  <- clickable chip

"Want me to pull those threads together?"
```

This is **not** a question asking for the user's take. It's AUO doing its job -- surfacing what matters and why, then recommending related context.

### 2. Second Insight Added -- AUO Synthesizes Immediately

When the user clicks a recommended chip or adds an insight via the pill header, AUO fires a new proactive message without waiting for user input:

```
"Interesting combination. Here's what connects these two:

Vietnam FOB lock at $18.40 + the margin compression story are two sides
of the same squeeze. If tariffs land at 20%+, you're looking at 8-12
points of margin erosion unless Maine expansion accelerates.

The hedge: lock FOB now AND pull Maine timeline forward. One without
the other leaves a gap.

I also see a thread to pricing:"

  [880 v15 Pricing Hold...]  <- clickable chip
```

### 3. Position Brief Emerges Fluidly

Instead of generating a fixed-template position card after N messages, the position **evolves** as context builds:

- After the proactive briefing + 1 user message: AUO generates a **lean draft** (3 sections)
- As more insights are added: the draft expands with new sections that reflect the added context
- The sections themselves are fluid -- labels and content change based on the insight combination

### 4. Fluid Position Data Model

Replace the rigid `PositionBrief` (title/call/why/assumptions) with:

```typescript
interface PositionSection {
  label: string;     // "Strategic call", "What connects these", "Risk if wrong", etc.
  content: string;
  items?: string[];
}

interface PositionBrief {
  title: string;
  sections: PositionSection[];
  basedOn?: string[];
}
```

Single-insight positions are lean (2-3 sections). Multi-insight syntheses are richer (4-6 sections) with different labels reflecting the combined context.

## Mock Data Changes

### Proactive Briefings (`src/data/mock.ts`)

New `PROACTIVE_BRIEFINGS` map replaces `CONTEXTUAL_PROMPTS`. Each entry is a longer, substantive message that AUO sends on insight selection:

| Key | Content Theme |
|-----|---------------|
| `'1'` | Vietnam FOB timing mismatch + labor inflation convergence |
| `'2'` | Foot Locker leadership vacuum + Nike wholesale flood timing |
| `'3'` | Price resistance hitting before tariff clarity arrives |
| `'1,4'` | Same-squeeze synthesis: FOB + margin = dual-track hedge needed |
| `'1,3'` | Upstream cost risk vs consumer price defense connection |
| `'2,6'` | Shelf threat convergence: leadership churn + Brooks milestone |

Each briefing ends with recommendation chips (using existing `__INSIGHT_RECS__` marker).

### Fluid Position Briefs

`MOCK_POSITION_BRIEFS` and `MULTI_POSITION_BRIEFS` switch to the sections-based format. Examples:

**Single insight '1' (lean, 3 sections):**
- "Call" -- Lock at $18.40/pair before BOM deadline
- "Why this matters" -- Asymmetric tariff risk; deciding blind on 8-12 week gap
- "Key assumptions" -- [bullet list]

**Multi-insight '1,4' (rich, 6 sections):**
- "Strategic call" -- Lock FOB + accelerate Maine
- "What connects these" -- Double compression from tariff + labor inflation
- "What must be true" -- [bullet list]
- "Evidence" -- [signal excerpts]
- "Risk if wrong" -- Overpay 7-8% vs spot
- "Decision window" -- 8-12 weeks before Supreme Court ruling

## File Changes

### `src/data/mock.ts`
- Add `PROACTIVE_BRIEFINGS: Record<string, string>` -- keyed by single insight IDs and sorted combo keys
- Each briefing is a multi-paragraph string with embedded `__INSIGHT_RECS__` markers
- Update `MULTI_POSITION_BRIEFS` and add single-insight briefs to use the `PositionSection[]` format
- Export the new map

### `src/components/views/PositionCard.tsx`
- Change `PositionBrief` interface to use `sections: PositionSection[]` instead of fixed `call`/`why`/`assumptions`
- Render sections dynamically: loop through `brief.sections`, show label as uppercase heading, content as paragraph, items as bullet list
- Keep "Edit" and "Share This" buttons
- Keep "Based on" line

### `src/components/views/ChatView.tsx`
- Replace `CONTEXTUAL_PROMPTS` with import of `PROACTIVE_BRIEFINGS`
- Update the `useEffect` that fires on `contextKey` change:
  - For single insight: use `PROACTIVE_BRIEFINGS[id]` which includes inline `__INSIGHT_RECS__`
  - For multi-insight combos: use `PROACTIVE_BRIEFINGS[sortedKey]` for synthesis message, also with recs
  - These fire immediately on selection -- no user input needed
- Position card generation after 1 user message (down from 2) since AUO already briefed proactively
- The brief object uses the new sections format

### `src/components/views/ShareWizardView.tsx`
- Update to accept the new `PositionBrief` with sections
- `generateShareMessage` iterates through sections to build the share text

### `src/data/mock-threads.ts`
- Update `generateShareMessage` to format sections dynamically

### `src/pages/Dashboard.tsx`
- No structural changes needed -- already passes `selectedInsightIds` and handlers
- Thread position brief to share wizard if stored

## Interaction Flow

```
User clicks Insight #1
  -> AUO immediately sends proactive briefing about Vietnam FOB
  -> Briefing includes recommendation chips for insights #4, #3
  -> No user input required yet

User clicks chip for #4
  -> selectedInsightIds = ['1', '4']
  -> AUO immediately sends synthesis message connecting FOB + margin
  -> Includes chip for pricing insight #3

User types "I think we lock now and accelerate Maine"
  -> AUO generates fluid PositionCard with 5-6 sections
  -> Sections reflect the combined context (not a fixed template)

User removes #4 via pill
  -> selectedInsightIds = ['1']
  -> AUO notes the change: "Noted, focusing back on Vietnam FOB alone"
  -> Position card would regenerate leaner on next message
```

## Files Summary

| File | Change |
|------|--------|
| `src/data/mock.ts` | Add `PROACTIVE_BRIEFINGS`, update briefs to sections format |
| `src/components/views/PositionCard.tsx` | Fluid sections renderer, new `PositionSection` interface |
| `src/components/views/ChatView.tsx` | Proactive briefing on selection, position after 1 msg, sections format |
| `src/components/views/ShareWizardView.tsx` | Accept sections-based brief |
| `src/data/mock-threads.ts` | Format sections in share message |

No new dependencies.

