import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useInsightData, type InsightWithData, type Tier } from '@/hooks/useInsights';
import { ChatBar } from '@/components/ChatBar';
import { useIsMobile } from '@/hooks/use-mobile';

const TIER_BG: Record<Tier, string> = {
  urgent: 'bg-urgent text-urgent-foreground',
  emerging: 'bg-emerging text-emerging-foreground',
  relevant: 'bg-monitoring text-monitoring-foreground',
};

const TIER_META: Record<Tier, { label: string; dot: string }> = {
  urgent: { label: 'Urgent', dot: '🔴' },
  emerging: { label: 'Emerging', dot: '🟠' },
  relevant: { label: 'Relevant', dot: '⚪' },
};

const URGENCY_VAR: Record<string, string> = {
  urgent: 'hsl(var(--urgent))',
  emerging: 'hsl(var(--emerging))',
  monitor: 'hsl(var(--monitoring))',
  monitoring: 'hsl(var(--monitoring))',
  relevant: 'hsl(var(--monitoring))',
};

/* Generous spacing layouts — cards are well separated */
const LAYOUTS: Record<number, { x: number; y: number }[]> = {
  1: [{ x: 0, y: 0 }],
  2: [{ x: -280, y: -40 }, { x: 280, y: 40 }],
  3: [{ x: -300, y: -160 }, { x: 300, y: -100 }, { x: 0, y: 180 }],
  4: [{ x: 0, y: -240 }, { x: -340, y: 30 }, { x: 340, y: 30 }, { x: 0, y: 280 }],
  5: [{ x: -280, y: -220 }, { x: 280, y: -200 }, { x: -360, y: 100 }, { x: 360, y: 120 }, { x: 0, y: 300 }],
};

function hashCode(s: string): number {
  return Math.abs(s.split('').reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0));
}

/* ─── Infinite Canvas Hook ──────────────────── */

function useCanvas() {
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const isPanning = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    // Only pan when clicking on the canvas background, not on cards
    if ((e.target as HTMLElement).closest('[data-card]')) return;
    isPanning.current = true;
    hasMoved.current = false;
    lastPos.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPanning.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) hasMoved.current = true;
    setPan(p => ({ x: p.x + dx, y: p.y + dy }));
    lastPos.current = { x: e.clientX, y: e.clientY };
  }, []);

  const onPointerUp = useCallback(() => {
    isPanning.current = false;
  }, []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.92 : 1.08;
    setScale(s => Math.min(2, Math.max(0.3, s * delta)));
  }, []);

  const didPan = useCallback(() => hasMoved.current, []);

  return { pan, scale, onPointerDown, onPointerMove, onPointerUp, onWheel, didPan };
}

export default function Home() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { insights, insightEdges, clusterNames, loading } = useInsightData();
  const [activeTier, setActiveTier] = useState<Tier>('urgent');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const canvas = useCanvas();
  const canvasRef = useRef<HTMLDivElement>(null);

  // Reset pan/scale when switching tiers
  useEffect(() => {
    canvas.pan.x = 0;
    canvas.pan.y = 0;
  }, [activeTier]);

  const tierCounts = useMemo(() => ({
    urgent: insights.filter(i => i.tier === 'urgent').length,
    emerging: insights.filter(i => i.tier === 'emerging').length,
    relevant: insights.filter(i => i.tier === 'relevant').length,
  }), [insights]);

  const visibleInsights = useMemo(() =>
    insights.filter(i => i.tier === activeTier).slice(0, 5),
    [insights, activeTier]
  );

  const expandedInsight = expandedId
    ? insights.find(i => i.insight.id === expandedId)
    : null;

  const maxRefs = Math.max(...visibleInsights.map(i => i.totalRefs), 1);
  const getCardWidth = (refs: number) => 280 + 100 * (refs / maxRefs);

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 px-6 pt-5 pb-3">
        <button
          onClick={() => { setExpandedId(null); navigate('/'); }}
          className="text-[22px] font-bold tracking-[0.3em] text-destructive"
        >
          A U O
        </button>
      </header>

      {/* Tier Tabs */}
      {!expandedId && (
        <div className="flex-shrink-0 flex justify-center gap-3 px-6 pb-4">
          {(['urgent', 'emerging', 'relevant'] as Tier[]).map(tier => {
            const active = activeTier === tier;
            const meta = TIER_META[tier];
            return (
              <button
                key={tier}
                onClick={() => setActiveTier(tier)}
                className={cn(
                  'flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition-all duration-200',
                  active ? TIER_BG[tier] : 'border border-border bg-background text-muted-foreground hover:bg-accent'
                )}
              >
                <span className="text-xs">{meta.dot}</span>
                {meta.label} ({tierCounts[tier]})
              </button>
            );
          })}
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 relative overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center h-full text-muted-foreground text-sm">
            Loading intelligence...
          </div>
        ) : expandedInsight ? (
          <div className="h-full overflow-y-auto pb-20">
            <ExpandedView
              insight={expandedInsight}
              clusterNames={clusterNames}
              onBack={() => setExpandedId(null)}
              onSignalClick={(id) => navigate(`/signal/${id}`)}
            />
          </div>
        ) : visibleInsights.length === 0 ? (
          <div className="flex justify-center items-center h-full text-muted-foreground text-sm">
            No {activeTier} insights right now
          </div>
        ) : isMobile ? (
          <div className="h-full overflow-y-auto px-4 pb-20 space-y-4">
            {visibleInsights.map(item => (
              <InsightCardComponent
                key={item.insight.id}
                item={item}
                onClick={() => setExpandedId(item.insight.id)}
              />
            ))}
          </div>
        ) : (
          /* Infinite Canvas */
          <div
            ref={canvasRef}
            className="w-full h-full cursor-grab active:cursor-grabbing select-none"
            onPointerDown={canvas.onPointerDown}
            onPointerMove={canvas.onPointerMove}
            onPointerUp={canvas.onPointerUp}
            onWheel={canvas.onWheel}
            style={{ touchAction: 'none' }}
          >
            <div
              className="absolute inset-0"
              style={{
                transform: `translate(${canvas.pan.x}px, ${canvas.pan.y}px) scale(${canvas.scale})`,
                transformOrigin: '50% 50%',
                transition: 'none',
              }}
            >
              {/* SVG connection lines */}
              <svg className="absolute inset-0 pointer-events-none z-0" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                {insightEdges
                  .filter(e => {
                    const ids = new Set(visibleInsights.map(i => i.insight.id));
                    return ids.has(e.insightA) && ids.has(e.insightB);
                  })
                  .map((edge, idx) => {
                    const layout = LAYOUTS[Math.min(visibleInsights.length, 5)] || LAYOUTS[1];
                    const idxA = visibleInsights.findIndex(i => i.insight.id === edge.insightA);
                    const idxB = visibleInsights.findIndex(i => i.insight.id === edge.insightB);
                    if (idxA < 0 || idxB < 0 || !layout[idxA] || !layout[idxB]) return null;

                    const posA = layout[idxA];
                    const posB = layout[idxB];
                    const isDashed = edge.type === 'SAME_CHANNEL';
                    const isDotted = edge.type === 'CONTRADICTING';

                    return (
                      <g key={idx}>
                        <line
                          x1={`calc(50% + ${posA.x}px)`} y1={`calc(50% + ${posA.y}px)`}
                          x2={`calc(50% + ${posB.x}px)`} y2={`calc(50% + ${posB.y}px)`}
                          stroke={isDotted ? 'hsl(0 80% 85%)' : 'hsl(var(--border))'}
                          strokeWidth={1.5}
                          strokeDasharray={isDashed ? '6,4' : isDotted ? '2,3' : undefined}
                        />
                        <text
                          x={`calc(50% + ${(posA.x + posB.x) / 2}px)`}
                          y={`calc(50% + ${(posA.y + posB.y) / 2 - 10}px)`}
                          textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 11 }}
                        >
                          {edge.type}
                        </text>
                      </g>
                    );
                  })}
              </svg>

              {/* Cards positioned relative to center */}
              {visibleInsights.map((item, idx) => {
                const layout = LAYOUTS[Math.min(visibleInsights.length, 5)] || LAYOUTS[1];
                const pos = layout[idx];
                if (!pos) return null;
                const w = getCardWidth(item.totalRefs);
                const seed = hashCode(item.insight.id);
                const ox = (seed % 16) - 8;
                const oy = ((seed >> 4) % 16) - 8;

                return (
                  <div
                    key={item.insight.id}
                    data-card
                    onClick={() => {
                      if (!canvas.didPan()) setExpandedId(item.insight.id);
                    }}
                    className="absolute z-10 cursor-pointer rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow duration-200 hover:shadow-lg"
                    style={{
                      width: w,
                      left: `calc(50% + ${pos.x + ox}px - ${w / 2}px)`,
                      top: `calc(50% + ${pos.y + oy}px - 70px)`,
                      borderLeftWidth: 4,
                      borderLeftColor: URGENCY_VAR[item.tier],
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] tracking-[0.08em] font-medium uppercase"
                        style={{ color: URGENCY_VAR[item.tier] }}>
                        ● {item.clusterName}
                      </span>
                      <span className="text-xs text-muted-foreground">{item.totalRefs} ref</span>
                    </div>
                    <h3 className="text-[15px] font-semibold text-card-foreground leading-tight line-clamp-3 mb-2">
                      {item.insight.title}
                    </h3>
                    {item.insight.decision_question && (
                      <p className="text-xs italic text-muted-foreground line-clamp-2">
                        {item.insight.decision_question}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <ChatBar />
    </div>
  );
}

/* ─── Level B: Expanded Insight ──────────────────── */

function ExpandedView({
  insight,
  clusterNames,
  onBack,
  onSignalClick,
}: {
  insight: InsightWithData;
  clusterNames: Record<string, string>;
  onBack: () => void;
  onSignalClick: (id: string) => void;
}) {
  const urgencyColor = URGENCY_VAR[insight.tier];

  return (
    <div className="max-w-[720px] mx-auto px-6 animate-fade-in">
      <button onClick={onBack} className="mb-6 text-sm text-muted-foreground hover:text-foreground transition-colors">
        ← Back to map
      </button>

      <div
        className="mx-auto max-w-[520px] rounded-xl border border-border bg-card p-6 shadow-sm mb-8"
        style={{ borderLeftWidth: 4, borderLeftColor: urgencyColor }}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] tracking-[0.08em] font-medium uppercase" style={{ color: urgencyColor }}>
            ● {insight.clusterName}
          </span>
          <span className="text-xs text-muted-foreground">{insight.totalRefs} ref</span>
        </div>
        <h2 className="text-lg font-semibold text-card-foreground mb-2">{insight.insight.title}</h2>
        {insight.insight.decision_question && (
          <p className="text-sm italic text-muted-foreground leading-relaxed">
            {insight.insight.decision_question}
          </p>
        )}
      </div>

      {insight.signals.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {insight.signals.map(signal => {
            const clName = signal.cluster_id ? (clusterNames[signal.cluster_id] || signal.cluster_id) : 'SIGNAL';
            const sigColor = URGENCY_VAR[signal.urgency] || URGENCY_VAR.monitoring;
            return (
              <button
                key={signal.id}
                onClick={() => onSignalClick(signal.id)}
                className="rounded-xl border border-border bg-card p-4 text-left transition-all duration-200 hover:shadow-md"
                style={{ borderLeftWidth: 4, borderLeftColor: sigColor }}
              >
                <div className="text-[10px] tracking-[0.08em] font-medium uppercase mb-1" style={{ color: sigColor }}>
                  ● {clName.toUpperCase()}
                </div>
                <div className="text-[11px] text-muted-foreground mb-2">
                  {signal.urgency} · {signal.sources} references
                </div>
                <h3 className="text-sm font-medium text-card-foreground line-clamp-3">{signal.title}</h3>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Mobile Insight Card ──────────────────── */

function InsightCardComponent({ item, onClick }: { item: InsightWithData; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="rounded-xl border border-border bg-card p-5 cursor-pointer transition-all duration-200 hover:shadow-md"
      style={{ borderLeftWidth: 4, borderLeftColor: URGENCY_VAR[item.tier] }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] tracking-[0.08em] font-medium uppercase" style={{ color: URGENCY_VAR[item.tier] }}>
          ● {item.clusterName}
        </span>
        <span className="text-xs text-muted-foreground">{item.totalRefs} ref</span>
      </div>
      <h3 className="text-[15px] font-semibold text-card-foreground leading-tight line-clamp-3 mb-2">
        {item.insight.title}
      </h3>
      <p className="text-xs italic text-muted-foreground line-clamp-2">
        {item.insight.decision_question || ''}
      </p>
    </div>
  );
}
