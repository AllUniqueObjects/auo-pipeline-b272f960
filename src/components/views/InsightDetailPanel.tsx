import { useState } from 'react';
import { ChevronLeft, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type TopicInsight, MOCK_SIGNALS, MOCK_TOPIC_INSIGHTS } from '@/data/mock';
import { SignalCard, type SignalCardData } from '@/components/views/SignalCard';

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

const TIER_LABEL: Record<string, string> = {
  breaking: 'Breaking',
  developing: 'Developing',
  established: 'Established',
};

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function CollapsibleDetail({ title, children, defaultOpen = false }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-border pt-4">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full text-left group"
      >
        <h2 className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground group-hover:text-foreground transition-colors">
          {title}
        </h2>
        <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}

interface InsightDetailPanelProps {
  insight: TopicInsight;
  sourceName: string;
  onBack: () => void;
  onBuildPosition: () => void;
}

export function InsightDetailPanel({ insight, sourceName, onBack, onBuildPosition }: InsightDetailPanelProps) {
  const [expandedSignals, setExpandedSignals] = useState<Record<string, boolean>>({});

  // Use first few MOCK_SIGNALS as stand-in for this insight's signals
  const signals = MOCK_SIGNALS.slice(0, insight.basedOnSignals ?? 2);

  // Find which topic this insight belongs to
  const parentTopic = MOCK_TOPIC_INSIGHTS.find(t => t.insights.some(i => i.id === insight.id));

  return (
    <div className="flex flex-col h-full">
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-5 pt-4 pb-6 space-y-5">
          {/* Breadcrumb */}
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            {sourceName}
          </button>

          {/* Tier + category */}
          <div className="flex items-center gap-2">
            <span className={cn('h-2 w-2 rounded-full flex-shrink-0', TIER_DOT[insight.tier])} />
            <span className={cn('text-[10px] font-bold uppercase tracking-wider', TIER_TEXT[insight.tier])}>
              {TIER_LABEL[insight.tier]}
            </span>
            <span className="text-[10px] text-muted-foreground">·</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
              {parentTopic?.name ?? insight.category}
            </span>
          </div>

          {/* Title */}
          <h1
            className="text-xl font-semibold text-foreground leading-snug"
            style={{ fontFamily: "'Fraunces', serif" }}
          >
            {insight.title}
          </h1>

          {/* Decision question — amber blockquote */}
          {insight.decisionQuestion && (
            <div className="border-l-[3px] border-l-emerging bg-emerging/5 rounded-r-lg px-4 py-3">
              <p className="text-sm text-foreground/80 leading-relaxed italic">
                "{insight.decisionQuestion}"
              </p>
            </div>
          )}

          {/* What this means */}
          {insight.whatThisMeans && (
            <div>
              <h2 className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-2">
                What This Means for New Balance
              </h2>
              <div className="h-px bg-border mb-3" />
              <p className="text-sm text-foreground/70 leading-relaxed">
                {insight.whatThisMeans}
              </p>
            </div>
          )}

          {/* David can tell */}
          {insight.davidCanTell && (
            <div className="bg-card border border-border rounded-lg px-4 py-3">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1.5">
                David Can Tell His Team
              </p>
              <p className="text-sm text-foreground italic leading-relaxed">
                "{insight.davidCanTell}"
              </p>
            </div>
          )}

          {/* Based on N signals */}
          <CollapsibleDetail title={`Based on ${signals.length} Signals`} defaultOpen={true}>
            <div className="space-y-3">
              {signals.map(sig => {
                const cardData: SignalCardData = {
                  id: sig.id,
                  title: sig.title,
                  credibility: sig.credibility,
                  sources: sig.sources,
                  created_at: sig.created_at,
                  analysis_context: sig.analysis_context,
                  nb_relevance: sig.nb_relevance,
                  source_urls: sig.source_urls,
                };
                return (
                  <SignalCard
                    key={sig.id}
                    signal={cardData}
                    expanded={!!expandedSignals[sig.id]}
                    onToggle={() => setExpandedSignals(prev => ({ ...prev, [sig.id]: !prev[sig.id] }))}
                  />
                );
              })}
            </div>
          </CollapsibleDetail>

          {/* How signals connect */}
          <CollapsibleDetail title="How These Signals Connect">
            <p className="text-sm text-foreground/70 leading-relaxed">
              Three independent forces — tariff policy uncertainty, Vietnam labor inflation, and retail shelf dynamics — converge on the same decision window. Each signal reinforces the urgency of the others: the Supreme Court timeline is set, labor costs are rising regardless of tariff outcome, and retail negotiation windows close with March vendor reviews.
            </p>
          </CollapsibleDetail>

          {/* Why this tier */}
          <CollapsibleDetail title="Why This Tier">
            <p className="text-sm text-foreground/70 leading-relaxed">
              Classified as <span className={cn('font-medium', TIER_TEXT[insight.tier])}>{TIER_LABEL[insight.tier]}</span> because this insight intersects active priorities with a time-sensitive decision window. Reference velocity has increased significantly in the last 48 hours ({insight.references} total references, up from baseline).
            </p>
          </CollapsibleDetail>

          {/* Citations */}
          <CollapsibleDetail title={`${signals.reduce((s, sig) => s + sig.sources, 0)} Citations`}>
            <div className="space-y-2">
              {signals.flatMap(sig => sig.source_urls).map((src, i) => (
                <a
                  key={i}
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs text-foreground/70 hover:text-foreground transition-colors group"
                >
                  <span className="text-muted-foreground text-[10px] font-mono flex-shrink-0">{src.domain}</span>
                  <span className="truncate">{src.title}</span>
                </a>
              ))}
            </div>
          </CollapsibleDetail>
        </div>
      </div>

      {/* Build position CTA */}
      <div className="flex-shrink-0 border-t border-border px-5 py-3">
        <button
          onClick={onBuildPosition}
          className="w-full py-2 rounded-lg bg-emerging/10 text-emerging text-sm font-semibold hover:bg-emerging/20 transition-colors"
        >
          Build Position from this insight →
        </button>
      </div>
    </div>
  );
}
