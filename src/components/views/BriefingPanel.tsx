import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────────────

interface InsightRow {
  id: string;
  title: string;
  tier: string | null;
  user_relevance: string | null;
  urgency: string;
  cluster_name: string | null;
  created_at: string | null;
  signal_ids: string[];
  decision_question: string | null;
}

// ─── Urgency badge config ─────────────────────────────────────────────────────

const URGENCY_BADGE: Record<string, { bg: string; label: string } | null> = {
  urgent:   { bg: '#c0392b', label: 'URGENT' },
  emerging: { bg: '#e67e22', label: 'EMERGING' },
  monitor:  { bg: '#999',    label: 'MONITOR' },
};

const URGENCY_ACCENT: Record<string, string> = {
  urgent:   'border-l-[#c0392b]',
  emerging: 'border-l-[#e67e22]',
  monitor:  'border-l-border',
};

const URGENCY_ORDER: Record<string, number> = { urgent: 0, emerging: 1, monitor: 2 };

function processInsights(raw: InsightRow[]): InsightRow[] {
  const sorted = [...raw].sort((a, b) => {
    const ua = URGENCY_ORDER[a.urgency] ?? 3;
    const ub = URGENCY_ORDER[b.urgency] ?? 3;
    if (ua !== ub) return ua - ub;
    return (b.created_at ?? '').localeCompare(a.created_at ?? '');
  });

  const result: InsightRow[] = [];
  const clusterCount: Record<string, number> = {};

  for (const row of sorted) {
    if (result.length >= 12) break;
    const key = row.cluster_name;
    if (key) {
      const count = clusterCount[key] ?? 0;
      if (count >= 3) continue;
      clusterCount[key] = count + 1;
    }
    result.push(row);
  }
  return result;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-border p-4 space-y-2.5 animate-pulse">
      <div className="flex items-center gap-2">
        <div className="h-4 w-20 rounded-full bg-muted" />
      </div>
      <div className="h-3.5 w-full rounded bg-muted" />
      <div className="h-3 w-4/5 rounded bg-muted" />
      <div className="h-3 w-3/5 rounded bg-muted/60" />
    </div>
  );
}

// ─── Single insight card ───────────────────────────────────────────────────────

interface InsightCardProps {
  insight: InsightRow;
  onOpen: (id: string) => void;
  onDiscuss: (insight: InsightRow) => void;
}

function InsightCard({ insight, onOpen, onDiscuss }: InsightCardProps) {
  const badge = URGENCY_BADGE[insight.urgency] ?? null;
  const signalCount = insight.signal_ids?.length ?? 0;
  const dateLabel = insight.created_at
    ? new Date(insight.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null;

  return (
    <div
      onClick={() => onOpen(insight.id)}
      className={cn(
        'group rounded-xl border border-border hover:border-muted-foreground/30 transition-all duration-150 cursor-pointer overflow-hidden',
        insight.urgency === 'urgent'
          ? 'bg-[#c0392b]/[0.03] hover:bg-[#c0392b]/[0.06]'
          : 'hover:bg-accent/30'
      )}
    >
      <div className="px-4 py-3">
        {/* Top row: badge left, meta right */}
        <div className="flex items-center justify-between mb-1.5">
          <div>
            {badge && (
              <span
                className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full text-white"
                style={{ backgroundColor: badge.bg }}
              >
                {badge.label}
              </span>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {dateLabel}{signalCount > 0 && ` · ${signalCount} signal${signalCount !== 1 ? 's' : ''}`}
          </span>
        </div>

        {/* Title */}
        <p className="text-sm font-medium text-foreground leading-snug">
          {insight.title}
        </p>

        {/* Why-now */}
        {insight.user_relevance && (
          <p className="text-[11px] text-emerging leading-snug mt-1">
            {insight.user_relevance}
          </p>
        )}

        {/* Decision question */}
        {insight.decision_question && (
          <p className="text-[12px] italic text-[hsl(0,0%,53%)] leading-snug mt-1.5 truncate">
            {insight.decision_question}
          </p>
        )}
      </div>

      {/* Hover actions */}
      <div className="px-4 pb-2.5 pt-0 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        <button
          onClick={e => { e.stopPropagation(); onDiscuss(insight); }}
          className="text-[11px] font-medium text-muted-foreground hover:text-foreground border border-border rounded-md px-2.5 py-1 hover:bg-background transition-colors"
        >
          Ask AUO →
        </button>
        <button
          onClick={e => { e.stopPropagation(); onOpen(insight.id); }}
          className="text-[11px] font-medium text-foreground border border-border rounded-md px-2.5 py-1 hover:bg-background transition-colors"
        >
          Explore detail →
        </button>
      </div>
    </div>
  );
}

// ─── Cluster block ─────────────────────────────────────────────────────────────

interface ClusterBlockProps {
  name: string;
  insights: InsightRow[];
  onOpenInsight: (id: string) => void;
  onDiscuss: (insight: InsightRow) => void;
}

function ClusterBlock({ name, insights, onOpenInsight, onDiscuss }: ClusterBlockProps) {
  const dominantUrgency = insights.some(i => i.urgency === 'urgent')
    ? 'urgent'
    : insights.some(i => i.urgency === 'emerging')
    ? 'emerging'
    : 'monitor';

  return (
    <div className={cn('mb-8 pl-3 border-l-2', URGENCY_ACCENT[dominantUrgency])}>
      <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-foreground mb-3">
        {name}
      </h2>
      <div className="space-y-2">
        {insights.map(insight => (
          <InsightCard
            key={insight.id}
            insight={insight}
            onOpen={onOpenInsight}
            onDiscuss={onDiscuss}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

interface BriefingPanelProps {
  activeLens?: string;
  onExplore?: (topicId: string) => void;
  onOpenInsight: (insightId: string) => void;
  onBuildPosition?: (topic: any) => void;
  onDiscuss: (insight: InsightRow) => void;
}

export function BriefingPanel({ onOpenInsight, onDiscuss }: BriefingPanelProps) {
  const [insights, setInsights] = useState<InsightRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [sinceYesterday, setSinceYesterday] = useState(0);

  const fetchInsights = async () => {
    setLoading(true);
    setLoadError(false);

    const { data, error } = await supabase
      .from('insights')
      .select('id, title, tier, user_relevance, urgency, cluster_name, created_at, signal_ids, decision_question')
      .not('tier', 'is', null)
      .not('title', 'like', '[PROTO]%')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('BriefingPanel fetch error:', error);
      setLoadError(true);
      setLoading(false);
      return;
    }

    const rows = (data ?? []) as InsightRow[];

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const count = rows.filter(r => r.created_at && r.created_at > yesterday.toISOString()).length;
    setSinceYesterday(count);

    setInsights(processInsights(rows));
    setLoading(false);
  };

  useEffect(() => { fetchInsights(); }, []);

  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  // Group by cluster_name (fallback to 'General')
  const grouped = insights.reduce<Record<string, InsightRow[]>>((acc, row) => {
    const key = row.cluster_name ?? 'General';
    if (!acc[key]) acc[key] = [];
    acc[key].push(row);
    return acc;
  }, {});

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 px-5 pt-5 pb-4 border-b border-border">
        <h1 className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground mb-1">
          Today's Briefing
        </h1>
        <p className="text-xs text-muted-foreground">
          {today}
          {sinceYesterday > 0 && (
            <span className="text-tier-breaking font-medium">
              {' '}· {sinceYesterday} new signals since yesterday
            </span>
          )}
        </p>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-5 py-5">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center justify-center mt-16 gap-2">
            <p className="text-sm text-muted-foreground">Unable to load.</p>
            <button
              onClick={fetchInsights}
              className="text-xs text-muted-foreground hover:text-foreground underline transition-colors"
            >
              Retry?
            </button>
          </div>
        ) : insights.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center mt-12">No insights yet.</p>
        ) : (
          Object.entries(grouped).map(([cluster, rows]) => (
            <ClusterBlock
              key={cluster}
              name={cluster}
              insights={rows}
              onOpenInsight={onOpenInsight}
              onDiscuss={onDiscuss}
            />
          ))
        )}
      </div>
    </div>
  );
}
