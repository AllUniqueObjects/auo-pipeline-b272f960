
# AUO — Design Overhaul: 8-Point Redesign Plan

This plan addresses all 8 feedback points in a single pass, touching the specific files that need to change. The design system, color theme, fonts, and all existing mock data are untouched. The PositionPanel template is also untouched.

---

## What I observed in the live app

From the session screenshots, the specific problems visible are:

1. **Signals (Briefing panel)**: Small, low-contrast signal rows with a credibility bar that is too thin (h-1, 40px wide) and barely distinguishable. The tier dot (h-2 w-2) is the only visual indicator before the title. The "davidCanTell" italic line blends into the title at the same low visual weight. Momentum badge and LIVE badge are on the same metadata line as refs/credibility, making it a wall of tiny text.
2. **Empty state**: Not currently reachable from the UI without resetting localStorage — the onboarding right panel shows "position" in very faint watermark text, which is correct for onboarding but there is no clear empty state within the dashboard itself.
3. **Role lens**: "Executive / Leader / Individual Contributor" is arbitrary and too coarse. The onboarding screen picks one of three cards with no explanation of *what* changes.
4. **Header confusion**: AUO wordmark + 3 workspace tabs + Positions dropdown + Executive lens dropdown + dev state machine buttons all on one line. The dev buttons "→ session_open" and "reset" look like product UI.
5. **"Position / Signal overlay / reset"**: The dev state machine button `→ session_open` cycles through opaque state names. "Reset" deletes localStorage. None of this is product UI.
6. **Briefing impact**: The briefing is a flat list of rows with no visual hierarchy between urgent and routine signals. No clear scent of urgency or recommended action.
7. **Selection and conversation**: No way to select a signal and say "let's dig into this" or "build a position from this." The "Build Position" text link is visually equivalent to "Explore all 5 →".
8. **Build Position mechanism**: Clicking "Build Position →" or "Build Position ✦" immediately jumps to a generating skeleton with no context about *which* signals it's building from or what kind of position to build.

---

## Design decisions before implementation

### Issue 3: Role lens — replace 3 coarse buckets with "Focus" framing
The three-bucket model (Executive / Leader / IC) is too role-title-dependent. Replace with **two named focus modes** that describe *what you want AUO to weight*, not who you are:

- **Strategic** — weights Market Dynamics + Macroeconomics; frames insights around competitive implications and macro risk
- **Operational** — weights Innovation + supply chain signals; frames insights around execution and product decisions

This is still a toggle (not a settings page), still instant, still in the header. But the label describes *what it does* rather than *who you are*. The third option ("Balanced") is kept as the default state between the two.

Internally `activeLens` values become `'strategic' | 'balanced' | 'operational'`. The onboarding role-select step is updated to match.

### Issue 4 and 5: Header cleanup + dev tools hidden
Move the dev state machine buttons out of the header entirely. Put them in a small floating `DEV` pill in the bottom-right corner of the screen (outside the product UI), only rendered in development/demo mode. This removes the two visually confusing dev buttons from the product header.

The header becomes: `AUO` · workspace tabs (centered) · `Balanced ▾` focus toggle · `Positions (3) ▾`.

### Issue 1: Signal card redesign in BriefingPanel
Replace the current flat `InsightRow` with a denser but clearer card-style layout:

```
┌────────────────────────────────────────────────────┐
│  🔴 BREAKING             ↑ Breaking since yesterday │
│  Supreme Court Tariff Ruling Forces Maine...        │
│  "Tariff uncertainty has 203 sources —              │
│   this is the loudest signal in market."           │
│                                 203 refs  ████ 92% │
└────────────────────────────────────────────────────┘
```

Key changes:
- Full-width card with `border border-border rounded-xl` and hover state
- **Tier badge** (colored pill, not just a dot) top-left: `BREAKING` in small caps colored text on light colored background
- **Momentum badge** top-right (only when present): amber `↑ Breaking since yesterday`
- **Title**: `text-sm font-medium` — the primary read
- **"David can tell his team"** quote in a slightly inset, muted italic block — visually distinct from the title
- **Credibility bar** is wider (`w-20`) and taller (`h-1.5`), color-coded: green ≥80%, amber 60-79%, red <60%
- **refs** count and credibility are bottom-right, small and secondary
- **LIVE badge** appears as a pulsing blue pill on the right of the tier badge row (not buried in metadata)

### Issue 6: Briefing impact — visual hierarchy
Topic sections get a top-level heading treatment:
- Topic name is larger, with a subtle left accent stripe (2px amber/teal depending on dominant tier in that topic)
- Breaking insights in a topic have a subtle `bg-tier-breaking/4` tint on the card
- A **"Most urgent"** callout on the top 1-2 cards per topic (the breaking ones) adds visual weight

### Issue 7: Signal selection UX — "Talk about this" actions
Each insight card in the briefing gets a **subtle action row** that appears on hover:
```
[Ask AUO about this]  [Explore →]
```
- "Ask AUO about this" sends a pre-formed message into the chat, opening the conversation about that specific insight. AUO responds with the `PROACTIVE_BRIEFINGS` content already in `mock.ts`.
- "Explore →" navigates to the insight_detail view (existing behavior).

Additionally, a **floating action area** appears at the bottom of the briefing panel when 1+ insights are hovered/selected:
This is a simpler pattern — each card just gets a visible `[→ Discuss]` button on hover. No multi-select for now (that's a later phase).

### Issue 8: Build Position — contextual flow
"Build Position" becomes a **guided entry point** that passes context. Instead of immediately triggering the generating state, clicking "Build Position →" from any topic or insight opens a **compact Position Starter** that slides in on the right:

```
┌────────────────────────────────────────────────────┐
│  BUILDING POSITION FROM                             │
│  Vietnam Manufacturing Squeeze                      │
│                                                     │
│  Based on 5 signals · Supreme Court Tariff,        │
│  Vietnam FOB Inflation, Maine Expansion...          │
│                                                     │
│  What kind of position?                             │
│  ○ The Call — lock a decision with rationale        │
│  ○ Thesis — explore the strategic question          │
│  ○ Risk Memo — map the downside scenarios           │
│                                                     │
│  Add your context (optional):                       │
│  [                                             ]    │
│                                                     │
│           [Generate Position →]                     │
└────────────────────────────────────────────────────┘
```

This replaces the direct `handleBuildPosition()` jump to `generating`. It's a lightweight modal-style overlay or an inline panel state in the right workspace — not a separate route.

---

## Files to create / modify

| File | Action | What changes |
|---|---|---|
| `src/pages/Dashboard.tsx` | **Modify** | Clean header (remove dev buttons from header), add DEV floating pill at bottom-right, rename lens options to Strategic/Balanced/Operational, wire new "Build Position" flow, add `positionContext` state for the guided entry modal |
| `src/pages/Onboarding.tsx` | **Modify** | Update role-select cards to match new Strategic/Balanced/Operational framing |
| `src/components/views/BriefingPanel.tsx` | **Modify** | Full InsightRow redesign → InsightCard with tier pill badge, wider cred bar, davidCanTell quote block, hover action row (`[Discuss] [Explore →]`), topic header accent stripe |
| `src/components/views/TopicDetailPanel.tsx` | **Modify** | Reuse new InsightCard component, same visual treatment |
| `src/components/views/InsightDetailPanel.tsx` | **Modify** | Minor: update "Build Position from this insight" to open the guided Position Starter instead of directly triggering generating |
| `src/components/views/PositionStarter.tsx` | **Create** | New component: the guided position-building modal. Receives `sourceType: 'topic' | 'insight'`, `sourceName`, `insights[]`. Shows type selector (The Call / Thesis / Risk Memo) + optional context input + Generate button. On Generate → sets `rightView = 'generating'` + passes context. |
| `src/data/mock.ts` | **Modify** | Update `LensType` to `'strategic' | 'balanced' | 'operational'`, update `LENS_MESSAGE` and `LENS_CATEGORY_WEIGHT` accordingly |

---

## Detailed spec: Each change

### 1. BriefingPanel — InsightCard redesign

Replace `InsightRow` with `InsightCard`:

```tsx
function InsightCard({ insight, onOpen, onDiscuss }) {
  return (
    <div className="group rounded-xl border border-border hover:border-muted-foreground/30 
                    hover:bg-accent/30 transition-all duration-150 cursor-pointer overflow-hidden"
         onClick={() => onOpen(insight.id)}>
      
      {/* Top row: tier badge + momentum + LIVE */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <span className={cn('text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full',
          tier === 'breaking' ? 'bg-tier-breaking/10 text-tier-breaking' :
          tier === 'developing' ? 'bg-tier-developing/10 text-tier-developing' :
          'bg-muted text-muted-foreground'
        )}>
          {tier}
        </span>
        <div className="flex items-center gap-2">
          {insight.isLive && <LiveBadge />}
          {insight.momentum && (
            <span className="text-[10px] font-medium text-tier-breaking">↑ {insight.momentumLabel}</span>
          )}
        </div>
      </div>

      {/* Title */}
      <p className="px-4 py-1 text-sm font-medium text-foreground leading-snug">
        {insight.title}
      </p>

      {/* Quote */}
      {insight.davidCanTell && (
        <p className="px-4 pb-2 text-[11px] text-muted-foreground italic leading-snug line-clamp-2">
          "{insight.davidCanTell}"
        </p>
      )}

      {/* Footer: refs + credibility */}
      <div className="flex items-center justify-between px-4 pb-3 pt-1 border-t border-border/50">
        <span className="text-[10px] text-muted-foreground">{insight.references} refs</span>
        <CredBar value={insight.credibility} />  {/* wider, h-1.5 */}
      </div>

      {/* Hover actions (opacity-0 → opacity-100 on group-hover) */}
      <div className="px-4 pb-3 pt-0 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={e => { e.stopPropagation(); onDiscuss(insight); }}
          className="text-[11px] font-medium text-muted-foreground hover:text-foreground 
                     border border-border rounded-md px-2.5 py-1 hover:bg-background transition-colors">
          Ask AUO →
        </button>
        <button onClick={e => { e.stopPropagation(); onOpen(insight.id); }}
          className="text-[11px] font-medium text-foreground border border-border 
                     rounded-md px-2.5 py-1 hover:bg-background transition-colors">
          Explore detail →
        </button>
      </div>
    </div>
  );
}
```

The topic block gets a left accent stripe:
- Breaking-dominant topic: `border-l-2 border-l-tier-breaking`
- Developing-dominant topic: `border-l-2 border-l-tier-developing`

### 2. Header cleanup

Before:
```
AUO  [NB 880 Pipeline] [Q2 Strategy] [Competitive Intel]    [Positions (3) ▾] [Executive ▾] [→ session_open] [reset]
```

After:
```
AUO     [NB 880 Pipeline] [Q2 Strategy] [Competitive Intel]     [Strategic ▾]  [Positions (3) ▾]
```

Dev buttons move to a fixed `bottom-right` floating panel:
```tsx
{/* Dev panel — floating, outside product UI */}
<div className="fixed bottom-4 right-4 z-50 flex gap-1 opacity-40 hover:opacity-100 transition-opacity">
  <button onClick={handleDevNext} className="px-2 py-1 text-[9px] font-mono bg-background border border-dashed border-border rounded text-muted-foreground">
    dev: {DEV_STATES[devStateIndex]}
  </button>
  <button onClick={handleDevReset} className="px-2 py-1 text-[9px] font-mono bg-background border border-dashed border-border rounded text-muted-foreground">
    reset
  </button>
</div>
```

### 3. Lens rename

In `Dashboard.tsx` and `Onboarding.tsx`, the three lens types become:

```typescript
type LensType = 'strategic' | 'balanced' | 'operational';

const LENS_LABELS = {
  strategic: 'Strategic',
  balanced: 'Balanced',
  operational: 'Operational',
};

const LENS_DESCRIPTIONS = {
  strategic: 'Weights market dynamics + macro signals first',
  balanced: 'Equal weighting across all signal categories',
  operational: 'Weights innovation + supply chain signals first',
};
```

The dropdown shows the description line in muted text under each label.

Onboarding role cards update:
- "Strategic" → "I focus on competitive and market-level decisions"
- "Balanced" → "I balance strategy with execution"
- "Operational" → "I focus on product and supply chain decisions"

LENS_CATEGORY_WEIGHT in BriefingPanel maps:
- strategic → same as current 'executive' weights
- balanced → same as current 'leader' weights
- operational → same as current 'ic' weights

### 4. PositionStarter component (new)

```tsx
// src/components/views/PositionStarter.tsx

type PositionType = 'call' | 'thesis' | 'risk';

interface PositionStarterProps {
  sourceType: 'topic' | 'insight';
  sourceName: string;
  insightCount: number;
  insightTitles: string[];
  onGenerate: (type: PositionType, context: string) => void;
  onCancel: () => void;
}
```

The component renders:
1. Header: "BUILDING POSITION FROM" + sourceName
2. Signal preview: "Based on N signals" + truncated list of insight titles
3. Position type selector (radio cards): The Call / Thesis / Risk Memo — each with a 1-line description
4. Optional context textarea: "Add context or constraints (optional)"
5. `[Generate Position →]` button — calls `onGenerate(type, context)` → triggers `rightView = 'generating'`
6. `[Cancel]` link below

In `Dashboard.tsx`, add state:
```typescript
const [positionStarter, setPositionStarter] = useState<{
  sourceType: 'topic' | 'insight';
  sourceName: string;
  insightCount: number;
  insightTitles: string[];
} | null>(null);
```

When `handleBuildPosition(topic)` is called: instead of `setRightView('generating')`, set `positionStarter` data.

The right panel renders `PositionStarter` when `positionStarter !== null` (above the generating/active states). After Generate is clicked, clears `positionStarter` and sets `rightView = 'generating'`.

### 5. "Ask AUO about this" → chat integration

When a user clicks `[Ask AUO →]` on an insight card:
1. The `onDiscuss(insight)` callback fires in Dashboard
2. Dashboard calls `appendMessage()` with a user-side message: `"Tell me about: ${insight.title}"`
3. Then after 600ms, appends an AUO response using the `PROACTIVE_BRIEFINGS` lookup (already in mock.ts) for the matching insight ID
4. This makes the conversation feel like it happened naturally from the briefing context

### 6. Onboarding empty state for right panel

The onboarding right panel already shows the "position" watermark. This is correct — no change needed. The dashboard's right panel briefing view IS the "empty state" conceptually: when a user first enters the app, they see Today's Briefing, not a blank screen. The briefing IS the starting context. No additional empty state is needed in the dashboard.

However, the briefing panel header could be more impactful. Instead of just:
```
TODAY'S BRIEFING
Feb 18 · Executive lens · 5 new since yesterday
```

Make it:
```
TODAY'S BRIEFING
Feb 18 · 5 new signals since yesterday · Strategic lens
[A one-line teaser from the most urgent breaking signal if one exists]
```

---

## Files summary

- **Create**: `src/components/views/PositionStarter.tsx`
- **Modify**: `src/pages/Dashboard.tsx` (header cleanup, lens rename, `positionStarter` state, dev panel relocation, `onDiscuss` callback)
- **Modify**: `src/pages/Onboarding.tsx` (role card copy update to Strategic/Balanced/Operational)
- **Modify**: `src/components/views/BriefingPanel.tsx` (InsightCard redesign, topic accent stripe, `onDiscuss` prop, topic header visual hierarchy)
- **Modify**: `src/components/views/TopicDetailPanel.tsx` (reuse new InsightCard)
- **Modify**: `src/components/views/InsightDetailPanel.tsx` ("Build Position" routes to PositionStarter)
- **Modify**: `src/data/mock.ts` (lens type rename, update lens messages)

## Files NOT modified

- `src/components/views/PositionPanel.tsx` — unchanged
- `src/components/views/SignalCard.tsx` — unchanged
- `src/components/views/CollapsibleSection.tsx` — unchanged
- `src/index.css` — unchanged
- `tailwind.config.ts` — unchanged
- `index.html` — unchanged
- All `src/components/ui/*` — unchanged
- `src/data/mock-position.ts` — unchanged
