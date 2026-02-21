import { useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

type TierTab = 'all' | 'breaking' | 'developing' | 'established';
type LensType = 'executive' | 'leader' | 'ic';

interface InsightRow {
  id: string;
  title: string;
  tier: string;
  category: string;
  signal_count: number;
  reference_count: number | null;
  momentum_score: number | null;
  created_at: string | null;
}

const TIER_BORDER: Record<string, string> = {
  breaking: 'border-l-tier-breaking',
  developing: 'border-l-tier-developing',
  established: 'border-l-tier-established',
};

const TIER_DOT: Record<string, string> = {
  breaking: 'bg-tier-breaking',
  developing: 'bg-tier-developing',
  established: 'bg-tier-established',
};

// Lens-aware category sort weights (lower = higher priority)
const LENS_CATEGORY_WEIGHT: Record<string, Record<string, number>> = {
  executive: {
    'RETAIL SHELF COMPETITION': 0,
    'VIETNAM MANUFACTURING SQUEEZE': 1,
    'COMPETITIVE TECHNOLOGY': 2,
  },
  ic: {
    'COMPETITIVE TECHNOLOGY': 0,
    'VIETNAM MANUFACTURING SQUEEZE': 1,
    'RETAIL SHELF COMPETITION': 2,
  },
  leader: {},
};

interface InsightsViewProps {
  onSelectInsight: (insightId: string) => void;
  selectedInsightId?: string;
  activeProject?: string;
  activeLens?: LensType;
}

export function InsightsView({ onSelectInsight, selectedInsightId, activeLens = 'leader' }: InsightsViewProps) {
  const [activeTab, setActiveTab] = useState<TierTab>('all');
  const [insights, setInsights] = useState<InsightRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchInsights() {
      setLoading(true);
      const { data, error } = await supabase
        .from('insights')
        .select('id, title, tier, category, signal_count, reference_count, momentum_score, created_at')
        .not('tier', 'is', null)
        .not('title', 'like', '[PROTO]%')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setInsights(data as InsightRow[]);
      }
      setLoading(false);
    }
    fetchInsights();
  }, []);

  const counts = useMemo(() => ({
    breaking: insights.filter(i => i.tier === 'breaking').length,
    developing: insights.filter(i => i.tier === 'developing').length,
    established: insights.filter(i => i.tier === 'established').length,
  }), [insights]);

  const filtered = useMemo(() =>
    activeTab === 'all' ? insights : insights.filter(i => i.tier === activeTab),
    [activeTab, insights]
  );

  // Group by category
  const grouped = useMemo(() => {
    const map = new Map<string, InsightRow[]>();
    for (const insight of filtered) {
      const cat = insight.category ?? 'General';
      const group = map.get(cat) || [];
      group.push(insight);
      map.set(cat, group);
    }

    const lensWeights = LENS_CATEGORY_WEIGHT[activeLens] || {};

    const tierPriority = (items: InsightRow[]) => {
      if (items.some(i => i.tier === 'breaking')) return 0;
      if (items.some(i => i.tier === 'developing')) return 1;
      return 2;
    };

    return [...map.entries()].sort((a, b) => {
      const tierDiff = tierPriority(a[1]) - tierPriority(b[1]);
      if (tierDiff !== 0) return tierDiff;
      const weightA = lensWeights[a[0]] ?? 99;
      const weightB = lensWeights[b[0]] ?? 99;
      return weightA - weightB;
    });
  }, [filtered, activeLens]);

  const tabs: { key: TierTab; label: string; count?: number }[] = [
    { key: 'all', label: 'All' },
    { key: 'breaking', label: 'Breaking', count: counts.breaking },
    { key: 'developing', label: 'Developing', count: counts.developing },
    { key: 'established', label: 'Established', count: counts.established },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-muted-foreground">Loading insights…</p>
      </div>
    );
  }

  if (insights.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-muted-foreground">No insights yet.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Filter bar */}
      <div className="flex-shrink-0 border-b border-border px-4">
        <div className="flex items-center gap-1 py-2">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                activeTab === tab.key
                  ? 'bg-accent text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
              )}
            >
              {tab.key !== 'all' && (
                <span className={cn('h-2 w-2 rounded-full', TIER_DOT[tab.key])} />
              )}
              {tab.label}
              {tab.count !== undefined && (
                <span className="text-xs text-muted-foreground">({tab.count})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Grouped cards */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="space-y-8">
          {grouped.map(([category, items]) => (
            <div key={category}>
              <div className="flex items-center justify-between mb-3 px-1">
                <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">
                  {category}
                </h2>
                <span className="text-xs text-muted-foreground ml-4 flex-shrink-0">
                  {items.length}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {items.map(insight => (
                  <button
                    key={insight.id}
                    onClick={() => onSelectInsight(insight.id)}
                    className={cn(
                      'text-left rounded-lg border border-border bg-card px-4 pt-3 pb-2 transition-all duration-150',
                      'hover:border-muted-foreground/30 hover:shadow-md',
                      'border-l-[3px]',
                      TIER_BORDER[insight.tier],
                      'flex flex-col',
                      selectedInsightId === insight.id && 'bg-accent/50'
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <span className={cn('h-2 w-2 rounded-full mt-1.5 flex-shrink-0', TIER_DOT[insight.tier])} />
                      <h3 className="text-sm font-semibold text-card-foreground leading-snug line-clamp-2">
                        {insight.title}
                      </h3>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground whitespace-nowrap pt-1">
                      <span>{insight.signal_count} signals</span>
                      <span>·</span>
                      <span>{insight.reference_count ?? 0} refs</span>
                    </div>
                    {(insight.momentum_score ?? 0) > 0 && (
                      <span className="text-[10px] font-medium text-tier-breaking flex items-center gap-0.5 mt-0.5">
                        ↑ Momentum
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
