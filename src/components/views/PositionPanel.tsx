import { useState, useRef, useEffect } from 'react';
import { Share2, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SignalCard, type SignalCardData } from '@/components/views/SignalCard';
import { CollapsibleSection } from '@/components/views/CollapsibleSection';
import type { PositionData } from '@/data/mock';
import { useToast } from '@/hooks/use-toast';

export type PositionState = 'empty' | 'generating' | 'active';

const TIER_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  breaking: { bg: 'bg-tier-breaking/10', text: 'text-tier-breaking', label: 'Breaking' },
  developing: { bg: 'bg-tier-developing/10', text: 'text-tier-developing', label: 'Developing' },
  established: { bg: 'bg-tier-established/10', text: 'text-tier-established', label: 'Established' },
};

interface PositionPanelProps {
  state: PositionState;
  position: PositionData | null;
  collapsed: boolean;
  onToggleCollapse: () => void;
  activeLens?: 'executive' | 'leader' | 'ic';
}

export function PositionPanel({ state, position, collapsed, onToggleCollapse }: PositionPanelProps) {
  const { toast } = useToast();
  const animatedPositionRef = useRef<string | null>(null);
  const shouldAnimate = position?.id !== animatedPositionRef.current;

  useEffect(() => {
    if (position?.id) {
      animatedPositionRef.current = position.id;
    }
  }, [position?.id]);

  // Collapsed tab
  if (collapsed) {
    return (
      <button
        onClick={onToggleCollapse}
        className="w-10 h-full flex-shrink-0 border-l border-border bg-card hover:bg-accent/50 transition-colors flex items-center justify-center cursor-pointer"
      >
        <span
          className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground"
          style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
        >
          Position
        </span>
      </button>
    );
  }

  return (
    <div className="flex flex-col h-full border-l border-border bg-background">
      {/* Panel header with collapse button */}
      <div className="flex-shrink-0 flex items-center justify-between px-5 py-2.5 border-b border-border">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Position</span>
        <button
          onClick={onToggleCollapse}
          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {state === 'empty' && <EmptyState />}
        {state === 'generating' && <GeneratingState />}
        {state === 'active' && position && (
          <ActiveState position={position} shouldAnimate={shouldAnimate} toast={toast} />
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full px-8 text-center">
      <h2
        className="text-3xl italic text-muted-foreground/30 mb-3"
        style={{ fontFamily: "'Fraunces', serif" }}
      >
        position
      </h2>
      <p className="text-sm text-muted-foreground max-w-[240px] leading-relaxed">
        Select insights and chat with AUO to build a strategic position.
      </p>
    </div>
  );
}

function GeneratingState() {
  return (
    <div className="flex flex-col items-center justify-center h-full px-8 text-center gap-4">
      <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
      <p className="text-sm text-muted-foreground">Building position...</p>
      {/* Skeleton sections */}
      <div className="w-full max-w-sm space-y-3 mt-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="space-y-2 animate-pulse" style={{ animationDelay: `${i * 200}ms` }}>
            <div className="h-3 bg-muted rounded w-1/3" />
            <div className="h-2 bg-muted rounded w-full" />
            <div className="h-2 bg-muted rounded w-4/5" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ActiveState({
  position,
  shouldAnimate,
  toast,
}: {
  position: PositionData;
  shouldAnimate: boolean;
  toast: ReturnType<typeof useToast>['toast'];
}) {
  const [expandedSignals, setExpandedSignals] = useState<Record<string, boolean>>({});
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const tierInfo = TIER_BADGE[position.tier] || TIER_BADGE.established;
  const timestamp = new Date(position.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const handleShare = () => {
    navigator.clipboard.writeText(`Position: ${position.title}`);
    toast({ title: 'Copied', description: 'Position link copied to clipboard' });
  };

  const toggleSignal = (id: string) => {
    setExpandedSignals(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleSection = (id: string) => {
    setOpenSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Group signals by insight
  const signalsByInsight = position.insights_referenced.map(insight => ({
    insight,
    signals: position.signals.filter(s => s.insight_id === insight.id),
  }));

  const animDelay = (index: number) =>
    shouldAnimate ? { animation: `fade-in 0.4s ease-out ${index * 100}ms both` } : {};

  return (
    <div className="px-5 py-6 space-y-6">
      {/* Header */}
      <div style={animDelay(0)}>
        <div className="flex items-start justify-between gap-3 mb-2">
          <h1
            className="text-2xl font-semibold text-foreground leading-tight"
            style={{ fontFamily: "'Fraunces', serif" }}
          >
            {position.title}
          </h1>
          <button
            onClick={handleShare}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex-shrink-0"
          >
            <Share2 className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center gap-3">
          <span className={cn('text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full', tierInfo.bg, tierInfo.text)}>
            {tierInfo.label}
          </span>
          <span className="text-xs text-muted-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>
            {timestamp}
          </span>
          {/* Collaborator avatars */}
          <div className="flex -space-x-1.5 ml-auto">
            {position.collaborators.map(c => (
              <div
                key={c.id}
                title={c.name}
                className="h-6 w-6 rounded-full flex items-center justify-center text-[9px] font-medium text-background border-2 border-background"
                style={{ backgroundColor: c.color }}
              >
                {c.initials}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Evidence Base */}
      <div style={animDelay(1)}>
        <h2 className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-3">
          Evidence Base
        </h2>
        <div className="space-y-2">
          {position.insights_referenced.map(insight => {
            const t = TIER_BADGE[insight.tier] || TIER_BADGE.established;
            return (
              <div
                key={insight.id}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card"
              >
                <span className={cn('h-2 w-2 rounded-full flex-shrink-0', `bg-tier-${insight.tier}`)} />
                <span className="text-sm text-card-foreground line-clamp-1 flex-1">{insight.title}</span>
                <span className={cn('text-[9px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded', t.bg, t.text)}>
                  {t.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Signals grouped by insight */}
      {signalsByInsight.map(({ insight, signals }, groupIdx) => (
        <div key={insight.id} style={animDelay(2 + groupIdx)}>
          <CollapsibleSection
            label={`Signals — ${insight.title.slice(0, 40)}...`}
            open={openSections[insight.id] !== false}
            onToggle={() => toggleSection(insight.id)}
          >
            <div className="space-y-3">
              {signals.map(sig => {
                const cardData: SignalCardData = {
                  id: sig.id,
                  title: sig.title,
                  credibility: sig.credibility,
                  sources: sig.sources,
                  created_at: sig.created_at,
                  analysis_context: sig.analysis_context,
                  source_urls: [{ title: sig.source_url, url: sig.source_url, domain: new URL(sig.source_url).hostname }],
                };
                return (
                  <SignalCard
                    key={sig.id}
                    signal={cardData}
                    expanded={!!expandedSignals[sig.id]}
                    onToggle={() => toggleSignal(sig.id)}
                    commentCount={sig.comment_count}
                    showLiveBadge={sig.source === 'on_demand'}
                  />
                );
              })}
            </div>
          </CollapsibleSection>
        </div>
      ))}

      {/* David's Take */}
      <div style={animDelay(2 + signalsByInsight.length)}>
        <h2 className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-3">
          David's Take
        </h2>
        <div
          className="rounded-lg px-4 py-3 border-l-[3px] border-l-emerging bg-emerging/5"
        >
          <p className="text-sm text-foreground/80 leading-relaxed italic">
            {position.davids_take}
          </p>
        </div>
      </div>

      {/* Dynamic sections */}
      {position.sections.map((section, i) => (
        <div key={section.id} style={animDelay(3 + signalsByInsight.length + i)}>
          <h2 className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-2">
            {section.title}
          </h2>
          <p className="text-sm text-foreground/70" style={{ lineHeight: 1.7 }}>
            {section.content}
          </p>
        </div>
      ))}
    </div>
  );
}
