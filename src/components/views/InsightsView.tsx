import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { MOCK_INSIGHTS, type MockInsight } from '@/data/mock';

type TierTab = 'all' | 'breaking' | 'developing' | 'established';

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

interface InsightsViewProps {
  onSelectInsight: (insightId: string) => void;
}

export function InsightsView({ onSelectInsight }: InsightsViewProps) {
  const [activeTab, setActiveTab] = useState<TierTab>('all');

  const counts = useMemo(() => ({
    breaking: MOCK_INSIGHTS.filter(i => i.tier === 'breaking').length,
    developing: MOCK_INSIGHTS.filter(i => i.tier === 'developing').length,
    established: MOCK_INSIGHTS.filter(i => i.tier === 'established').length,
  }), []);

  const filtered = useMemo(() =>
    activeTab === 'all' ? MOCK_INSIGHTS : MOCK_INSIGHTS.filter(i => i.tier === activeTab),
    [activeTab]
  );

  // Group by category
  const grouped = useMemo(() => {
    const map = new Map<string, MockInsight[]>();
    for (const insight of filtered) {
      const group = map.get(insight.category) || [];
      group.push(insight);
      map.set(insight.category, group);
    }
    // Sort groups: breaking-containing first, then developing, then established
    const tierPriority = (items: MockInsight[]) => {
      if (items.some(i => i.tier === 'breaking')) return 0;
      if (items.some(i => i.tier === 'developing')) return 1;
      return 2;
    };
    return [...map.entries()].sort((a, b) => tierPriority(a[1]) - tierPriority(b[1]));
  }, [filtered]);

  const tabs: { key: TierTab; label: string; count?: number }[] = [
    { key: 'all', label: 'All' },
    { key: 'breaking', label: 'Breaking', count: counts.breaking },
    { key: 'developing', label: 'Developing', count: counts.developing },
    { key: 'established', label: 'Established', count: counts.established },
  ];

  return (
    <div className="flex flex-col h-full pb-14">
      {/* Filter bar */}
      <div className="flex-shrink-0 border-b border-border px-4">
        <div className="max-w-5xl mx-auto flex items-center gap-1 py-2">
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
        <div className="max-w-5xl mx-auto space-y-8">
          {grouped.map(([category, items]) => (
            <div key={category}>
              {/* Group header */}
              <div className="flex items-center justify-between mb-3 px-1">
                <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">
                  {category}
                </h2>
                <span className="text-xs text-muted-foreground ml-4 flex-shrink-0">
                  {items.length}
                </span>
              </div>

              {/* 2-col grid */}
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
                      'flex flex-col'
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
                      <span>{insight.evidence_count} refs</span>
                    </div>
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
