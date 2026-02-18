import { cn } from '@/lib/utils';
import { type MockTopic, type TopicInsight, type LensType, LENS_LABELS, LENS_CATEGORY_ORDER } from '@/data/mock';

const TIER_PILL: Record<string, string> = {
  breaking: 'bg-tier-breaking/10 text-tier-breaking',
  developing: 'bg-tier-developing/10 text-tier-developing',
  established: 'bg-muted text-muted-foreground',
};

const TIER_ACCENT: Record<string, string> = {
  breaking: 'border-l-tier-breaking',
  developing: 'border-l-tier-developing',
  established: 'border-l-border',
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
        <span
          className={cn('block h-full rounded-full', color)}
          style={{ width: `${pct}%` }}
        />
      </span>
      <span className="text-[10px] text-muted-foreground">{pct}%</span>
    </span>
  );
}

interface InsightCardProps {
  insight: TopicInsight;
  onOpen: (id: string) => void;
  onDiscuss: (insight: TopicInsight) => void;
  isUrgent?: boolean;
}

function InsightCard({ insight, onOpen, onDiscuss, isUrgent }: InsightCardProps) {
  return (
    <div
      onClick={() => onOpen(insight.id)}
      className={cn(
        'group rounded-xl border border-border hover:border-muted-foreground/30 transition-all duration-150 cursor-pointer overflow-hidden',
        isUrgent ? 'bg-tier-breaking/[0.03] hover:bg-tier-breaking/[0.06]' : 'hover:bg-accent/30'
      )}
    >
      {/* Top row: tier badge + live + momentum */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1.5">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full',
              TIER_PILL[insight.tier]
            )}
          >
            {insight.tier}
          </span>
          {insight.isLive && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[hsl(var(--live-blue))]/10">
              <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--live-blue))] animate-pulse" />
              <span className="text-[9px] font-bold uppercase tracking-wider text-[hsl(var(--live-blue))]">
                Live
              </span>
            </span>
          )}
        </div>
        {insight.momentum && insight.momentumLabel && (
          <span className="text-[10px] font-medium text-tier-breaking">
            ↑ {insight.momentumLabel}
          </span>
        )}
      </div>

      {/* Title */}
      <p className="px-4 py-1 text-sm font-medium text-foreground leading-snug">
        {insight.title}
      </p>

      {/* Quote — davidCanTell */}
      {insight.davidCanTell && (
        <p className="px-4 pb-2.5 text-[11px] text-muted-foreground italic leading-snug line-clamp-2">
          "{insight.davidCanTell}"
        </p>
      )}

      {/* Footer: refs + cred bar */}
      <div className="flex items-center justify-between px-4 pb-3 pt-2 border-t border-border/50">
        <span className="text-[10px] text-muted-foreground">{insight.references} refs</span>
        <CredBar value={insight.credibility} />
      </div>

      {/* Hover actions */}
      <div className="px-4 pb-3 pt-0 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        <button
          onClick={e => {
            e.stopPropagation();
            onDiscuss(insight);
          }}
          className="text-[11px] font-medium text-muted-foreground hover:text-foreground border border-border rounded-md px-2.5 py-1 hover:bg-background transition-colors"
        >
          Ask AUO →
        </button>
        <button
          onClick={e => {
            e.stopPropagation();
            onOpen(insight.id);
          }}
          className="text-[11px] font-medium text-foreground border border-border rounded-md px-2.5 py-1 hover:bg-background transition-colors"
        >
          Explore detail →
        </button>
      </div>
    </div>
  );
}

// Determine dominant tier for accent stripe
function dominantTier(insights: TopicInsight[]): string {
  if (insights.some(i => i.tier === 'breaking')) return 'breaking';
  if (insights.some(i => i.tier === 'developing')) return 'developing';
  return 'established';
}

// Sort topics for lens
function sortTopicsForLens(topics: MockTopic[], lens: LensType): MockTopic[] {
  const priority = LENS_CATEGORY_ORDER[lens] ?? LENS_CATEGORY_ORDER['balanced'];
  return [...topics].sort((a, b) => {
    const ia = priority.indexOf(a.name);
    const ib = priority.indexOf(b.name);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
}

interface TopicBlockProps {
  topic: MockTopic;
  onExplore: (topicId: string) => void;
  onOpenInsight: (insightId: string) => void;
  onBuildPosition: (topic: MockTopic) => void;
  onDiscuss: (insight: TopicInsight) => void;
}

function TopicBlock({ topic, onExplore, onOpenInsight, onBuildPosition, onDiscuss }: TopicBlockProps) {
  const dom = dominantTier(topic.insights);

  return (
    <div className={cn('mb-8 pl-3 border-l-2', TIER_ACCENT[dom])}>
      {/* Topic header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-foreground">
          {topic.name}
        </h2>
        {topic.newCount != null && topic.newCount > 0 && (
          <span className="text-[10px] font-medium text-tier-breaking">
            ↑ {topic.newCount} new
          </span>
        )}
      </div>

      {/* Insight cards */}
      <div className="space-y-2">
        {topic.insights.map((insight, idx) => (
          <InsightCard
            key={insight.id}
            insight={insight}
            onOpen={onOpenInsight}
            onDiscuss={onDiscuss}
            isUrgent={insight.tier === 'breaking' && idx < 2}
          />
        ))}
      </div>

      {/* Footer actions */}
      <div className="flex items-center gap-2 mt-3">
        <button
          onClick={() => onExplore(topic.id)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
        >
          Explore all {topic.insights.length} →
        </button>
        <span className="text-muted-foreground/40 text-xs">·</span>
        <button
          onClick={() => onBuildPosition(topic)}
          className="text-xs text-emerging hover:text-emerging/80 transition-colors font-semibold"
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
  onBuildPosition: (topic: MockTopic) => void;
  onDiscuss: (insight: TopicInsight) => void;
}

export function BriefingPanel({
  topics,
  activeLens,
  onExplore,
  onOpenInsight,
  onBuildPosition,
  onDiscuss,
}: BriefingPanelProps) {
  const totalNew = topics.reduce((sum, t) => sum + (t.newCount ?? 0), 0);
  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const sortedTopics = sortTopicsForLens(topics, activeLens);

  // Most urgent breaking signal teaser
  const urgentSignal = sortedTopics
    .flatMap(t => t.insights)
    .find(i => i.tier === 'breaking' && i.momentumLabel);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 px-5 pt-5 pb-4 border-b border-border">
        <h1 className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground mb-1">
          Today's Briefing
        </h1>
        <p className="text-xs text-muted-foreground">
          {today}
          {totalNew > 0 && (
            <span className="text-tier-breaking font-medium"> · {totalNew} new signals since yesterday</span>
          )}
          <span className="text-muted-foreground/60"> · {LENS_LABELS[activeLens]} lens</span>
        </p>
        {urgentSignal && (
          <p className="text-xs text-foreground/60 mt-1.5 italic line-clamp-1">
            ↑ Most urgent: {urgentSignal.title}
          </p>
        )}
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
            onDiscuss={onDiscuss}
          />
        ))}
      </div>
    </div>
  );
}
