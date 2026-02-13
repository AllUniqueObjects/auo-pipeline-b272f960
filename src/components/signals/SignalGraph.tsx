import { useRef, useEffect, useState, useCallback } from 'react';
import * as d3 from 'd3';
import type { ClusterWithColor, Signal, SignalEdge } from '@/hooks/useSignalGraphData';

interface SignalGraphProps {
  clusters: ClusterWithColor[];
  standaloneSignals: Signal[];
  signalEdges: SignalEdge[];
  onSelectSignal: (signal: Signal, cluster: ClusterWithColor | null) => void;
}

interface NodeData {
  id: string;
  signal: Signal;
  cluster: ClusterWithColor | null;
  radius: number;
  isUrgent: boolean;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

interface LinkData {
  source: string | NodeData;
  target: string | NodeData;
  similarity: number;
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  signal: Signal | null;
}

const clusterPalette = [
  { name: 'coral', color: '#f4a3a0' },
  { name: 'lavender', color: '#b4a7d6' },
  { name: 'sage', color: '#a8d5ba' },
  { name: 'gold', color: '#e8d5a3' },
  { name: 'slate', color: '#a0aabe' },
];

function getNodeRadius(signal: Signal): number {
  const sourceCount = signal.sources || 0;
  if (sourceCount >= 9) return 18;
  if (sourceCount >= 6) return 14;
  if (sourceCount >= 3) return 10;
  return 7;
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function SignalGraph({
  clusters,
  standaloneSignals,
  signalEdges,
  onSelectSignal,
}: SignalGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    signal: null,
  });

  // Track container dimensions using getBoundingClientRect for reliability
  useEffect(() => {
    if (!containerRef.current) return;
    
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        console.log('[SignalGraph] Container rect:', rect.width, rect.height);
        // Accept any reasonable size
        if (rect.width > 0 && rect.height > 0) {
          setDimensions({ width: rect.width, height: rect.height });
        }
      }
    };

    // Initial measurement after layout settles
    const timeout = setTimeout(updateDimensions, 150);
    
    // ResizeObserver for responsive updates
    const observer = new ResizeObserver(() => {
      requestAnimationFrame(updateDimensions);
    });
    observer.observe(containerRef.current);

    return () => {
      clearTimeout(timeout);
      observer.disconnect();
    };
  }, []);

  // Build adjacency map for quick lookup
  const adjacencyMap = useRef<Map<string, Set<string>>>(new Map());
  
  useEffect(() => {
    const map = new Map<string, Set<string>>();
    signalEdges.forEach((edge) => {
      if (!map.has(edge.signal_a)) map.set(edge.signal_a, new Set());
      if (!map.has(edge.signal_b)) map.set(edge.signal_b, new Set());
      map.get(edge.signal_a)!.add(edge.signal_b);
      map.get(edge.signal_b)!.add(edge.signal_a);
    });
    adjacencyMap.current = map;
  }, [signalEdges]);

  const handleNodeHover = useCallback((nodeId: string | null, x: number, y: number, signal: Signal | null) => {
    setTooltip({
      visible: !!nodeId,
      x,
      y,
      signal,
    });
  }, []);

  useEffect(() => {
    if (!svgRef.current) return;
    if (clusters.length === 0 && standaloneSignals.length === 0) return;
    // Wait for valid dimensions (lowered threshold for smaller viewports)
    if (dimensions.width < 100 || dimensions.height < 100) {
      console.log('[SignalGraph] Waiting for dimensions:', dimensions);
      return;
    }
    console.log('[SignalGraph] Rendering with dimensions:', dimensions, 'clusters:', clusters.length, 'signals:', standaloneSignals.length);

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = dimensions.width;
    const height = dimensions.height;
    const centerX = width / 2;
    const centerY = height / 2;

    svg.attr('width', width).attr('height', height).attr('viewBox', `0 0 ${width} ${height}`);

    // Assign colors to clusters
    const clusterColorMap = new Map<string, string>();
    clusters.forEach((cluster, i) => {
      clusterColorMap.set(cluster.id, clusterPalette[i % clusterPalette.length].color);
    });

    // Build nodes
    const nodes: NodeData[] = [];

    clusters.forEach((cluster) => {
      cluster.signals.forEach((signal) => {
        nodes.push({
          id: signal.id,
          signal,
          cluster,
          radius: getNodeRadius(signal),
          isUrgent: signal.urgency === 'urgent',
        });
      });
    });

    standaloneSignals.forEach((signal) => {
      nodes.push({
        id: signal.id,
        signal,
        cluster: null,
        radius: getNodeRadius(signal),
        isUrgent: signal.urgency === 'urgent',
      });
    });

    // Build links from signal_edges
    const nodeIdSet = new Set(nodes.map((n) => n.id));
    const links: LinkData[] = signalEdges
      .filter((edge) => nodeIdSet.has(edge.signal_a) && nodeIdSet.has(edge.signal_b))
      .map((edge) => ({
        source: edge.signal_a,
        target: edge.signal_b,
        similarity: edge.similarity,
      }));

    // Also create intra-cluster links to keep cluster nodes together
    const clusterLinks: LinkData[] = [];
    clusters.forEach((cluster) => {
      const clusterSignalIds = cluster.signals.map((s) => s.id);
      for (let i = 0; i < clusterSignalIds.length; i++) {
        for (let j = i + 1; j < clusterSignalIds.length; j++) {
          // Only add if not already in links
          const exists = links.some(
            (l) =>
              (l.source === clusterSignalIds[i] && l.target === clusterSignalIds[j]) ||
              (l.source === clusterSignalIds[j] && l.target === clusterSignalIds[i])
          );
          if (!exists) {
            clusterLinks.push({
              source: clusterSignalIds[i],
              target: clusterSignalIds[j],
              similarity: 0.3, // Low similarity for cluster cohesion links
            });
          }
        }
      }
    });

    // Calculate initial cluster center positions with wider spacing
    const clusterCenters = new Map<string, { x: number; y: number }>();
    const clusterCount = clusters.length;
    const clusterRadius = Math.min(width, height) * 0.38;
    
    clusters.forEach((cluster, i) => {
      const angle = (2 * Math.PI * i) / clusterCount - Math.PI / 2;
      clusterCenters.set(cluster.id, {
        x: centerX + clusterRadius * Math.cos(angle),
        y: centerY + clusterRadius * Math.sin(angle),
      });
    });

    // Initialize node positions near their cluster centers
    nodes.forEach((node) => {
      if (node.cluster) {
        const center = clusterCenters.get(node.cluster.id);
        if (center) {
          node.x = center.x + (Math.random() - 0.5) * 100;
          node.y = center.y + (Math.random() - 0.5) * 100;
        }
      } else {
        // Standalone: random position at periphery
        const angle = Math.random() * 2 * Math.PI;
        const r = Math.min(width, height) * 0.4;
        node.x = centerX + r * Math.cos(angle);
        node.y = centerY + r * Math.sin(angle);
      }
    });

    // Custom cluster force
    function clusterForce(alpha: number) {
      nodes.forEach((node) => {
        if (node.cluster) {
          const center = clusterCenters.get(node.cluster.id);
          if (center && node.x !== undefined && node.y !== undefined) {
            const dx = center.x - node.x;
            const dy = center.y - node.y;
            node.vx = (node.vx || 0) + dx * alpha * 0.15;
            node.vy = (node.vy || 0) + dy * alpha * 0.15;
          }
        }
      });
    }

    // Cluster repulsion force - pushes different clusters apart
    function clusterRepulsion(alpha: number) {
      const strength = 0.4;
      clusters.forEach((clusterA, i) => {
        clusters.forEach((clusterB, j) => {
          if (i >= j) return;
          
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

    // Create simulation
    const simulation = d3
      .forceSimulation(nodes)
      .force('center', d3.forceCenter(centerX, centerY).strength(0.01))
      .force('charge', d3.forceManyBody().strength(-180))
      .force('collide', d3.forceCollide<NodeData>((d) => d.radius + 12))
      .force(
        'link',
        d3
          .forceLink<NodeData, LinkData>([...links, ...clusterLinks])
          .id((d) => d.id)
          .distance(60)
          .strength(0.6)
      )
      .force('cluster', clusterForce)
      .force('clusterRepulsion', clusterRepulsion)
      .alphaDecay(0.02);

    // Create container groups
    const linksGroup = svg.append('g').attr('class', 'links');
    const nodesGroup = svg.append('g').attr('class', 'nodes');
    const labelsGroup = svg.append('g').attr('class', 'labels');

    // Draw edge links (only visible edges from signal_edges, not cluster cohesion links)
    const linkElements = linksGroup
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', (d) => `rgba(255, 255, 255, ${Math.max(d.similarity * 0.3, 0.1)})`)
      .attr('stroke-width', 1)
      .attr('class', 'edge-line');

    // Draw nodes
    const nodeElements = nodesGroup
      .selectAll('circle')
      .data(nodes)
      .enter()
      .append('circle')
      .attr('r', (d) => d.radius)
      .attr('fill', (d) => {
        if (!d.cluster) return 'rgba(107, 107, 123, 0.5)';
        const color = clusterColorMap.get(d.cluster.id) || '#6b6b7b';
        return hexToRgba(color, 0.7);
      })
      .attr('stroke', (d) => {
        if (!d.cluster) return 'rgba(107, 107, 123, 0.7)';
        const color = clusterColorMap.get(d.cluster.id) || '#6b6b7b';
        return hexToRgba(color, 0.9);
      })
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .style('transition', 'opacity 150ms ease')
      .classed('urgent-pulse', (d) => d.isUrgent);

    // Add hover and click handlers
    nodeElements
      .on('mouseenter', function (event, d) {
        const nodeX = d.x || 0;
        const nodeY = d.y || 0;
        handleNodeHover(d.id, nodeX, nodeY - 20, d.signal);
        
        // Scale this node
        d3.select(this).attr('r', d.radius * 1.3);
        
        // Get connected nodes
        const connected = adjacencyMap.current.get(d.id) || new Set();
        
        // Dim non-connected nodes, highlight connected
        nodeElements.style('opacity', (n) => {
          if (n.id === d.id) return d.isUrgent ? 0.7 : 1;
          if (connected.has(n.id)) return 0.8;
          return 0.15;
        });
        
        // Highlight connected edges
        linkElements
          .attr('stroke', (l) => {
            const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
            const targetId = typeof l.target === 'object' ? l.target.id : l.target;
            if (sourceId === d.id || targetId === d.id) {
              return 'rgba(255, 255, 255, 0.4)';
            }
            return `rgba(255, 255, 255, ${l.similarity * 0.15})`;
          });
      })
      .on('mouseleave', function (event, d) {
        handleNodeHover(null, 0, 0, null);
        
        // Reset radius
        d3.select(this).attr('r', d.radius);
        
        // Reset all nodes
        nodeElements.style('opacity', (n) => n.isUrgent ? 0.7 : 1);
        
        // Reset edges
        linkElements.attr('stroke', (l) => `rgba(255, 255, 255, ${l.similarity * 0.15})`);
      })
      .on('click', (event, d) => {
        onSelectSignal(d.signal, d.cluster);
      });

    // Helper function to update all positions
    const updatePositions = () => {
      linkElements
        .attr('x1', (d) => (typeof d.source === 'object' ? d.source.x : 0) || 0)
        .attr('y1', (d) => (typeof d.source === 'object' ? d.source.y : 0) || 0)
        .attr('x2', (d) => (typeof d.target === 'object' ? d.target.x : 0) || 0)
        .attr('y2', (d) => (typeof d.target === 'object' ? d.target.y : 0) || 0);

      nodeElements.attr('cx', (d) => d.x || 0).attr('cy', (d) => d.y || 0);
    };

    // Register tick handler (for interactive updates if needed later)
    simulation.on('tick', updatePositions);

    // Run simulation for 300 ticks
    for (let i = 0; i < 300; i++) {
      simulation.tick();
    }
    simulation.stop();

    // CRITICAL: Explicitly apply final positions after simulation completes
    updatePositions();

    // Add cluster labels after simulation settles with collision avoidance
    const labelPositions: Array<{id: string; x: number; y: number}> = [];

    clusters.forEach((cluster) => {
      const clusterNodes = nodes.filter((n) => n.cluster?.id === cluster.id);
      if (clusterNodes.length === 0) return;

      const xs = clusterNodes.map((n) => n.x || 0);
      const ys = clusterNodes.map((n) => n.y || 0);
      const clusterCenterX = (Math.min(...xs) + Math.max(...xs)) / 2;
      const minY = Math.min(...ys);
      
      // Calculate label position above the cluster
      let labelY = minY - 35;
      let labelX = clusterCenterX;
      
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

      // Cluster name with better visibility
      labelsGroup
        .append('text')
        .attr('x', labelX)
        .attr('y', labelY)
        .attr('text-anchor', 'middle')
        .attr('fill', hexToRgba(color, 0.85))
        .style('font-size', '11px')
        .style('font-weight', '500')
        .style('text-transform', 'uppercase')
        .style('letter-spacing', '0.12em')
        .text(cluster.name);
    });

    // Cleanup
    return () => {
      simulation.stop();
    };
  }, [clusters, standaloneSignals, signalEdges, onSelectSignal, handleNodeHover, dimensions]);

  const sourceCount = tooltip.signal?.sources || 0;

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <style>{`
        .urgent-pulse {
          animation: urgentPulse 2.5s ease-in-out infinite;
          transform-origin: center;
          opacity: 0.7;
        }
        @keyframes urgentPulse {
          0%, 100% { r: attr(r); }
          50% { r: calc(attr(r) * 1.08); }
        }
      `}</style>
      
      <svg ref={svgRef} className="w-full h-full" />

      {/* Tooltip */}
      {tooltip.visible && tooltip.signal && (
        <div
          className="absolute pointer-events-none z-50"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div
            className="px-3.5 py-2.5 rounded-lg"
            style={{
              background: '#1a1a24',
              boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
            }}
          >
            <div className="text-xs text-[#e8e8ed] max-w-[200px]" style={{ fontWeight: 400 }}>
              {tooltip.signal.title}
            </div>
            <div className="text-[10px] text-[#6b6b7b] mt-0.5" style={{ fontWeight: 300 }}>
              {tooltip.signal.urgency || 'stable'} · {sourceCount} source{sourceCount !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
