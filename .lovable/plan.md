

# Fix Graph Container Height

## Root Cause Identified

The console logs confirm the issue:
- Container width: **1148px** (good)
- Container height: **150px** (too small - needs at least 200px)

The graph isn't rendering because the height check (`height < 200`) keeps failing.

## Why the Container is Only 150px Tall

Looking at `src/pages/Signals.tsx`, there's a CSS conflict in the graph area layout:

```text
Line 134: <div className="flex-1 min-h-0 p-10">
Line 135:   <div className="w-full h-full" style={{ minHeight: 'calc(100vh - 160px)' }}>
```

The issues:
1. `min-h-0` on line 134 prevents the flex child from naturally expanding
2. `h-full` on line 135 tries to be 100% of parent height, but the parent has no explicit height
3. The `minHeight` style is on the wrong element - it should be on the flex child, not the inner div

## Solution

Restructure the container hierarchy so the graph area properly fills the viewport:

### File: `src/pages/Signals.tsx`

**Change 1**: Remove `min-h-0` and add explicit height to the graph area wrapper

```tsx
// Line 134: Change from:
<div className="flex-1 min-h-0 p-10">

// To:
<div className="flex-1 p-10" style={{ minHeight: 'calc(100vh - 160px)' }}>
```

**Change 2**: Update the inner div to fill its parent

```tsx
// Line 135: Change from:
<div className="w-full h-full" style={{ minHeight: 'calc(100vh - 160px)' }}>

// To:
<div className="w-full h-full">
```

This moves the `minHeight` to the correct parent element and removes the conflicting `min-h-0` class.

### File: `src/components/signals/SignalGraph.tsx`

**Change 3**: Lower the height threshold from 200px to 100px to be more permissive

```tsx
// Line 132: Change from:
if (dimensions.width < 200 || dimensions.height < 200) {

// To:
if (dimensions.width < 100 || dimensions.height < 100) {
```

## Expected Result

After these fixes:
- Container height will expand to fill viewport minus header (~600-800px)
- Graph will pass dimension checks and render all 21 signal nodes
- Cluster labels and connection lines will display properly

