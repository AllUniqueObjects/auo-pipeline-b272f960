

# Code Reuse: Extract Shared Signal Components

## Problem

`SignalDetailView.tsx` contains two useful local components -- `SignalCard` and `CollapsibleSection` -- that are NOT exported. The new `PositionPanel` needs nearly identical signal card display logic (expand/collapse, credibility bar, source links, relative time). Duplicating this code would be wasteful.

## Approach

Extract the reusable pieces into standalone files that both `SignalDetailView` and `PositionPanel` can import.

## Changes

### 1. New file: `src/components/views/SignalCard.tsx`

Extract the existing `SignalCard` function and `formatRelative` helper from `SignalDetailView.tsx` into their own file. Extend the component props to accept two optional new fields that PositionPanel needs:

- `commentCount?: number` -- renders a small count badge when > 0
- `showLiveBadge?: boolean` -- renders pulsing blue "LIVE" indicator

The base rendering (title, credibility bar, time, expand/collapse, sources) stays identical to the current implementation. The new props are additive -- `SignalDetailView` simply does not pass them, so its behavior is unchanged.

### 2. New file: `src/components/views/CollapsibleSection.tsx`

Extract the `CollapsibleSection` component. No changes needed -- it's already generic (takes label, open, onToggle, children).

### 3. Update `src/components/views/SignalDetailView.tsx`

- Remove the local `SignalCard`, `CollapsibleSection`, and `formatRelative` definitions
- Import them from the new files
- No behavioral change

### 4. New file: `src/components/views/PositionPanel.tsx`

- Import `SignalCard` and `CollapsibleSection` from the shared files
- Pass `commentCount` and `showLiveBadge` (derived from `source === 'on_demand'`) to `SignalCard`
- The signal data shape differs slightly between `MOCK_SIGNALS` (used by SignalDetailView) and `mockPosition.signals` (used by PositionPanel), so `SignalCard` will accept a generic prop type that covers both shapes -- the core fields (id, title, credibility, sources, timestamps) are the same

### Files Summary

| File | Change |
|------|--------|
| `src/components/views/SignalCard.tsx` | **New** -- extracted from SignalDetailView, plus optional `commentCount` and `showLiveBadge` props |
| `src/components/views/CollapsibleSection.tsx` | **New** -- extracted from SignalDetailView, no changes |
| `src/components/views/SignalDetailView.tsx` | Remove local definitions, import from new files |
| `src/components/views/PositionPanel.tsx` | Import and use shared `SignalCard` and `CollapsibleSection` |

This is a pure refactor for SignalDetailView (no behavior change) and enables clean reuse in PositionPanel without code duplication.

