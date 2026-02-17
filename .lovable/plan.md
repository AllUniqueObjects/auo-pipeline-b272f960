

# Mock Frontend UI Flow -- Implementation Plan

## What We're Building

A simple split layout with persistent chat on the left, dynamic content on the right, and a clean Read-Think-Act flow in Signal Detail.

## Layout

```text
+----------------------------------------------------------+
|  [AUO]   [NB 880 Pipeline] [Q2 Strategy] [Competitive]   |
+-------------------+--------------------------------------+
|                   |                                      |
|  Chat with AUO    |  Insights / Signal Detail /          |
|  (always here)    |  Share Wizard / Thread               |
|                   |                                      |
|  [expandable      |                                      |
|   textarea input] |                                      |
+-------------------+--------------------------------------+
```

## Right Panel Flow

```text
Insights --> Signal Detail --> Share Wizard --> Thread
                (read)
              (think: Your Take -- always visible)
                (act: Share This button at bottom)
```

Back button steps one level up at each stage.

## Changes by File

### 1. Dashboard.tsx -- Rewrite to split layout

- Left panel: `w-[340px] border-r`, always renders `ChatView`
- Right panel: `flex-1`, controlled by `rightView` state (`'insights' | 'signal-detail' | 'share' | 'thread'`)
- Default right panel view: Insights list
- Header: AUO logo + 3 mock project pills + back button when deeper than insights
- Mobile (`useIsMobile()`): single panel toggle between left and right
- Keep existing `investigationNote` state management here, pass to child views

### 2. ChatView.tsx -- Sidebar adaptation + expandable input

- Remove `max-w-2xl mx-auto` from messages and input containers
- Replace `<input>` with auto-expanding `<textarea>`:
  - `rows={1}`, auto-grows via `scrollHeight` measurement up to ~120px (5 lines)
  - Resets to single line on send
  - Small collapse/expand toggle button (ChevronDown/ChevronUp) next to send
  - `Shift+Enter` for newline, `Enter` to send
  - `items-end` on the flex row so send button stays bottom-aligned

### 3. InsightsView.tsx -- Clean up for right panel

- Remove `pb-14` (no more ChatBar overlay)
- Remove `max-w-5xl mx-auto`
- Add optional `selectedInsightId` prop with active card highlight (`bg-accent/50`)

### 4. SignalDetailView.tsx -- Read-Think-Act flow

- Remove "Share This" button from hero section (lines 74-82)
- Remove `showYourTake` state and collapsible toggle -- Your Take section is always visible (no click to expand)
- Keep Pencil icon + "Your Take" heading as a label, remove chevron
- Add full-width primary "Share This" button at the very bottom, below Your Take
- Dynamic subtitle: "Your reasoning will be included" vs "Add your take above to share with context"
- Remove `pb-20` and `max-w-3xl mx-auto`

### 5. ShareWizardView.tsx -- Minor cleanup

- Remove `pb-20` and `max-w-2xl mx-auto`

### 6. ThreadView.tsx -- Minor cleanup

- Remove `pb-20` if present
- Its existing internal split (400px discussion + flex-1 evidence) works inside the right panel

### 7. ChatBar.tsx -- Delete

No longer needed. Chat lives permanently in the left panel.

### 8. mock.ts -- Add MOCK_PROJECTS

```text
3 items: "NB 880 Pipeline", "Q2 Strategy", "Competitive Intel"
```

## Files Summary

| File | Action |
|------|--------|
| `src/pages/Dashboard.tsx` | Rewrite to split layout |
| `src/components/views/ChatView.tsx` | Remove centering, expandable textarea input |
| `src/components/views/InsightsView.tsx` | Remove padding/max-width, add active state |
| `src/components/views/SignalDetailView.tsx` | Always-visible Your Take, bottom Share CTA, remove top Share button |
| `src/components/views/ShareWizardView.tsx` | Remove padding/max-width |
| `src/components/views/ThreadView.tsx` | Remove padding if needed |
| `src/components/views/ChatBar.tsx` | Delete |
| `src/data/mock.ts` | Add MOCK_PROJECTS |

No new dependencies.

