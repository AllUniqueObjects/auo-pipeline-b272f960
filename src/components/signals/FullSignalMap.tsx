// Full Signal Map - all clusters arranged in a circle
import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import type { ClusterWithColor, Signal, SignalEdge } from '@/hooks/useSignalGraphData';

interface FullSignalMapProps {
  clusters: ClusterWithColor[];
  standaloneSignals: Signal[];
  signalEdges: SignalEdge[];
  onBack: () => void;
  onSelectSignal: (signal: Signal, cluster: ClusterWithColor | null) => void;
}

interface NodeData {
  id: string;
  signal: Signal;
  cluster: ClusterWithColor | null;
  r: number;
  tx: number;
  ty: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

function getRadius(sources: number, scale = 1): number {
  let base: number;
  if (sources >= 9) base = 28;
  else if (sources >= 6) base = 22;
  else if (sources >= 4) base = 17;
  else base = 13;
  return Math.round(base * scale);
}

export function FullSignalMap({
  clusters,
  standaloneSignals,
  signalEdges,
  onBack,
  onSelectSignal,
}: FullSignalMapProps) {
  const graphRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 400, h: 500 });
  const [nodes, setNodes] = useState<NodeData[]>([]);
  const [links, setLinks] = useState<
    Array<{
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      similarity: number;
      sourceId: string;
      targetId: string;
    }>
  >([]);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Build all signals
  const allSignals = useMemo(() => {
    const clustered = clusters.flatMap((c) =>
      c.signals.map((s) => ({ signal: s, cluster: c }))
    );
    const standalone = standaloneSignals.map((s) => ({ signal: s, cluster: null }));
    return [...clustered, ...standalone];
  }, [clusters, standaloneSignals]);

  const totalSignals = allSignals.length;

  useEffect(() => {
    const el = graphRef.current;
    if (!el) return;

    const w = el.clientWidth;
    const h = el.clientHeight;
    setDims({ w, h });

    const cx = w * 0.5;
    const cy = h * 0.5;
    const minDim = Math.min(w, h);
    const numClusters = clusters.length;
    const radius = minDim * 0.38;
    const nodeScale = Math.max(0.55, Math.min(1.1, minDim / (350 + numClusters * 20)));

    // Distribute clusters in a circle
    const targets: Record<string, { x: number; y: number }> = {};
    clusters.forEach((cluster, i) => {
      const angle = (i / numClusters) * Math.PI * 2 - Math.PI / 2;
      targets[cluster.id] = {
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
      };
    });
    targets['standalone'] = { x: cx, y: cy };

    const simNodes: NodeData[] = allSignals.map(({ signal, cluster }) => {
      const target = cluster ? targets[cluster.id] : targets['standalone'];
      const sourceCount = signal.sources || 0;
      return {
        id: signal.id,
        signal,
        cluster,
        r: getRadius(sourceCount, nodeScale),
        tx: target.x,
        ty: target.y,
        x: target.x + (Math.random() - 0.5) * 50,
        y: target.y + (Math.random() - 0.5) * 50,
      };
    });

    const simLinks = signalEdges.map((e) => ({
      source: e.signal_a,
      target: e.signal_b,
      similarity: e.similarity,
    }));

    const sim = d3
      .forceSimulation(simNodes)
      .force('charge', d3.forceManyBody().strength(-minDim * 0.15))
      .force(
        'collide',
        d3.forceCollide<NodeData>().radius((d) => d.r + Math.max(8, minDim * 0.02)).strength(1)
      )
      .force(
        'link',
        d3
          .forceLink(simLinks)
          .id((d: any) => d.id)
          .distance(minDim * 0.09)
          .strength((l: any) => {
            const sc = allSignals.find((s) => s.signal.id === (l.source.id || l.source))?.cluster?.id;
            const tc = allSignals.find((s) => s.signal.id === (l.target.id || l.target))?.cluster?.id;
            return sc === tc ? 0.5 : 0.03;
          })
      )
      .force('clusterX', d3.forceX<NodeData>().x((d) => d.tx).strength(0.42))
      .force('clusterY', d3.forceY<NodeData>().y((d) => d.ty).strength(0.42))
      .force('bounds', () => {
        simNodes.forEach((d) => {
          d.x = Math.max(d.r + 10, Math.min(w - d.r - 10, d.x || 0));
          d.y = Math.max(d.r + 10, Math.min(h - d.r - 10, d.y || 0));
        });
      })
      .alphaDecay(0.025)
      .on('tick', () => {
        setNodes([...simNodes]);
        setLinks(
          simLinks.map((l: any) => ({
            x1: l.source.x,
            y1: l.source.y,
            x2: l.target.x,
            y2: l.target.y,
            similarity: l.similarity,
            sourceId: l.source.id,
            targetId: l.target.id,
          }))
        );
      });

    return () => sim.stop();
  }, [clusters, standaloneSignals, signalEdges, allSignals]);

  const getConnected = useCallback(
    (id: string) => {
      const s = new Set<string>();
      signalEdges.forEach((e) => {
        if (e.signal_a === id) s.add(e.signal_b);
        if (e.signal_b === id) s.add(e.signal_a);
      });
      return s;
    },
    [signalEdges]
  );

  const connected = hoveredNode ? getConnected(hoveredNode) : null;

  // Cluster labels
  const clusterLabels = clusters
    .map((cluster) => {
      const clusterNodes = nodes.filter((n) => n.cluster?.id === cluster.id);
      if (!clusterNodes.length) return null;
      const avgX = clusterNodes.reduce((s, n) => s + (n.x || 0), 0) / clusterNodes.length;
      const minY = Math.min(...clusterNodes.map((n) => (n.y || 0) - n.r));
      return { ...cluster, lx: avgX, ly: minY - 18 };
    })
    .filter(Boolean);

  const tooltipNode = nodes.find((n) => n.id === hoveredNode);

  return (
    <div
      className="fixed inset-0 flex flex-col"
      style={{ background: '#13131a', zIndex: 40 }}
    >
      {/* Header */}
      <div className="px-7 py-5 flex justify-between items-center flex-shrink-0">
        <button
          onClick={onBack}
          className="text-[11px] tracking-[0.1em] uppercase hover:opacity-70 transition-opacity"
          style={{
            fontWeight: 500,
            color: '#7a7a90',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          ← Briefing
        </button>
        <span className="text-[11px]" style={{ fontWeight: 300, color: '#44444f' }}>
          All signals · {totalSignals}
        </span>
      </div>

      {/* Graph */}
      <div ref={graphRef} className="flex-1 relative overflow-hidden">
        <svg
          width={dims.w}
          height={dims.h}
          style={{ position: 'absolute', top: 0, left: 0 }}
        >
          {/* Edges */}
          {links.map((link, i) => {
            const sourceCluster = allSignals.find((s) => s.signal.id === link.sourceId)?.cluster?.id;
            const targetCluster = allSignals.find((s) => s.signal.id === link.targetId)?.cluster?.id;
            const cross = sourceCluster !== targetCluster;
            const isConn = hoveredNode && (link.sourceId === hoveredNode || link.targetId === hoveredNode);
            let op = cross ? 0.1 : 0.22 + link.similarity * 0.2;
            let sw = cross ? 0.8 : 1 + link.similarity * 1.2;
            if (hoveredNode) {
              if (isConn) {
                op = 0.55;
                sw = 2.5;
              } else {
                op = 0.02;
                sw = 0.5;
              }
            }
            let color = '#7a7a90';
            if (!cross) {
              const cl = clusters.find((c) => c.id === sourceCluster);
              if (cl) color = cl.color.text;
            }
            return (
              <line
                key={i}
                x1={link.x1}
                y1={link.y1}
                x2={link.x2}
                y2={link.y2}
                stroke={color}
                strokeWidth={sw}
                opacity={op}
                strokeDasharray={cross ? '5 3' : 'none'}
                strokeLinecap="round"
                style={{ transition: 'opacity 250ms, stroke-width 250ms' }}
              />
            );
          })}

          {/* Cluster labels */}
          {clusterLabels.map((cl) =>
            cl ? (
              <text
                key={cl.id}
                x={cl.lx}
                y={cl.ly}
                textAnchor="middle"
                fill={cl.color.text}
                opacity={hoveredNode ? 0.2 : 0.55}
                style={{
                  fontSize: 9,
                  fontWeight: 500,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  pointerEvents: 'none',
                  transition: 'opacity 200ms',
                }}
              >
                {cl.name}
              </text>
            ) : null
          )}

          {/* Nodes */}
          {nodes.map((node) => {
            const fill = node.cluster?.color.node || '#6b6b7b';
            const isHov = node.id === hoveredNode;
            const isUrgent = node.signal.urgency === 'urgent';
            let op = isUrgent ? 0.8 : node.signal.urgency === 'emerging' ? 0.5 : 0.3;
            if (hoveredNode) {
              if (node.id === hoveredNode) op = 1;
              else op = connected?.has(node.id) ? 0.7 : 0.06;
            }
            return (
              <g key={node.id}>
                {isUrgent && !hoveredNode && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={node.r + 5}
                    fill="none"
                    stroke={fill}
                    strokeWidth={1}
                    opacity={0.18}
                  />
                )}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={isHov ? node.r * 1.1 : node.r}
                  fill={fill}
                  opacity={op}
                  stroke={isHov ? '#e8e8ed' : 'transparent'}
                  strokeWidth={isHov ? 2 : 0}
                  style={{ cursor: 'pointer', transition: 'opacity 200ms' }}
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  onClick={() => onSelectSignal(node.signal, node.cluster)}
                />
              </g>
            );
          })}
        </svg>

        {/* Tooltip */}
        {tooltipNode && (
          <div
            style={{
              position: 'absolute',
              left: tooltipNode.x,
              top: (tooltipNode.y || 0) - tooltipNode.r - 16,
              transform: 'translate(-50%, -100%)',
              background: '#1c1c28',
              borderRadius: 8,
              padding: '12px 16px',
              boxShadow: '0 6px 24px rgba(0,0,0,0.5)',
              pointerEvents: 'none',
              zIndex: 10,
              maxWidth: 300,
            }}
          >
            <div
              className="text-[13px] leading-[1.4]"
              style={{ fontWeight: 400, color: '#e8e8ed' }}
            >
              {tooltipNode.signal.title}
            </div>
            <div
              className="text-[10px] mt-1.5"
              style={{ fontWeight: 300, color: '#7a7a90' }}
            >
              {tooltipNode.signal.urgency || 'stable'} · {tooltipNode.signal.sources || 0} sources
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
