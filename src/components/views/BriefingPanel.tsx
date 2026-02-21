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
}

// ─── Tier badge config ────────────────────────────────────────────────────────

const TIER_BADGE: Record<string, { pill: string; label: string } | null> = {
  breaking:    { pill: 'bg-tier-breaking/10 text-tier-breaking border border-tier-breaking/20',   label: 'BREAKING' },
  developing:  { pill: 'bg-tier-developing/10 text-tier-developing border border-tier-developing/20', label: 'DEVELOPING' },
  established: null,
};

const TIER_ACCENT: Record<string, string> = {
  breaking:    'border-l-tier-breaking',
  developing:  'border-l-tier-developing',
  established: 'border-l-border',
};

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
  const badge = TIER_BADGE[insight.tier ?? 'established'];

  return (
    <div
      onClick={() => onOpen(insight.id)}
      className={cn(
        'group rounded-xl border border-border hover:border-muted-foreground/30 transition-all duration-150 cursor-pointer overflow-hidden',
        insight.tier === 'breaking'
          ? 'bg-tier-breaking/[0.03] hover:bg-tier-breaking/[0.06]'
          : 'hover:bg-accent/30'
      )}
    >
      {/* Tier badge row */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-1.5">
        {badge && (
          <span className={cn('text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full', badge.pill)}>
            {badge.label}
          </span>
        )}
      </div>

      {/* Title */}
      <p className="px-4 pb-1 text-sm font-medium text-foreground leading-snug">
        {insight.title}
      </p>

      {/* user_relevance — always visible, amber, never hidden */}
      {insight.user_relevance && (
        <p className="px-4 pb-3 text-[11px] text-emerging leading-snug">
          {insight.user_relevance}
        </p>
      )}

      {/* Hover actions */}
      <div className="px-4 pb-3 pt-0 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
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
  const dominantTier = insights.some(i => i.tier === 'breaking')
    ? 'breaking'
    : insights.some(i => i.tier === 'developing')
    ? 'developing'
    : 'established';

  return (
    <div className={cn('mb-8 pl-3 border-l-2', TIER_ACCENT[dominantTier])}>
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
      .select('id, title, tier, user_relevance, urgency, cluster_name, created_at')
      .not('tier', 'is', null)
      .not('title', 'like', '[PROTO]%')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('BriefingPanel fetch error:', error);
      setLoadError(true);
      setLoading(false);
      return;
    }

    const rows = (data ?? []) as InsightRow[];
    setInsights(rows);

    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const count = rows.filter(r => r.created_at && r.created_at > cutoff).length;
    setSinceYesterday(count);

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
