import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { SignalCard, type SignalCardData } from './SignalCard';
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

interface InsightRow {
  id: string;
  title: string;
  tier: string | null;
  category: string | null;
  decision_question: string | null;
  user_relevance: string | null;
  convergence_reasoning: string | null;
  signal_ids: string[];
}

interface SignalDetailViewProps {
  insightIds: string[];
  onBack: () => void;
  onAddInsight: (id: string) => void;
  onRemoveInsight: (id: string) => void;
}

export function SignalDetailView({ insightIds, onBack, onAddInsight, onRemoveInsight }: SignalDetailViewProps) {
  const [insights, setInsights] = useState<InsightRow[]>([]);
  const [signals, setSignals] = useState<SignalCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSignalId, setExpandedSignalId] = useState<string | null>(null);
  const [showConvergence, setShowConvergence] = useState(false);

  useEffect(() => {
    if (insightIds.length === 0) return;

    async function fetchData() {
      setLoading(true);

      const { data: insightData } = await supabase
        .from('insights')
        .select('id, title, tier, category, decision_question, user_relevance, convergence_reasoning, signal_ids')
        .in('id', insightIds);

      const rows = (insightData ?? []) as InsightRow[];
      setInsights(rows);

      // Collect all signal IDs
      const allSignalIds = new Set<string>();
      rows.forEach(r => r.signal_ids?.forEach(id => allSignalIds.add(id)));

      if (allSignalIds.size > 0) {
        const { data: signalData } = await supabase
          .from('signals')
          .select('id, title, credibility, last_source_count, created_at, nb_relevance, raw_sources')
          .in('id', [...allSignalIds]);

        if (signalData) {
          setSignals(signalData.map((s: any) => ({
            id: s.id,
            title: s.title,
            credibility: s.credibility ?? 0,
            sources: s.last_source_count ?? 0,
            created_at: s.created_at,
            analysis_context: null,
            nb_relevance: s.nb_relevance,
            source_urls: [],
          })));
        }
      }

      setLoading(false);
    }

    fetchData();
  }, [insightIds]);

  const primaryInsight = insights.find(i => i.id === insightIds[0]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!primaryInsight) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-sm text-muted-foreground">Insight not found</span>
      </div>
    );
  }

  const tier = primaryInsight.tier ?? 'developing';
  const colors = TIER_COLORS[tier] || TIER_COLORS.developing;

  return (
    <div className="h-full overflow-y-auto px-4 py-6">
      <div>
        {/* Hero */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize whitespace-nowrap', colors.badge)}>
              {tier}
            </span>
            {primaryInsight.category && (
              <span className="text-xs text-muted-foreground uppercase tracking-wide">
                {primaryInsight.category}
              </span>
            )}
          </div>

          <h1 className="text-xl font-bold text-foreground leading-tight mb-2">
            {primaryInsight.title}
          </h1>

          {primaryInsight.decision_question && (
            <div className={cn('p-4 rounded-lg border-l-[3px] mb-4', colors.border, colors.bg)}>
              <p className="text-sm text-foreground/80 leading-relaxed italic">
                {primaryInsight.decision_question}
              </p>
            </div>
          )}

          {primaryInsight.user_relevance && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {primaryInsight.user_relevance}
            </p>
          )}
        </div>

        {/* Signals */}
        {signals.length > 0 && (
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
        )}

        {primaryInsight.convergence_reasoning && (
          <CollapsibleSection label="How these signals connect" open={showConvergence} onToggle={() => setShowConvergence(!showConvergence)}>
            <p className="text-sm text-foreground/70 leading-relaxed">{primaryInsight.convergence_reasoning}</p>
          </CollapsibleSection>
        )}
      </div>
    </div>
  );
}
