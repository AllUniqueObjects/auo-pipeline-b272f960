import { useState, useMemo } from 'react';
import { ChevronRight, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MOCK_INSIGHTS, MOCK_SIGNALS, MOCK_EVIDENCE_REFS } from '@/data/mock';

const TIER_COLORS: Record<string, { badge: string; bg: string; border: string }> = {
  breaking: {
    badge: 'bg-tier-breaking text-tier-breaking-foreground',
    bg: 'bg-tier-breaking/5',
    border: 'border-tier-breaking',
  },
  developing: {
    badge: 'bg-tier-developing text-tier-developing-foreground',
    bg: 'bg-tier-developing/5',
    border: 'border-tier-developing',
  },
  established: {
    badge: 'bg-tier-established text-tier-established-foreground',
    bg: 'bg-tier-established/5',
    border: 'border-tier-established',
  },
};

interface SignalDetailViewProps {
  insightId: string;
  onBack: () => void;
}

export function SignalDetailView({ insightId, onBack }: SignalDetailViewProps) {
  const insight = MOCK_INSIGHTS.find(i => i.id === insightId);
  const [showConvergence, setShowConvergence] = useState(false);
  const [showTierReasoning, setShowTierReasoning] = useState(false);
  const [showEvidence, setShowEvidence] = useState(false);
  const [expandedSignalId, setExpandedSignalId] = useState<string | null>(null);

  const signals = useMemo(() => {
    if (!insight?.signal_ids) return MOCK_SIGNALS;
    return MOCK_SIGNALS.filter(s => insight.signal_ids!.includes(s.id));
  }, [insight]);

  if (!insight) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-sm text-muted-foreground">Insight not found</span>
      </div>
    );
  }

  const tier = insight.tier;
  const colors = TIER_COLORS[tier] || TIER_COLORS.developing;

  return (
    <div className="h-full overflow-y-auto px-4 py-6">
      <div>
        {/* Hero */}
        <div className="mb-8">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3 min-w-0">
              <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize whitespace-nowrap', colors.badge)}>
                {tier}
              </span>
              <span className="text-xs text-muted-foreground uppercase tracking-wide whitespace-nowrap overflow-hidden text-ellipsis">
                {insight.category}
              </span>
            </div>
          </div>

          <h1 className="text-xl font-bold text-foreground leading-tight mb-4 line-clamp-3">
            {insight.title}
          </h1>

          {/* Decision question callout */}
          <div className={cn('p-4 rounded-lg border-l-[3px] mb-4', colors.border, colors.bg)}>
            <p className="text-sm text-foreground/80 leading-relaxed italic">
              {insight.decision_question}
            </p>
          </div>

          {/* User relevance */}
          <p className="text-sm text-muted-foreground leading-relaxed">
            {insight.user_relevance}
          </p>
        </div>

        {/* Signals */}
        <div className="mb-8">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-4">
            Based on {signals.length} signals
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {signals.map(signal => (
              <SignalCard
                key={signal.id}
                signal={signal}
                expanded={expandedSignalId === signal.id}
                onToggle={() => setExpandedSignalId(expandedSignalId === signal.id ? null : signal.id)}
              />
            ))}
          </div>
        </div>

        {/* Collapsible: How these signals connect */}
        {insight.convergence_reasoning && (
          <CollapsibleSection
            label="How these signals connect"
            open={showConvergence}
            onToggle={() => setShowConvergence(!showConvergence)}
          >
            <p className="text-sm text-foreground/70 leading-relaxed">
              {insight.convergence_reasoning}
            </p>
          </CollapsibleSection>
        )}

        {/* Collapsible: Why this tier */}
        <CollapsibleSection
          label="Why this tier"
          open={showTierReasoning}
          onToggle={() => setShowTierReasoning(!showTierReasoning)}
        >
          <p className="text-sm text-foreground/70 leading-relaxed">
            {insight.tier_reasoning}
          </p>
        </CollapsibleSection>

        {/* Evidence */}
        <CollapsibleSection
          label={`${MOCK_EVIDENCE_REFS.length} citations`}
          open={showEvidence}
          onToggle={() => setShowEvidence(!showEvidence)}
        >
          <div className="space-y-1">
            {MOCK_EVIDENCE_REFS.map((ref, i) => (
              <div key={i} className="flex gap-3 text-sm py-2 px-3 rounded bg-muted/30">
                <span className="text-xs font-mono text-muted-foreground flex-shrink-0 mt-0.5">
                  [{ref.number}]
                </span>
                <p className="text-foreground/70 text-xs leading-relaxed overflow-hidden text-ellipsis">
                  {ref.signal_excerpt}
                </p>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      </div>
    </div>
  );
}

function CollapsibleSection({
  label,
  open,
  onToggle,
  children,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <button
        onClick={onToggle}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronRight className={cn('h-3 w-3 transition-transform', open && 'rotate-90')} />
        {label}
      </button>
      {open && <div className="mt-2 pl-4">{children}</div>}
    </div>
  );
}

function SignalCard({ signal, expanded, onToggle }: {
  signal: typeof MOCK_SIGNALS[number];
  expanded: boolean;
  onToggle: () => void;
}) {
  const credPct = Math.round(signal.credibility * 100);
  const barColor = credPct > 50 ? 'bg-ring' : credPct > 30 ? 'bg-tier-developing' : 'bg-tier-breaking';
  const relTime = formatRelative(new Date(signal.created_at));

  return (
    <div
      onClick={onToggle}
      className={cn(
        'text-left rounded-lg border bg-card p-4 transition-all duration-200 overflow-hidden cursor-pointer',
        expanded
          ? 'border-ring/40 bg-accent/5 md:col-span-2'
          : 'border-border hover:border-muted-foreground/30'
      )}
      style={{ overflowWrap: 'break-word' }}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <h3 className={cn('text-sm font-medium text-card-foreground leading-snug', !expanded && 'line-clamp-2')}>
          {signal.title}
        </h3>
        <span className="text-xs text-muted-foreground flex-shrink-0 whitespace-nowrap">{relTime}</span>
      </div>

      <div className="flex items-center gap-4 mb-1.5 text-xs text-muted-foreground whitespace-nowrap">
        <span>{signal.sources} sources</span>
        <span className="flex items-center gap-1.5">
          Credibility
          <span className="inline-block w-12 h-1.5 rounded-full bg-muted overflow-hidden">
            <span
              className={cn('block h-full rounded-full', barColor)}
              style={{ width: `${Math.max(credPct, 5)}%` }}
            />
          </span>
          <span className="text-[10px]">{credPct}%</span>
        </span>
      </div>

      {expanded && (
        <>
          <p className="text-xs text-foreground/60 leading-relaxed mb-1.5" style={{ overflowWrap: 'break-word' }}>
            {signal.analysis_context}
          </p>

          {/* Source links */}
          {signal.source_urls.length > 0 && (
            <div className="mt-3 pt-2.5 border-t border-border/50">
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Sources</span>
              <div className="mt-1.5 space-y-1">
                {signal.source_urls.map((src, i) => (
                  <a
                    key={i}
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="flex items-center gap-2 text-xs text-foreground/70 hover:text-foreground transition-colors group"
                  >
                    <span className="text-muted-foreground text-[10px] font-mono flex-shrink-0">{src.domain}</span>
                    <span className="truncate">{src.title}</span>
                    <ExternalLink className="h-3 w-3 flex-shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <p className={cn('text-xs text-muted-foreground italic', !expanded && 'line-clamp-1')} style={{ overflowWrap: 'break-word' }}>
        {signal.nb_relevance}
      </p>
    </div>
  );
}

function formatRelative(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
