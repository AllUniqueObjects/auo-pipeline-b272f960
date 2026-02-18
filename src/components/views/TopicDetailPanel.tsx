import { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type MockTopic, type TopicInsight } from '@/data/mock';

type TierFilter = 'all' | 'breaking' | 'developing' | 'established';

const TIER_DOT: Record<string, string> = {
  breaking: 'bg-tier-breaking',
  developing: 'bg-tier-developing',
  established: 'bg-tier-established',
};

const TIER_TEXT: Record<string, string> = {
  breaking: 'text-tier-breaking',
  developing: 'text-tier-developing',
  established: 'text-tier-established',
};

function CredBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 80 ? 'bg-tier-established' : pct >= 60 ? 'bg-tier-developing' : 'bg-tier-breaking';
  return (
    <span className="inline-flex items-center gap-1">
      <span className="inline-block w-10 h-1 rounded-full bg-muted overflow-hidden">
        <span className={cn('block h-full rounded-full', color)} style={{ width: `${pct}%` }} />
      </span>
      <span className="text-[10px] text-muted-foreground">{pct}%</span>
    </span>
  );
}

interface InsightRowProps {
  insight: TopicInsight;
  onOpen: (id: string) => void;
}

function InsightRow({ insight, onOpen }: InsightRowProps) {
  return (
    <div
      onClick={() => onOpen(insight.id)}
      className="group flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-accent/40 transition-colors cursor-pointer border border-transparent hover:border-border"
    >
      <span className={cn('h-2 w-2 rounded-full mt-1.5 flex-shrink-0', TIER_DOT[insight.tier])} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground leading-snug line-clamp-2 mb-1">
          {insight.title}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-muted-foreground">{insight.references} refs</span>
          <span className="text-[10px] text-muted-foreground">·</span>
          <CredBar value={insight.credibility} />
          {insight.momentum && insight.momentumLabel && (
            <>
              <span className="text-[10px] text-muted-foreground">·</span>
              <span className={cn('text-[10px] font-medium', TIER_TEXT[insight.tier])}>
                ↑ {insight.momentumLabel}
              </span>
            </>
          )}
          {insight.isLive && (
            <>
              <span className="text-[10px] text-muted-foreground">·</span>
              <span className="inline-flex items-center gap-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--live-blue))] animate-pulse" />
                <span className="text-[10px] font-mono text-[hsl(var(--live-blue))] uppercase tracking-wider">Live</span>
              </span>
            </>
          )}
        </div>
        {insight.davidCanTell && (
          <p className="text-[11px] text-muted-foreground italic mt-1 line-clamp-2 leading-snug">
            "{insight.davidCanTell}"
          </p>
        )}
      </div>
      <button
        onClick={e => { e.stopPropagation(); onOpen(insight.id); }}
        className="flex-shrink-0 text-muted-foreground group-hover:text-foreground transition-colors mt-0.5"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M5 2.5L9.5 7 5 11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}

interface TopicDetailPanelProps {
  topic: MockTopic;
  onBack: () => void;
  onOpenInsight: (id: string) => void;
  onBuildPosition: () => void;
}

export function TopicDetailPanel({ topic, onBack, onOpenInsight, onBuildPosition }: TopicDetailPanelProps) {
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
        <h1 className="text-[11px] font-medium uppercase tracking-[0.15em] text-foreground mb-1">
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
        <div className="space-y-0.5">
          {filtered.map(insight => (
            <InsightRow key={insight.id} insight={insight} onOpen={onOpenInsight} />
          ))}
        </div>
      </div>

      {/* Build position CTA */}
      <div className="flex-shrink-0 border-t border-border px-5 py-3">
        <button
          onClick={onBuildPosition}
          className="w-full py-2 rounded-lg bg-emerging/10 text-emerging text-sm font-semibold hover:bg-emerging/20 transition-colors"
        >
          Build Position from this topic →
        </button>
      </div>
    </div>
  );
}
