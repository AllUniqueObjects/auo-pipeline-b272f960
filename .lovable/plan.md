
# Fix Context Graph Rendering

## Root Cause Analysis

After investigating the code, database, and network requests, I've identified **why the graph appears broken**:

### Problem 1: Force Simulation Runs Before Rendering
The current code runs `for (i=0; i<300; i++) simulation.tick()` synchronously, then immediately stops the simulation. However, the tick handler that updates node positions only fires during the simulation's natural event loop, not during the manual `tick()` calls. This means nodes may have calculated positions but they're never properly applied to the SVG elements.

### Problem 2: Initial Position Calculation Issues
The nodes are initialized with positions based on cluster centers, but:
- The cluster center calculation depends on `dimensions.width` and `dimensions.height`
- If these values are captured before the container fully expands, all calculations are off
- The 100ms timeout may not be sufficient for complex layouts

### Problem 3: Labels Are Drawing But Nodes Are Not Visible
The screenshot shows "CLUSTER 1" and "CLUSTER 2" labels, meaning:
- Clusters ARE being processed
- The D3 code IS running
- But the nodes are likely all positioned at (0,0) or clustered in a tiny area (visible as a small dark triangle in the top-left)

## Solution

Rewrite the SignalGraph component with proper D3 force simulation handling:

### Technical Changes

1. **Fix the simulation tick loop**: Instead of running 300 ticks manually and stopping, run the simulation and update positions on EACH tick using the `simulation.on('tick', ...)` callback. Only stop after the simulation has naturally cooled down.

2. **Ensure positions are applied synchronously**: After the manual tick loop, explicitly update all element positions before rendering labels.

3. **Add better dimension validation**: Don't start rendering until container dimensions are truly stable and reasonable (e.g., at least 400x300).

4. **Use getBoundingClientRect() instead of clientWidth/clientHeight**: This is more reliable across different rendering scenarios.

5. **Add debug logging (temporarily)**: Log node positions after simulation to verify they're being calculated.

### Files to Modify

- `src/components/signals/SignalGraph.tsx` - Rewrite the D3 force simulation with proper tick handling

### Specific Code Changes

The key fix is in how the simulation tick is handled:

```text
Current (broken):
  for (let i = 0; i < 300; i++) {
    simulation.tick();
  }
  simulation.stop();
  // Positions are calculated but elements aren't updated

Fixed:
  simulation.on('tick', () => {
    // Update element positions on every tick
    linkElements.attr('x1', ...).attr('y1', ...)...
    nodeElements.attr('cx', ...).attr('cy', ...)...
  });
  
  // Run ticks manually
  for (let i = 0; i < 300; i++) {
    simulation.tick();
  }
  simulation.stop();
  
  // Force one final position update
  linkElements.attr('x1', ...)...
  nodeElements.attr('cx', ...)...
```

The issue is that `simulation.on('tick', ...)` only registers an event listener - it doesn't automatically call it during manual `tick()` calls. We need to manually trigger the position updates after the loop.

### Additional Improvements

1. **Increase initial cluster center spacing**: Use a larger radius (0.35 instead of 0.3 of viewport) to give clusters more room
2. **Add fallback node radius**: Ensure minimum 8px radius even if `source_urls` is null/empty
3. **Validate node positions**: After simulation, check if all nodes have valid x/y values, if not recalculate
4. **Make the container explicitly sized**: Use explicit `width: 100%; height: 100%` on the SVG with a known parent height

## Expected Result

After these fixes:
- 21 signal nodes will spread across the viewport
- 3 distinct clusters will form spatial groupings (Cluster 1, 2, 3)
- 171 signal edges will render as connection lines between related nodes
- Cluster labels will appear above their respective node groups
- Hover interactions will highlight connected nodes
