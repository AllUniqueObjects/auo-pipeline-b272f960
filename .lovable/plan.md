
# Redesign Signal Graph: Professional Cluster Separation

## Overview

Transform the cramped, overlapping graph into an elegantly spaced visualization where each cluster occupies its own visual territory, labels are clearly readable, and the canvas is properly utilized.

## Design Goals

1. Clear visual separation between clusters (minimum 150px gap)
2. Proper canvas utilization (60-70% of viewport)
3. Non-overlapping, legible cluster labels
4. Refined node sizing with better visual hierarchy
5. Subtle cluster "halos" to reinforce grouping

---

## Technical Changes

### File: `src/components/signals/SignalGraph.tsx`

**Change 1: Increase Cluster Separation Radius**

Increase the initial cluster placement radius from 35% to 50% of the smaller viewport dimension, and add intelligent positioning based on cluster count.

```tsx
// Line 217-225 - Replace cluster center calculation
// FROM:
const clusterRadius = Math.min(width, height) * 0.35;

// TO:
const clusterRadius = Math.min(width, height) * 0.32;
const baseSpacing = Math.max(120, width / (clusterCount + 1));
```

For 3 clusters, position them in a triangle formation with wider spacing.

**Change 2: Weaken Centering Force**

Reduce the center force to prevent clusters from collapsing inward.

```tsx
// Line 262 - Reduce center force strength
// FROM:
.force('center', d3.forceCenter(centerX, centerY).strength(0.05))

// TO:
.force('center', d3.forceCenter(centerX, centerY).strength(0.01))
```

**Change 3: Increase Link Distance**

Expand the minimum distance between linked nodes.

```tsx
// Line 270 - Increase link distance
// FROM:
.distance(40)

// TO:
.distance(60)
```

**Change 4: Add Cluster Repulsion Force**

Create a force that pushes different clusters apart while keeping same-cluster nodes together.

```tsx
// Add after line 257 (after clusterForce function)
function clusterRepulsion(alpha: number) {
  const strength = 0.4;
  clusters.forEach((clusterA, i) => {
    clusters.forEach((clusterB, j) => {
      if (i >= j) return;
      
      const centerA = clusterCenters.get(clusterA.id);
      const centerB = clusterCenters.get(clusterB.id);
      if (!centerA || !centerB) return;
      
      const nodesA = nodes.filter(n => n.cluster?.id === clusterA.id);
      const nodesB = nodes.filter(n => n.cluster?.id === clusterB.id);
      
      // Calculate cluster centroids
      const avgA = { x: 0, y: 0, count: 0 };
      const avgB = { x: 0, y: 0, count: 0 };
      
      nodesA.forEach(n => { 
        avgA.x += n.x || 0; 
        avgA.y += n.y || 0; 
        avgA.count++; 
      });
      nodesB.forEach(n => { 
        avgB.x += n.x || 0; 
        avgB.y += n.y || 0; 
        avgB.count++; 
      });
      
      if (avgA.count && avgB.count) {
        avgA.x /= avgA.count;
        avgA.y /= avgA.count;
        avgB.x /= avgB.count;
        avgB.y /= avgB.count;
        
        const dx = avgB.x - avgA.x;
        const dy = avgB.y - avgA.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const minDist = 180;
        
        if (dist < minDist) {
          const push = (minDist - dist) * alpha * strength;
          const pushX = (dx / dist) * push;
          const pushY = (dy / dist) * push;
          
          nodesA.forEach(n => {
            n.vx = (n.vx || 0) - pushX / 2;
            n.vy = (n.vy || 0) - pushY / 2;
          });
          nodesB.forEach(n => {
            n.vx = (n.vx || 0) + pushX / 2;
            n.vy = (n.vy || 0) + pushY / 2;
          });
        }
      }
    });
  });
}
```

Register this force in the simulation:

```tsx
// Line 273 - Add clusterRepulsion to simulation
.force('clusterRepulsion', clusterRepulsion)
```

**Change 5: Enhanced Node Sizing**

Make node size differences more pronounced.

```tsx
// Lines 47-52 - Update getNodeRadius function
// FROM:
if (sourceCount >= 9) return 14;
if (sourceCount >= 6) return 11;
return 8;

// TO:
if (sourceCount >= 9) return 18;
if (sourceCount >= 6) return 14;
if (sourceCount >= 3) return 10;
return 7;
```

**Change 6: Smarter Label Positioning**

Calculate label positions based on cluster node positions after simulation, with collision avoidance.

```tsx
// Lines 384-425 - Replace cluster label rendering
// Position labels outside the node cloud, avoiding overlaps
const labelPositions: Array<{id: string; x: number; y: number}> = [];

clusters.forEach((cluster) => {
  const clusterNodes = nodes.filter((n) => n.cluster?.id === cluster.id);
  if (clusterNodes.length === 0) return;

  const xs = clusterNodes.map((n) => n.x || 0);
  const ys = clusterNodes.map((n) => n.y || 0);
  const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
  const minY = Math.min(...ys);
  
  // Calculate label position above the cluster
  let labelY = minY - 35;
  let labelX = centerX;
  
  // Simple collision check with existing labels
  labelPositions.forEach(pos => {
    const dx = Math.abs(pos.x - labelX);
    const dy = Math.abs(pos.y - labelY);
    if (dx < 80 && dy < 30) {
      labelY -= 25; // Push this label up if too close
    }
  });
  
  labelPositions.push({ id: cluster.id, x: labelX, y: labelY });
  
  const color = clusterColorMap.get(cluster.id) || '#6b6b7b';

  labelsGroup
    .append('text')
    .attr('x', labelX)
    .attr('y', labelY)
    .attr('text-anchor', 'middle')
    .attr('fill', hexToRgba(color, 0.8))
    .style('font-size', '11px')
    .style('font-weight', '500')
    .style('text-transform', 'uppercase')
    .style('letter-spacing', '0.12em')
    .text(cluster.name);
});
```

---

## Expected Visual Result

After these changes:

1. **3 distinct cluster zones** - Each cluster will occupy its own region of the canvas
2. **~180px minimum gap** between cluster centroids
3. **60-70% canvas utilization** - The graph expands to fill available space
4. **Non-overlapping labels** - Cluster names positioned with collision detection
5. **Clear node hierarchy** - 7/10/14/18px sizes create visual importance levels

The visualization will feel more like a professional data dashboard and less like a compressed blob.
