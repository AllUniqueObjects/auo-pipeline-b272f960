import { useState, useMemo } from 'react';
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

const LAYOUTS: Record<number, { x: number; y: number }[]> = {
  1: [{ x: 0, y: 0 }],
  2: [{ x: -190, y: -25 }, { x: 190, y: 25 }],
  3: [{ x: -180, y: -90 }, { x: 180, y: -90 }, { x: 0, y: 100 }],
  4: [{ x: 0, y: -150 }, { x: -210, y: 10 }, { x: 210, y: 10 }, { x: 0, y: 170 }],
  5: [{ x: -155, y: -130 }, { x: 155, y: -130 }, { x: -220, y: 60 }, { x: 220, y: 60 }, { x: 0, y: 180 }],
};

function hashCode(s: string): number {
  return Math.abs(s.split('').reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0));
}

export default function Home() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { insights, insightEdges, clusterNames, loading } = useInsightData();
  const [activeTier, setActiveTier] = useState<Tier>('urgent');
  const [expandedId, setExpandedId] = useState<string | null>(null);

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

  const containerW = 900;
  const containerH = 600;
  const cx = containerW / 2;
  const cy = containerH / 2;

  const maxRefs = Math.max(...visibleInsights.map(i => i.totalRefs), 1);
  const getCardWidth = (refs: number) => 260 + 120 * (refs / maxRefs);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="px-6 pt-6 pb-4">
        <button
          onClick={() => { setExpandedId(null); navigate('/'); }}
          className="text-[22px] font-bold tracking-[0.3em] text-destructive"
        >
          A U O
        </button>
      </header>

      {/* Tier Tabs */}
      {!expandedId && (
        <div className="flex justify-center gap-3 px-6 pb-6">
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

      {/* Main content */}
      {loading ? (
        <div className="flex justify-center py-20 text-muted-foreground text-sm">
          Loading intelligence...
        </div>
      ) : expandedInsight ? (
        <ExpandedView
          insight={expandedInsight}
          clusterNames={clusterNames}
          onBack={() => setExpandedId(null)}
          onSignalClick={(id) => navigate(`/signal/${id}`)}
        />
      ) : visibleInsights.length === 0 ? (
        <div className="flex justify-center py-20 text-muted-foreground text-sm">
          No {activeTier} insights right now
        </div>
      ) : isMobile ? (
        <div className="px-4 space-y-4">
          {visibleInsights.map(item => (
            <InsightCardComponent
              key={item.insight.id}
              item={item}
              onClick={() => setExpandedId(item.insight.id)}
            />
          ))}
        </div>
      ) : (
        /* Level A: Card Map */
        <div className="relative mx-auto overflow-hidden" style={{ width: containerW, height: containerH }}>
          {/* SVG connections */}
          <svg className="absolute inset-0 pointer-events-none z-0" width={containerW} height={containerH}>
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

                const isDashed = edge.type === 'SAME_CHANNEL';
                const isDotted = edge.type === 'CONTRADICTING';

                return (
                  <g key={idx}>
                    <line
                      x1={cx + layout[idxA].x} y1={cy + layout[idxA].y}
                      x2={cx + layout[idxB].x} y2={cy + layout[idxB].y}
                      stroke={isDotted ? 'hsl(0 80% 85%)' : 'hsl(var(--border))'}
                      strokeWidth={1.5}
                      strokeDasharray={isDashed ? '6,4' : isDotted ? '2,3' : undefined}
                    />
                    <text
                      x={(2 * cx + layout[idxA].x + layout[idxB].x) / 2}
                      y={(2 * cy + layout[idxA].y + layout[idxB].y) / 2 - 8}
                      textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 11 }}
                    >
                      {edge.type}
                    </text>
                  </g>
                );
              })}
          </svg>

          {/* Positioned insight cards */}
          {visibleInsights.map((item, idx) => {
            const layout = LAYOUTS[Math.min(visibleInsights.length, 5)] || LAYOUTS[1];
            const pos = layout[idx];
            if (!pos) return null;
            const w = getCardWidth(item.totalRefs);
            const seed = hashCode(item.insight.id);
            const ox = (seed % 20) - 10;
            const oy = ((seed >> 4) % 20) - 10;

            return (
              <div
                key={item.insight.id}
                onClick={() => setExpandedId(item.insight.id)}
                className="absolute z-10 cursor-pointer rounded-xl border border-border bg-card p-5 shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
                style={{
                  width: w,
                  left: cx + pos.x + ox - w / 2,
                  top: cy + pos.y + oy - 70,
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
      )}

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

      {/* Expanded insight card */}
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

      {/* Signal cards grid */}
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
