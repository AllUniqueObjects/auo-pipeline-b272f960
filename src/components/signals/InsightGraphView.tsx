// Insight Graph screen - per-insight signals with Graph/Cards toggle
import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import { ColorLegend } from './HighlightedText';
import type { InsightData } from './InsightCard';
import type { Signal, SignalEdge } from '@/hooks/useSignalGraphData';

const EDGE_TYPES: Record<string, { label: string; color: string }> = {
  SAME_CHANNEL: { label: 'SAME CHANNEL', color: '#9898b0' },
  SAME_PRICE: { label: 'SAME PRICE BAND', color: '#9898b0' },
  CAUSE_EFFECT: { label: 'CAUSE → EFFECT', color: '#b0b0c8' },
  AMPLIFYING: { label: 'AMPLIFYING', color: '#b0b0c8' },
  OPPOSING: { label: 'OPPOSING', color: '#f4a3a0' },
};

interface InsightGraphViewProps {
  insight: InsightData;
  signalEdges: SignalEdge[];
  onBack: () => void;
  onSelectSignal: (signal: Signal) => void;
}

interface NodeData {
  id: string;
  signal: Signal;
  r: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

interface LinkData {
  source: string | NodeData;
  target: string | NodeData;
  similarity: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
}

function getRadius(sources: number, scale = 1): number {
  let base: number;
  if (sources >= 9) base = 28;
  else if (sources >= 6) base = 22;
  else if (sources >= 4) base = 17;
  else base = 13;
  return Math.round(base * scale);
}

export function InsightGraphView({
  insight,
  signalEdges,
  onBack,
  onSelectSignal,
}: InsightGraphViewProps) {
  const graphRef = useRef<HTMLDivElement>(null);
  const positionsRef = useRef<Record<string, { x: number; y: number }> | null>(null);
  const [viewMode, setViewMode] = useState<'graph' | 'cards'>('graph');
  const [dims, setDims] = useState({ w: 400, h: 400 });
  const [nodes, setNodes] = useState<NodeData[]>([]);
  const [links, setLinks] = useState<LinkData[]>([]);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Filter edges to those relevant to this insight's signals
  const insightSignalIds = useMemo(
    () => new Set(insight.signals.map((s) => s.id)),
    [insight]
  );

  const insightEdges = useMemo(
    () =>
      signalEdges.filter(
        (e) => insightSignalIds.has(e.signal_a) && insightSignalIds.has(e.signal_b)
      ),
    [signalEdges, insightSignalIds]
  );

  // D3 force simulation
  useEffect(() => {
    if (viewMode !== 'graph') return;
    const el = graphRef.current;
    if (!el) return;

    const w = el.clientWidth;
    const h = el.clientHeight;
    setDims({ w, h });

    const cx = w / 2;
    const cy = h / 2;
    const minDim = Math.min(w, h);
    const n = insight.signals.length;

    // Responsive scaling
    const nodeScale = Math.max(0.8, Math.min(1.8, (minDim / 400) * (4 / Math.max(n, 2))));
    const spread = minDim * 0.42;
    const linkDist = Math.max(120, minDim * 0.32 - n * 8);
    const chargeStr = -(minDim * 0.7 + 300 / Math.max(n, 2));
    const collideExtra = Math.max(20, 50 - n * 3);

    const savedPos = positionsRef.current;
    const sourceCount = (s: Signal) => s.sources || 0;

    const simNodes: NodeData[] = insight.signals.map((s, i) => {
      const saved = savedPos?.[s.id];
      const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
      const dist = spread * (0.5 + Math.random() * 0.5);
      return {
        id: s.id,
        signal: s,
        r: getRadius(sourceCount(s), nodeScale),
        x: saved?.x ?? cx + Math.cos(angle) * dist,
        y: saved?.y ?? cy + Math.sin(angle) * dist,
      };
    });

    const simLinks = insightEdges.map((e) => ({
      source: e.signal_a,
      target: e.signal_b,
      similarity: e.similarity,
    }));

    const sim = d3
      .forceSimulation(simNodes)
      .force('charge', d3.forceManyBody().strength(chargeStr))
      .force(
        'collide',
        d3.forceCollide<NodeData>().radius((d) => d.r + collideExtra).strength(1)
      )
      .force(
        'link',
        d3
          .forceLink<NodeData, LinkData>(simLinks)
          .id((d) => d.id)
          .distance(linkDist)
          .strength(0.35)
      )
      .force('center', d3.forceCenter(cx, cy))
      .force('bounds', () => {
        simNodes.forEach((d) => {
          d.x = Math.max(d.r + 10, Math.min(w - d.r - 10, d.x || 0));
          d.y = Math.max(d.r + 10, Math.min(h - d.r - 10, d.y || 0));
        });
      })
      .alpha(savedPos ? 0.1 : 1)
      .alphaDecay(0.04)
      .on('tick', () => {
        setNodes([...simNodes]);
        setLinks(
          simLinks.map((l) => {
            const src = l.source as unknown as NodeData;
            const tgt = l.target as unknown as NodeData;
            return {
              ...l,
              x1: src?.x ?? 0,
              y1: src?.y ?? 0,
              x2: tgt?.x ?? 0,
              y2: tgt?.y ?? 0,
            };
          })
        );
      })
      .on('end', () => {
        const pos: Record<string, { x: number; y: number }> = {};
        simNodes.forEach((n) => {
          pos[n.id] = { x: n.x || 0, y: n.y || 0 };
        });
        positionsRef.current = pos;
      });

    return () => sim.stop();
  }, [insight.id, viewMode, insightEdges]);

  const tooltipNode = nodes.find((n) => n.id === hoveredNode);

  // Shared header
  const Header = () => (
    <div className="px-7 pt-6 pb-5 flex-shrink-0">
      {/* Nav row */}
      <div className="flex justify-between items-center mb-5">
        <button
          onClick={onBack}
          className="text-[11px] tracking-[0.1em] uppercase hover:opacity-70 transition-opacity"
          style={{ fontWeight: 500, color: insight.color, background: 'none', border: 'none', cursor: 'pointer' }}
        >
          ← Briefing
        </button>
        {/* View toggle */}
        <div
          className="flex gap-1 rounded-lg p-0.5"
          style={{ background: 'rgba(255,255,255,0.04)' }}
        >
          {(['graph', 'cards'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className="rounded-md px-3.5 py-1.5 text-[11px] transition-all"
              style={{
                fontWeight: 500,
                background: viewMode === mode ? 'rgba(255,255,255,0.08)' : 'transparent',
                color: viewMode === mode ? '#e8e8ed' : '#6b6b7b',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {mode === 'graph' ? 'Graph' : 'Cards'}
            </button>
          ))}
        </div>
      </div>

      {/* Color legend */}
      <div className="mb-4">
        <ColorLegend size="small" />
      </div>

      {/* Insight title */}
      <h2
        className="text-[18px] leading-[1.4] mb-3"
        style={{ fontWeight: 400, color: '#e8e8ed' }}
      >
        {insight.title}
      </h2>

      {/* Insight description */}
      <p
        className="text-[14px] leading-[1.7]"
        style={{ fontWeight: 300, color: '#9898a8' }}
      >
        {insight.description}
      </p>
    </div>
  );

  // Cards view
  if (viewMode === 'cards') {
    return (
      <div
        className="fixed inset-0 overflow-auto"
        style={{ background: '#13131a', zIndex: 40 }}
      >
        <Header />
        <div className="px-7 pb-20">
          {insight.signals.map((s) => (
            <div
              key={s.id}
              onClick={() => onSelectSignal(s)}
              className="mb-2.5 rounded-xl cursor-pointer transition-all duration-200"
              style={{
                padding: '20px 22px',
                background: 'rgba(255,255,255,0.02)',
                borderLeft: `3px solid ${insight.color}44`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
              }}
            >
              {/* Top: cluster + urgency */}
              <div className="flex items-center gap-2 mb-2.5">
                <span
                  className="text-[9px] tracking-[0.06em] uppercase rounded px-2 py-0.5"
                  style={{
                    fontWeight: 500,
                    color: insight.color,
                    background: `${insight.color}12`,
                  }}
                >
                  {insight.cluster.name}
                </span>
                <span
                  className="text-[10px] uppercase tracking-[0.04em]"
                  style={{ fontWeight: 400, color: '#6b6b7b' }}
                >
                  {s.urgency || 'stable'} · {s.sources || 0} src
                </span>
              </div>

              {/* Title */}
              <p
                className="text-[15px] leading-[1.4] mb-1.5"
                style={{ fontWeight: 400, color: '#e8e8ed' }}
              >
                {s.title}
              </p>

              {/* Decision question */}
              {s.decision_question && (
                <p
                  className="text-[13px] leading-[1.55] italic"
                  style={{ fontWeight: 300, color: '#7a7a90' }}
                >
                  {s.decision_question}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Graph view
  return (
    <div
      className="fixed inset-0 flex flex-col"
      style={{ background: '#13131a', zIndex: 40 }}
    >
      <Header />

      {/* Graph fills remaining space */}
      <div ref={graphRef} className="flex-1 relative overflow-hidden">
        <svg
          width={dims.w}
          height={dims.h}
          style={{ position: 'absolute', top: 0, left: 0 }}
        >
          {/* Edges */}
          {links.map((link, i) => {
            const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
            const targetId = typeof link.target === 'object' ? link.target.id : link.target;
            const isConn = hoveredNode && (sourceId === hoveredNode || targetId === hoveredNode);
            let op = 0.35 + link.similarity * 0.3;
            let sw = 1.5 + link.similarity * 2;
            if (hoveredNode) {
              if (isConn) {
                op = 0.7;
                sw = 3;
              } else {
                op = 0.06;
                sw = 0.8;
              }
            }
            return (
              <line
                key={i}
                x1={link.x1 || 0}
                y1={link.y1 || 0}
                x2={link.x2 || 0}
                y2={link.y2 || 0}
                stroke="#9898b0"
                strokeWidth={sw}
                opacity={op}
                strokeLinecap="round"
                style={{ transition: 'opacity 250ms, stroke-width 250ms' }}
              />
            );
          })}

          {/* Edge labels with collision avoidance */}
          {(() => {
            const labelData = links.map((link, i) => {
              const labelW = 80;
              return {
                i,
                link,
                labelW,
                x: ((link.x1 || 0) + (link.x2 || 0)) / 2,
                y: ((link.y1 || 0) + (link.y2 || 0)) / 2,
              };
            });

            // Push apart overlapping labels
            for (let iter = 0; iter < 5; iter++) {
              for (let a = 0; a < labelData.length; a++) {
                for (let b = a + 1; b < labelData.length; b++) {
                  const la = labelData[a];
                  const lb = labelData[b];
                  const dx = lb.x - la.x;
                  const dy = lb.y - la.y;
                  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                  const minDist = (la.labelW + lb.labelW) / 2 + 8;
                  if (dist < minDist) {
                    const push = (minDist - dist) / 2;
                    const nx = dx / dist;
                    const ny = dy / dist;
                    la.x -= nx * push;
                    la.y -= ny * push;
                    lb.x += nx * push;
                    lb.y += ny * push;
                  }
                }
              }
            }

            return labelData.map(({ i, link, labelW, x: lx, y: ly }) => {
              const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
              const targetId = typeof link.target === 'object' ? link.target.id : link.target;
              const isConn = hoveredNode && (sourceId === hoveredNode || targetId === hoveredNode);
              let labelOp = 0.7;
              if (hoveredNode) {
                labelOp = isConn ? 0.95 : 0.04;
              }
              return (
                <g key={'et-' + i} style={{ transition: 'opacity 250ms' }} opacity={labelOp}>
                  <rect
                    x={lx - labelW / 2}
                    y={ly - 11}
                    width={labelW}
                    height={22}
                    rx={11}
                    ry={11}
                    fill="#13131a"
                    opacity={0.92}
                  />
                  <text
                    x={lx}
                    y={ly + 1}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="#9898b0"
                    style={{
                      fontSize: 9,
                      fontWeight: 600,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      pointerEvents: 'none',
                    }}
                  >
                    SIMILARITY
                  </text>
                </g>
              );
            });
          })()}

          {/* Nodes */}
          {nodes.map((node) => {
            const isHov = node.id === hoveredNode;
            const isUrgent = node.signal.urgency === 'urgent';
            let op = isUrgent ? 0.85 : node.signal.urgency === 'emerging' ? 0.6 : 0.4;
            if (hoveredNode) {
              if (node.id === hoveredNode) {
                op = 1;
              } else {
                const connected = new Set<string>();
                insightEdges.forEach((e) => {
                  if (e.signal_a === hoveredNode) connected.add(e.signal_b);
                  if (e.signal_b === hoveredNode) connected.add(e.signal_a);
                });
                op = connected.has(node.id) ? 0.75 : 0.06;
              }
            }
            const r = isHov ? node.r * 1.1 : node.r;
            return (
              <g key={node.id}>
                {isUrgent && !hoveredNode && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={node.r + 5}
                    fill="none"
                    stroke={insight.color}
                    strokeWidth={1}
                    opacity={0.2}
                  />
                )}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={r}
                  fill={insight.color}
                  opacity={op}
                  stroke={isHov ? '#e8e8ed' : 'transparent'}
                  strokeWidth={isHov ? 2 : 0}
                  style={{ cursor: 'pointer', transition: 'opacity 250ms' }}
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  onClick={() => onSelectSignal(node.signal)}
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

        {/* Bottom hint */}
        <div
          className="absolute bottom-5 left-0 right-0 text-center text-[10px]"
          style={{ fontWeight: 300, color: '#33333d' }}
        >
          tap a signal for details
        </div>
      </div>
    </div>
  );
}
