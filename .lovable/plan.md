
# AUO Complete Rebuild — Implementation Plan

## Clarifications incorporated

All 6 clarifications from the user message are reflected explicitly in every relevant section below:

1. Role cards render as a separate block **below** the AUO message bubble, not inside it
2. Signal card clicks in `first_signals` state trigger AUO to go deeper in chat — **only** `[Complete Setup]` advances to Dashboard
3. `activeLens` is passed to `PositionPanel` as a prop (even though PositionPanel ignores it for now)
4. Lens-switch AUO message has a **300–400ms delay** before appearing
5. At least one insight in `MOCK_INSIGHTS` gets a `momentum` field (`"↑ Breaking since yesterday"`) surfaced in InsightsView
6. A `context_gap` message type is added as message 10 (after "Yes, log it" and the "Logged" response), showing AUO's profile-sharpening behavior

---

## What is NOT touched

- `src/components/views/PositionPanel.tsx` — only the prop signature changes (add `activeLens`)
- `src/data/mock-position.ts` — unchanged
- `src/components/views/SignalCard.tsx` — unchanged
- `src/components/views/CollapsibleSection.tsx` — unchanged
- `src/index.css` — unchanged
- `tailwind.config.ts` — unchanged
- `index.html` — unchanged
- All `src/components/ui/*` — unchanged

---

## Files to create / modify

| File | Action | What changes |
|---|---|---|
| `src/pages/Onboarding.tsx` | **Create** | Full 4-screen onboarding wizard |
| `src/App.tsx` | **Modify** | localStorage check → Onboarding or Dashboard |
| `src/pages/Dashboard.tsx` | **Modify** | Role Lens Switcher, dev state machine, pass lens to InsightsView, ChatView, PositionPanel |
| `src/data/mock.ts` | **Modify** | Extend MockChatMessage, update MOCK_CHAT_MESSAGES (10 msgs), add momentum to one insight, onboarding signal card mock data |
| `src/components/views/ChatView.tsx` | **Modify** | Render signalCard, showDecisionReflection, showBuildButton, context_gap question inside bubbles; onBuildPosition callback |
| `src/components/views/InsightsView.tsx` | **Modify** | activeLens prop, lens-aware sort, momentum indicator badge |
| `src/components/views/LiveSignalSurface.tsx` | **Modify** | Accept signal data as props, update title + category, "Add to position" label |
| `src/components/views/PositionPanel.tsx` | **Modify** | Add `activeLens` to props interface only (no logic change) |

---

## 1. `src/App.tsx`

Replace the login/password gate with a localStorage-based onboarding gate:

```
type AppState = 'onboarding' | 'dashboard'
```

- On mount: read `localStorage.getItem('onboardingComplete')`
- If `'true'` → set state to `'dashboard'`, read stored `activeLens` (default `'executive'`)
- Otherwise → set state to `'onboarding'`
- `Onboarding` receives `onComplete(lens)` → writes localStorage, transitions to Dashboard
- Remove Login import (Login page is still present in the file system but not routed to)
- Pass `initialLens` to Dashboard

---

## 2. `src/pages/Onboarding.tsx` (new file)

A single component with internal step state:

```
type OnboardingStep = 'welcome' | 'role_select' | 'tactical_seed' | 'scanning' | 'first_signals'
```

### Layout (all steps)
- Same two-panel split as Dashboard (55% left / 45% right)
- No workspace tabs, no lens switcher in header — just AUO logo text
- Right panel: empty state with large italic "position" watermark (Fraunces, very low opacity) + "Your positions will appear here" — static for all onboarding steps

### Step: `welcome`
- Left panel shows a single AUO message bubble (using same `MessageBubble` style as ChatView)
- AUO text: "Hi David — I'm AUO. I track signals across the athletic footwear industry and help you and your team make better decisions, faster. One quick question before we start."
- Below messages area: amber `[Let's go →]` button (standalone, not inside the input row)
- No chat input visible

### Step: `role_select`
- AUO message appended: "How would you describe your level?"
- **Below** the message bubble (clarification #1): three large role cards render as a separate block
  ```
  Executive · VP, C-Suite
  Leader · Director, Senior Manager
  Individual Contributor
  ```
- Each card: full-width, ~80px tall, border, hover state
- Clicking a card: highlights it amber, saves `selectedLens` to component state
- AUO responds (appended as new bubble): "Got it. You can switch this lens anytime from the top right — sometimes you'll want to see what an IC or leader would see too."
- After 800ms delay: chat input slides in (CSS opacity + translateY transition), step advances to `tactical_seed`

### Step: `tactical_seed`
- Chat input now visible
- AUO message appended: "What's the most pressing thing on your plate right now? Doesn't have to be complete — just whatever's top of mind."
- Placeholder: "Tell AUO what you're working on..."
- On send: transitions to `scanning`

### Step: `scanning`
- AUO shows a "Scanning..." animated dot indicator as a bubble (1.5s)
- After 1.5s: AUO responds "Vietnam sourcing, 880 v15 shelf lock, February deadline. I have fresh signals on all three right now. Let me pull what's most relevant."
- After 500ms: transitions to `first_signals`

### Step: `first_signals`
- AUO message appended: "Three breaking signals match where you're focused."
- Three inline signal cards rendered inside the AUO bubble using a compact `OnboardingSignalCard` sub-component:
  - 🔴 BREAKING · MACROECONOMICS — "Supreme Court Sets April Hearing — Vietnam FOB Window Opens" — 5 signals · 92%
  - 🔴 BREAKING · MARKET DYNAMICS — "Foot Locker Leadership Vacuum Opens 60-Day 880 v15 Shelf Lock Window" — 5 signals · 100%
  - 🟡 DEVELOPING · MARKET DYNAMICS — "Nike Wholesale Re-entry Accelerates — 880 v15 Shelf Competition Rising" — 3 signals · 78%
- "Where do you want to start?" below the cards
- Clicking a signal card (clarification #2): AUO responds in chat with a deeper analysis message — does **not** complete onboarding
- A standalone `[Complete Setup]` button below the messages area — this is the **only** thing that advances to Dashboard
- On `[Complete Setup]`: calls `onComplete(selectedLens)` → App transitions to Dashboard

### Onboarding complete banner
- A full-width dismissible banner slides down once Dashboard mounts:
  "✓ You're set up. AUO scans for new signals 3× daily. Switch your lens anytime from the top right. [×]"
- Stored in Dashboard state: `showOnboardingBanner: boolean` (true if `justCompletedOnboarding` prop is passed)

---

## 3. `src/data/mock.ts`

### Extend `MockInsight` interface
Add optional field:
```typescript
momentum?: string;  // e.g. "↑ Breaking since yesterday"
```

### Add momentum to one insight (clarification #5)
Insight `id: '1'` (Supreme Court Tariff Ruling — already tier `breaking`) gets:
```typescript
momentum: "↑ Breaking since yesterday"
```

### Extend `MockChatMessage` interface
```typescript
export interface MockChatMessage {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  signalCard?: {
    title: string;
    category: string;
    tier: 'breaking' | 'developing' | 'established';
    credibility: number;
    sources: number;
  };
  showDecisionReflection?: boolean;
  showBuildButton?: boolean;
  isContextGap?: boolean;  // renders AUO's profile-sharpening question style
}
```

### Replace `MOCK_CHAT_MESSAGES` with 10 messages
```
1. AUO: "Morning David. Two things since yesterday — Supreme Court set the April hearing date..."
2. User: "Vietnam thread."
3. AUO: "April hearing confirmed — Reuters plus two trade sources..." + signalCard (Vietnam FOB, Macroeconomics, 0.92, 3 sources)
4. User: "How certain is that window?"
5. AUO: "High confidence. Factory allocation calendars confirmed..."
6. User: "Lock it. Vietnam FOB at $18.40. Maine accelerates in parallel."
7. AUO: "Makes sense — the BOM timeline doesn't leave room to wait..." + showDecisionReflection: true
8. User: "Yes, log it."
9. AUO: "Logged. Want me to build a position from this?" + showBuildButton: true
10. AUO: "Which lines are getting the most attention from your team right now, beyond the 880 v15?" + isContextGap: true  (clarification #6)
```

---

## 4. `src/components/views/ChatView.tsx`

### New props
```typescript
interface ChatViewProps {
  onOpenSignals?: () => void;
  onBuildPosition?: () => void;  // called when [Build Position ✦] is clicked
}
```

### MessageBubble upgrades

**`signalCard` rendering** — inside the AUO message bubble, below the text content:
```
┌─────────────────────────────────────┐
│ 🔴 MACROECONOMICS                   │
│ Vietnam FOB contracts trending...   │
│ 3 sources  Credibility ███████ 92% │
└─────────────────────────────────────┘
```
Small compact card, rounded, border, same bg as the message bubble.

**`showDecisionReflection` rendering** — below message text, amber-tinted block:
```
┌── amber left border ────────────────┐
│ Decision noted: Locking Vietnam FOB │
│ at $18.40/pair for FW26, Maine      │
│ expanding in parallel.              │
└─────────────────────────────────────┘
```

**`showBuildButton` rendering** — below the message text:
```
[Build Position ✦]
```
Button styled with amber accent. On click: calls `onBuildPosition?.()`.

**`isContextGap` rendering** (clarification #6) — a subtle visual treatment to distinguish profile-sharpening questions:
- AUO bubble gets a slightly different label: "AUO · context" in small caps instead of just "AUO"
- Or simply: the message renders normally but with a thin amber dashed bottom border to signal it's a question seeking profile data
- Keep it minimal — AUO never announces it's gathering context

---

## 5. `src/pages/Dashboard.tsx`

### New state
```typescript
const [activeLens, setActiveLens] = useState<'executive' | 'leader' | 'ic'>(
  () => (localStorage.getItem('activeLens') as 'executive' | 'leader' | 'ic') || 'executive'
);
const [lensDropdownOpen, setLensDropdownOpen] = useState(false);
const [showOnboardingBanner, setShowOnboardingBanner] = useState(false);
```

### Role Lens Switcher in header
Position: between the Positions dropdown and the dev button.

```
[Executive ▾]  →  dropdown:
  ● Executive
  ○ Leader
  ○ Individual Contributor
```

On select:
1. Set `activeLens` in state
2. Write to `localStorage.setItem('activeLens', lens)`
3. After **300–400ms** (clarification #4): append a new message to `chatMessages` state in ChatView

To send a message to ChatView: lift the `messages` state from ChatView up to Dashboard (or use a callback `onAppendMessage`). The cleanest approach: ChatView accepts an `extraMessages` prop that Dashboard pushes into, or Dashboard passes an `appendMessage` callback ref. **Simplest**: move `messages` state to Dashboard, pass it as a prop to ChatView along with an `onAppendMessage` setter. ChatView uses the passed array + local new messages from input.

Lens message content:
- Executive: "Switched to Executive lens. Market Dynamics and Macroeconomics signals are weighted first."
- Leader: "Switched to Leader lens. Signals are reweighted — you'll see more balance across categories now."
- IC: "Switched to Individual Contributor lens. Innovation and operational signals are weighted first."

### Dev state machine (replaces single Zap button)
Two small mono dashed-border buttons:
- `[→ next]`: cycles through daily-use states: `session_open → signals_overlay → exploring → live_signal → decision_reflected → building → position_active → signal_expanded → panel_collapsed`
- `[reset]`: `localStorage.clear()` + `window.location.reload()`

Daily-use state machine drives:
- `session_open`: default Dashboard state (chat loaded, position active)
- `signals_overlay`: `signalsOpen = true`
- `live_signal`: LiveSignalSurface visible (pass a `showLiveSignal` prop to ChatView)
- `building`: `positionState = 'generating'`
- `position_active`: `positionState = 'active'`
- `panel_collapsed`: `positionCollapsed = true`

### Updated prop passing
```tsx
<ChatView
  onOpenSignals={...}
  onBuildPosition={() => setPositionState('generating')}
  messages={messages}
  onAppendMessage={(msg) => setMessages(prev => [...prev, msg])}
/>

<InsightsView
  onSelectInsight={...}
  activeProject={activeProject}
  activeLens={activeLens}
/>

<PositionPanel
  state={positionState}
  position={...}
  collapsed={positionCollapsed}
  onToggleCollapse={...}
  activeLens={activeLens}   // clarification #3 — connected but unused in PositionPanel for now
/>
```

### Onboarding banner (if `justCompleted` prop passed from App)
```tsx
{showOnboardingBanner && (
  <div className="w-full bg-card border-b border-border px-5 py-2 flex items-center justify-between text-sm text-foreground">
    <span>✓ You're set up. AUO scans for new signals 3× daily. Switch your lens anytime from the top right.</span>
    <button onClick={() => setShowOnboardingBanner(false)}><X className="h-3.5 w-3.5" /></button>
  </div>
)}
```

---

## 6. `src/components/views/InsightsView.tsx`

### New prop
```typescript
interface InsightsViewProps {
  onSelectInsight: (insightId: string) => void;
  selectedInsightId?: string;
  activeProject?: string;
  activeLens?: 'executive' | 'leader' | 'ic';
}
```

### Lens-aware group sort
Current sort: breaking-containing groups first. Extend to also apply lens weighting:

```typescript
const LENS_CATEGORY_WEIGHT: Record<string, Record<string, number>> = {
  executive: {
    'RETAIL SHELF COMPETITION': 0,
    'VIETNAM MANUFACTURING SQUEEZE': 1,
    'COMPETITIVE TECHNOLOGY': 2,
  },
  ic: {
    'COMPETITIVE TECHNOLOGY': 0,
    'VIETNAM MANUFACTURING SQUEEZE': 1,
    'RETAIL SHELF COMPETITION': 2,
  },
  leader: {}, // equal — fall back to tier-based sort
};
```

The sort combines tier priority (breaking=0, developing=1, established=2) with lens weight as a tiebreaker.

### Momentum indicator badge (clarification #5)
In each insight card, after the `signal_count · refs` line, render conditionally:
```tsx
{insight.momentum && (
  <span className="text-[10px] font-medium text-tier-breaking flex items-center gap-0.5 mt-0.5">
    {insight.momentum}
  </span>
)}
```
This appears on insight `id: '1'` with `"↑ Breaking since yesterday"`.

---

## 7. `src/components/views/LiveSignalSurface.tsx`

Accept signal data as props (so Dashboard can control what's shown):

```typescript
interface LiveSignalData {
  title: string;
  category: string;
}

interface LiveSignalSurfaceProps {
  signal?: LiveSignalData;
  onAdd?: () => void;
  onDismiss?: () => void;
}
```

Default signal if none passed: `{ title: "Nike Wholesale Strategy Update Q1 2026", category: "Market Dynamics" }` (spec value).

Update "Add" button label to "Add to position" (full text).

Add category badge next to the LIVE pill:
```
💡 LIVE  [Market Dynamics]  Nike Wholesale Strategy Update Q1 2026
```

---

## 8. `src/components/views/PositionPanel.tsx`

Prop signature only — add `activeLens` (clarification #3):

```typescript
interface PositionPanelProps {
  state: PositionState;
  position: PositionData | null;
  collapsed: boolean;
  onToggleCollapse: () => void;
  activeLens?: 'executive' | 'leader' | 'ic';  // connected, not used yet
}
```

No logic changes inside the component.

---

## State flow summary

```text
App mounts
  └─ localStorage.onboardingComplete === 'true'?
       YES → Dashboard (with stored activeLens)
       NO  → Onboarding

Onboarding steps:
  welcome → role_select → tactical_seed → scanning → first_signals
  [Complete Setup] → App.onComplete(lens) → Dashboard

Dashboard:
  Lens Switcher selects lens
  └─ 300-400ms → AUO message appended to chat
  └─ InsightsView re-sorts immediately

Dev [reset] → localStorage.clear() + reload → Onboarding welcome
```

---

## Key technical decisions

- **Messages state lifted to Dashboard** — needed so the lens-switch AUO message can be appended from Dashboard without going through ChatView internals. ChatView receives `messages` + `onSendMessage` (adds user msg) as props, handles only UI + sending. The MOCK_CHAT_MESSAGES array initializes the state in Dashboard.
- **Onboarding internal step state** — no routing library; pure React `useState`. CSS transitions on the input appearing (`opacity-0 translate-y-2 → opacity-100 translate-y-0`).
- **300-400ms lens delay** (clarification #4) — `setTimeout(350, () => appendMessage(...))` inside the lens select handler in Dashboard.
- **Role cards below the bubble** (clarification #1) — `Onboarding.tsx` renders the AUO messages list, then separately renders a `<RoleCards>` block when `step === 'role_select'` and role not yet chosen.
- **Signal click in first_signals** (clarification #2) — clicking a card calls a local `handleSignalCardClick(card)` that appends an AUO "going deeper" message to the onboarding message list. `[Complete Setup]` is the only exit.
- **Context gap style** (clarification #6) — `isContextGap` messages render with a subtle amber `•` prefix on the "AUO" label to differentiate them visually from analytical responses. One-character change, no extra layout.
- All transitions CSS only — no Framer Motion.
