

# Unified Flow: Signal to Share (Mock UI)

## Overview

Implement the 3-step speed-first flow entirely with mock data and frontend UI. No backend changes. The goal: David taps an insight card, investigates it (with inline note-taking), and shares it -- all as one connected journey.

## What Changes

### 1. Add "Your Take" panel to Signal Detail

In `SignalDetailView.tsx`, add a collapsible section below the evidence area where David can write his reasoning inline while investigating signals.

- Collapsible "Your Take" section with:
  - Textarea: "What's your read on this?" (free-text reasoning)
  - Editable assumption bullets (hardcoded 2-3 starter assumptions with checkboxes)
  - One-line "Recommended Action" text input
- "Share This" button in the hero section (next to tier badge) that navigates to Share view
- State stored in component-level `useState` (no persistence needed for mock)

### 2. Create lightweight mock notes store

New file `src/data/mock-positions.ts`:

- `InvestigationNote` interface: `{ insightId, userNotes, assumptions: {text, checked}[], recommendedAction }`
- No pre-filled data -- just the type definition and a simple in-memory map helper
- Export a `useInvestigationNote(insightId)` custom hook that returns `[note, setNote]` using `useState`

### 3. Wire Share Wizard to include user reasoning

Update `ShareWizardView.tsx`:

- Accept optional `userNotes`, `assumptions`, `recommendedAction` props
- In the Review step, the generated message text includes a "David's Take" section with the user's reasoning, checked assumptions, and recommended action (when provided)
- If no notes were written, the message stays as-is (current behavior)

### 4. Wire Thread to show user reasoning in right panel

Update `ThreadView.tsx`:

- Accept optional `userNotes`, `assumptions`, `recommendedAction` props
- Add a "Shared Position" card at the top of the right panel (above the existing decision title) showing David's reasoning, assumptions, and recommended action
- If no notes exist, the right panel renders exactly as it does today

### 5. Update Dashboard navigation to pass notes through

Update `Dashboard.tsx`:

- Add `investigationNote` state at the Dashboard level
- Pass `onUpdateNote` callback to `SignalDetailView` so notes are stored
- Pass note data to `ShareWizardView` and `ThreadView`
- Pass `onShare` callback to `SignalDetailView` that navigates to the Share view

### 6. Context-aware ChatBar

Update `ChatBar.tsx`:

- Accept optional `contextInsightId` prop
- When set, update placeholder to reference the insight topic (e.g., "Ask about Vietnam FOB situation...")
- No functional change to chat logic -- just a visual hint

## File Summary

| File | Action |
|------|--------|
| `src/data/mock-positions.ts` | Create -- `InvestigationNote` type |
| `src/components/views/SignalDetailView.tsx` | Edit -- Add "Your Take" panel + "Share This" button |
| `src/components/views/ShareWizardView.tsx` | Edit -- Include user notes in generated message |
| `src/components/views/ThreadView.tsx` | Edit -- Show shared position card in right panel |
| `src/pages/Dashboard.tsx` | Edit -- Manage note state, wire props between views |
| `src/components/views/ChatBar.tsx` | Edit -- Context-aware placeholder |

## What Stays the Same

- InsightsView (no changes)
- All mock data in `src/data/mock.ts` and `src/data/mock-threads.ts`
- Light theme CSS
- All existing signal detail layout and styling
- Chat view (main AUO chat)

