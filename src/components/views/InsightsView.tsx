import { useState, useMemo, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type Insight = Tables<'insights'>;
type TierTab = 'breaking' | 'developing' | 'established';

const TIER_COLORS: Record<TierTab, { dot: string; badge: string; border: string }> = {
  breaking: {
    dot: 'bg-tier-breaking',
    badge: 'bg-tier-breaking text-tier-breaking-foreground',
    border: 'border-l-tier-breaking',
  },
  developing: {
    dot: 'bg-tier-developing',
    badge: 'bg-tier-developing text-tier-developing-foreground',
    border: 'border-l-tier-developing',
  },
  established: {
    dot: 'bg-tier-established',
    badge: 'bg-tier-established text-tier-established-foreground',
    border: 'border-l-tier-established',
  },
};

interface InsightsViewProps {
  onSelectInsight: (insightId: string) => void;
}

export function InsightsView({ onSelectInsight }: InsightsViewProps) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TierTab>('breaking');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchInsights = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('insights')
      .select('*')
      .not('tier', 'is', null)
      .order('created_at', { ascending: false });

    if (data) {
      setInsights(data);
      setLastUpdated(new Date());
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  const tierCounts = useMemo(() => ({
    breaking: insights.filter(i => i.tier === 'breaking').length,
    developing: insights.filter(i => i.tier === 'developing').length,
    established: insights.filter(i => i.tier === 'established').length,
  }), [insights]);

  const filtered = useMemo(() =>
    insights.filter(i => i.tier === activeTab),
    [insights, activeTab]
  );

  const tabs: TierTab[] = ['breaking', 'developing', 'established'];

  return (
    <div className="flex flex-col h-full">
      {/* Tier tabs */}
      <div className="flex-shrink-0 border-b border-border px-4">
        <div className="max-w-3xl mx-auto flex items-center gap-1 py-2">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize',
                activeTab === tab
                  ? 'bg-accent text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
              )}
            >
              <span className={cn('h-2 w-2 rounded-full', TIER_COLORS[tab].dot)} />
              {tab}
              <span className="text-xs text-muted-foreground">({tierCounts[tab]})</span>
            </button>
          ))}

          <div className="flex-1" />

          {lastUpdated && (
            <span className="text-xs text-muted-foreground hidden sm:block">
              Updated {formatRelative(lastUpdated)}
            </span>
          )}
          <button
            onClick={fetchInsights}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
            disabled={loading}
          >
            ↻
          </button>
        </div>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-3">
          {loading ? (
            <div className="flex justify-center py-12">
              <span className="text-sm text-muted-foreground">Loading insights...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex justify-center py-12">
              <span className="text-sm text-muted-foreground">
                No {activeTab} insights right now
              </span>
            </div>
          ) : (
            filtered.map(insight => (
              <InsightCard
                key={insight.id}
                insight={insight}
                tier={activeTab}
                onClick={() => onSelectInsight(insight.id)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function InsightCard({
  insight,
  tier,
  onClick,
}: {
  insight: Insight;
  tier: TierTab;
  onClick: () => void;
}) {
  const colors = TIER_COLORS[tier];
  const [expanded, setExpanded] = useState(false);
  const evidenceCount = Array.isArray(insight.evidence_refs) ? (insight.evidence_refs as unknown[]).length : 0;

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-lg border border-border bg-card p-5 transition-all duration-200',
        'hover:border-muted-foreground/30 hover:shadow-md',
        'border-l-4',
        colors.border
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <h3 className="text-[15px] font-semibold text-card-foreground leading-snug">
          {insight.title}
        </h3>
        <span className={cn('flex-shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize', colors.badge)}>
          {tier}
        </span>
      </div>

      {/* Decision question */}
      {insight.decision_question && (
        <p className="text-sm text-foreground/80 leading-relaxed mb-3 border-l-2 border-muted-foreground/20 pl-3 italic">
          {insight.decision_question}
        </p>
      )}

      {/* User relevance */}
      {insight.user_relevance && (
        <p className="text-xs text-muted-foreground leading-relaxed mb-3">
          {insight.user_relevance}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>Based on {insight.signal_count} signals</span>
        {evidenceCount > 0 && (
          <span>{evidenceCount} citations</span>
        )}
      </div>

      {/* Expandable tier reasoning */}
      {insight.tier_reasoning && (
        <div className="mt-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            {expanded ? '▾' : '▸'} Why this tier
          </button>
          {expanded && (
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed pl-3 border-l border-border">
              {insight.tier_reasoning}
            </p>
          )}
        </div>
      )}
    </button>
  );
}

function formatRelative(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
