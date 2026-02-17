import { useState, useMemo } from 'react';
import { X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MOCK_INSIGHTS, MOCK_SIGNALS, MOCK_EVIDENCE_REFS } from '@/data/mock';
import { SignalCard } from './SignalCard';
import { CollapsibleSection } from './CollapsibleSection';

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
  insightIds: string[];
  onBack: () => void;
  onAddInsight: (id: string) => void;
  onRemoveInsight: (id: string) => void;
}

export function SignalDetailView({ insightIds, onBack, onAddInsight, onRemoveInsight }: SignalDetailViewProps) {
  const primaryInsight = MOCK_INSIGHTS.find(i => i.id === insightIds[0]);
  const selectedInsights = insightIds.map(id => MOCK_INSIGHTS.find(i => i.id === id)).filter(Boolean);
  const [showConvergence, setShowConvergence] = useState(false);
  const [showTierReasoning, setShowTierReasoning] = useState(false);
  const [showEvidence, setShowEvidence] = useState(false);
  const [expandedSignalId, setExpandedSignalId] = useState<string | null>(null);
  const [showAddDropdown, setShowAddDropdown] = useState(false);

  // Merge signals from all selected insights, deduplicated
  const signals = useMemo(() => {
    const allSignalIds = new Set<string>();
    selectedInsights.forEach(insight => {
      insight?.signal_ids?.forEach(id => allSignalIds.add(id));
    });
    if (allSignalIds.size === 0) return MOCK_SIGNALS;
    return MOCK_SIGNALS.filter(s => allSignalIds.has(s.id));
  }, [insightIds]);

  const unselectedInsights = MOCK_INSIGHTS.filter(i => !insightIds.includes(i.id));

  if (!primaryInsight) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-sm text-muted-foreground">Insight not found</span>
      </div>
    );
  }

  const tier = primaryInsight.tier;
  const colors = TIER_COLORS[tier] || TIER_COLORS.developing;

  return (
    <div className="h-full overflow-y-auto px-4 py-6">
      <div>
        {/* Multi-insight pills */}
        {insightIds.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {selectedInsights.map(insight => {
              if (!insight) return null;
              const tc = TIER_COLORS[insight.tier] || TIER_COLORS.developing;
              return (
                <span
                  key={insight.id}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border',
                    tc.border, tc.bg
                  )}
                >
                  <span className="truncate max-w-[160px]">{insight.title.slice(0, 30)}...</span>
                  {insightIds.length > 1 && (
                    <button
                      onClick={() => onRemoveInsight(insight.id)}
                      className="p-0.5 rounded-full hover:bg-foreground/10 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </span>
              );
            })}
            {/* Add Insight button */}
            <div className="relative">
              <button
                onClick={() => setShowAddDropdown(!showAddDropdown)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground transition-colors"
              >
                <Plus className="h-3 w-3" />
                Add Insight
              </button>
              {showAddDropdown && unselectedInsights.length > 0 && (
                <div className="absolute left-0 top-full mt-1 w-72 bg-card border border-border rounded-lg shadow-lg z-50 py-1 max-h-64 overflow-y-auto">
                  {unselectedInsights.map(insight => {
                    const tc = TIER_COLORS[insight.tier] || TIER_COLORS.developing;
                    return (
                      <button
                        key={insight.id}
                        onClick={() => {
                          onAddInsight(insight.id);
                          setShowAddDropdown(false);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-accent/50 transition-colors flex items-center gap-2"
                      >
                        <span className={cn('h-2 w-2 rounded-full flex-shrink-0', tc.badge.split(' ')[0])} />
                        <span className="text-sm text-card-foreground truncate">{insight.title}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Hero */}
        <div className="mb-8">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3 min-w-0">
              <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize whitespace-nowrap', colors.badge)}>
                {tier}
              </span>
              <span className="text-xs text-muted-foreground uppercase tracking-wide whitespace-nowrap overflow-hidden text-ellipsis">
                {primaryInsight.category}
              </span>
            </div>
          </div>

          <h1 className="text-xl font-bold text-foreground leading-tight mb-2 line-clamp-3">
            {primaryInsight.title}
          </h1>

          {insightIds.length > 1 && (
            <p className="text-xs text-muted-foreground mb-4">
              Combined with {insightIds.length - 1} other insight{insightIds.length > 2 ? 's' : ''}
            </p>
          )}

          {/* Decision question callout */}
          <div className={cn('p-4 rounded-lg border-l-[3px] mb-4', colors.border, colors.bg)}>
            <p className="text-sm text-foreground/80 leading-relaxed italic">
              {primaryInsight.decision_question}
            </p>
          </div>

          {/* User relevance */}
          <p className="text-sm text-muted-foreground leading-relaxed">
            {primaryInsight.user_relevance}
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

        {/* Collapsible sections */}
        {primaryInsight.convergence_reasoning && (
          <CollapsibleSection label="How these signals connect" open={showConvergence} onToggle={() => setShowConvergence(!showConvergence)}>
            <p className="text-sm text-foreground/70 leading-relaxed">{primaryInsight.convergence_reasoning}</p>
          </CollapsibleSection>
        )}

        <CollapsibleSection label="Why this tier" open={showTierReasoning} onToggle={() => setShowTierReasoning(!showTierReasoning)}>
          <p className="text-sm text-foreground/70 leading-relaxed">{primaryInsight.tier_reasoning}</p>
        </CollapsibleSection>

        <CollapsibleSection label={`${MOCK_EVIDENCE_REFS.length} citations`} open={showEvidence} onToggle={() => setShowEvidence(!showEvidence)}>
          <div className="space-y-1">
            {MOCK_EVIDENCE_REFS.map((ref, i) => (
              <div key={i} className="flex gap-3 text-sm py-2 px-3 rounded bg-muted/30">
                <span className="text-xs font-mono text-muted-foreground flex-shrink-0 mt-0.5">[{ref.number}]</span>
                <p className="text-foreground/70 text-xs leading-relaxed overflow-hidden text-ellipsis">{ref.signal_excerpt}</p>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      </div>
    </div>
  );
}

