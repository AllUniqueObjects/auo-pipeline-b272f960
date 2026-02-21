import { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

// Local type definitions
interface TopicInsightLocal {
  id: string;
  tier: 'breaking' | 'developing' | 'established';
  title: string;
  references: number;
  credibility: number;
  momentum: boolean;
  momentumLabel?: string;
  isLive: boolean;
  davidCanTell: string;
  category?: string;
}

interface TopicLocal {
  id: string;
  name: string;
  newCount?: number;
  insights: TopicInsightLocal[];
}

type TierFilter = 'all' | 'breaking' | 'developing' | 'established';

const TIER_PILL: Record<string, string> = {
  breaking: 'bg-tier-breaking/10 text-tier-breaking',
  developing: 'bg-tier-developing/10 text-tier-developing',
  established: 'bg-muted text-muted-foreground',
};

const TIER_DOT: Record<string, string> = {
  breaking: 'bg-tier-breaking',
  developing: 'bg-tier-developing',
  established: 'bg-tier-established',
};

function CredBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color =
    pct >= 80
      ? 'bg-tier-established'
      : pct >= 60
      ? 'bg-tier-developing'
      : 'bg-tier-breaking';
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-block w-20 h-1.5 rounded-full bg-muted overflow-hidden">
        <span className={cn('block h-full rounded-full', color)} style={{ width: `${pct}%` }} />
      </span>
      <span className="text-[10px] text-muted-foreground">{pct}%</span>
    </span>
  );
}

interface InsightCardProps {
  insight: TopicInsightLocal;
  onOpen: (id: string) => void;
  onDiscuss?: (insight: TopicInsightLocal) => void;
}

function InsightCard({ insight, onOpen, onDiscuss }: InsightCardProps) {
  return (
    <div
      onClick={() => onOpen(insight.id)}
      className={cn(
        'group rounded-xl border border-border hover:border-muted-foreground/30 transition-all duration-150 cursor-pointer overflow-hidden',
        insight.tier === 'breaking' ? 'bg-tier-breaking/[0.03] hover:bg-tier-breaking/[0.06]' : 'hover:bg-accent/30'
      )}
    >
      {/* Top row */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1.5">
        <div className="flex items-center gap-2">
          <span className={cn('text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full', TIER_PILL[insight.tier])}>
            {insight.tier}
          </span>
          {insight.isLive && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[hsl(var(--live-blue))]/10">
              <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--live-blue))] animate-pulse" />
              <span className="text-[9px] font-bold uppercase tracking-wider text-[hsl(var(--live-blue))]">Live</span>
            </span>
          )}
        </div>
        {insight.momentum && insight.momentumLabel && (
          <span className="text-[10px] font-medium text-tier-breaking">↑ {insight.momentumLabel}</span>
        )}
      </div>

      {/* Title */}
      <p className="px-4 py-1 text-sm font-medium text-foreground leading-snug">{insight.title}</p>

      {/* Quote */}
      {insight.davidCanTell && (
        <p className="px-4 pb-2.5 text-[11px] text-muted-foreground italic leading-snug line-clamp-2">
          "{insight.davidCanTell}"
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between px-4 pb-3 pt-2 border-t border-border/50">
        <span className="text-[10px] text-muted-foreground">{insight.references} refs</span>
        <CredBar value={insight.credibility} />
      </div>

      {/* Hover actions */}
      {onDiscuss && (
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
      )}
    </div>
  );
}

interface TopicDetailPanelProps {
  topic: TopicLocal;
  onBack: () => void;
  onOpenInsight: (id: string) => void;
  onBuildPosition: (topic: TopicLocal) => void;
  onDiscuss?: (insight: TopicInsightLocal) => void;
}

export function TopicDetailPanel({ topic, onBack, onOpenInsight, onBuildPosition, onDiscuss }: TopicDetailPanelProps) {
  const [filter, setFilter] = useState<TierFilter>('all');

  const filtered = filter === 'all' ? topic.insights : topic.insights.filter(i => i.tier === filter);

  const filterTabs: { key: TierFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'breaking', label: 'Breaking' },
    { key: 'developing', label: 'Developing' },
    { key: 'established', label: 'Established' },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 px-5 pt-4 pb-3 border-b border-border">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Today's Briefing
        </button>
        <h1 className="text-xs font-semibold uppercase tracking-[0.15em] text-foreground mb-1">
          {topic.name}
        </h1>
        <p className="text-xs text-muted-foreground">
          {topic.insights.length} insights
          {topic.newCount != null && topic.newCount > 0 && (
            <span className="ml-1 text-tier-breaking font-medium">· {topic.newCount} new since yesterday</span>
          )}
        </p>

        {/* Filter tabs */}
        <div className="flex items-center gap-1 mt-3">
          {filterTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                filter === tab.key
                  ? 'bg-accent text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
              )}
            >
              {tab.key !== 'all' && (
                <span className={cn('h-1.5 w-1.5 rounded-full', TIER_DOT[tab.key])} />
              )}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Insights */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <div className="space-y-2">
          {filtered.map(insight => (
            <InsightCard
              key={insight.id}
              insight={insight}
              onOpen={onOpenInsight}
              onDiscuss={onDiscuss}
            />
          ))}
        </div>
      </div>

      {/* Build position CTA */}
      <div className="flex-shrink-0 border-t border-border px-5 py-3">
        <button
          onClick={() => onBuildPosition(topic)}
          className="w-full py-2 rounded-lg bg-emerging/10 text-emerging text-sm font-semibold hover:bg-emerging/20 transition-colors"
        >
          Build Position from this topic →
        </button>
      </div>
    </div>
  );
}
