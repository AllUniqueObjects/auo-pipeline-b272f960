import { cn } from '@/lib/utils';
import { type MockTopic, type TopicInsight } from '@/data/mock';

type LensType = 'executive' | 'leader' | 'ic';

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

const LENS_LABEL: Record<LensType, string> = {
  executive: 'Executive',
  leader: 'Leader',
  ic: 'Individual Contributor',
};

// Lens-aware topic sort: returns topics sorted for the given lens
function sortTopicsForLens(topics: MockTopic[], lens: LensType): MockTopic[] {
  const order: Record<LensType, string[]> = {
    executive: ['RETAIL SHELF COMPETITION', 'VIETNAM MANUFACTURING SQUEEZE', 'COMPETITIVE TECHNOLOGY'],
    ic: ['COMPETITIVE TECHNOLOGY', 'VIETNAM MANUFACTURING SQUEEZE', 'RETAIL SHELF COMPETITION'],
    leader: ['VIETNAM MANUFACTURING SQUEEZE', 'RETAIL SHELF COMPETITION', 'COMPETITIVE TECHNOLOGY'],
  };
  const priority = order[lens];
  return [...topics].sort((a, b) => {
    const ia = priority.indexOf(a.name);
    const ib = priority.indexOf(b.name);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
}

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
      {/* Tier dot */}
      <span className={cn('h-2 w-2 rounded-full mt-1.5 flex-shrink-0', TIER_DOT[insight.tier])} />

      {/* Content */}
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

      {/* Arrow */}
      <button
        onClick={e => { e.stopPropagation(); onOpen(insight.id); }}
        className="flex-shrink-0 text-muted-foreground group-hover:text-foreground transition-colors mt-0.5"
        aria-label="Open insight"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M5 2.5L9.5 7 5 11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}

interface TopicBlockProps {
  topic: MockTopic;
  onExplore: (topicId: string) => void;
  onOpenInsight: (insightId: string) => void;
  onBuildPosition: () => void;
}

function TopicBlock({ topic, onExplore, onOpenInsight, onBuildPosition }: TopicBlockProps) {
  return (
    <div className="mb-8">
      {/* Topic header */}
      <div className="flex items-center justify-between mb-2 px-1">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
          {topic.name}
        </h2>
        {topic.newCount != null && topic.newCount > 0 && (
          <span className="text-[10px] font-medium text-tier-breaking">
            ↑ {topic.newCount} new
          </span>
        )}
      </div>

      {/* Divider */}
      <div className="h-px bg-border mb-3" />

      {/* Insight rows */}
      <div className="space-y-0.5">
        {topic.insights.map(insight => (
          <InsightRow key={insight.id} insight={insight} onOpen={onOpenInsight} />
        ))}
      </div>

      {/* Footer actions */}
      <div className="flex items-center gap-2 mt-3 px-1">
        <button
          onClick={() => onExplore(topic.id)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
        >
          Explore all {topic.insights.length} →
        </button>
        <span className="text-muted-foreground/40 text-xs">·</span>
        <button
          onClick={onBuildPosition}
          className="text-xs text-emerging hover:text-emerging/80 transition-colors font-medium"
        >
          Build Position →
        </button>
      </div>
    </div>
  );
}

interface BriefingPanelProps {
  topics: MockTopic[];
  activeLens: LensType;
  onExplore: (topicId: string) => void;
  onOpenInsight: (insightId: string) => void;
  onBuildPosition: () => void;
}

export function BriefingPanel({ topics, activeLens, onExplore, onOpenInsight, onBuildPosition }: BriefingPanelProps) {
  const totalNew = topics.reduce((sum, t) => sum + (t.newCount ?? 0), 0);
  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const sortedTopics = sortTopicsForLens(topics, activeLens);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 px-5 pt-5 pb-4 border-b border-border">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground mb-1">
              Today's Briefing
            </h1>
            <p className="text-xs text-muted-foreground">
              {today} · {LENS_LABEL[activeLens]} lens
              {totalNew > 0 && (
                <span className="ml-1 text-tier-breaking font-medium">· {totalNew} new since yesterday</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-5 py-5">
        {sortedTopics.map(topic => (
          <TopicBlock
            key={topic.id}
            topic={topic}
            onExplore={onExplore}
            onOpenInsight={onOpenInsight}
            onBuildPosition={onBuildPosition}
          />
        ))}
      </div>
    </div>
  );
}
