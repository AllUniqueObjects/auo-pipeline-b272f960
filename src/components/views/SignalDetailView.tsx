import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type Insight = Tables<'insights'>;
type Signal = Tables<'signals'>;
type Edge = Tables<'signal_edges'>;

interface SignalDetailViewProps {
  insightId: string;
  onBack: () => void;
}

const TIER_COLORS: Record<string, { badge: string; border: string }> = {
  breaking: {
    badge: 'bg-tier-breaking text-tier-breaking-foreground',
    border: 'hsl(var(--tier-breaking))',
  },
  developing: {
    badge: 'bg-tier-developing text-tier-developing-foreground',
    border: 'hsl(var(--tier-developing))',
  },
  established: {
    badge: 'bg-tier-established text-tier-established-foreground',
    border: 'hsl(var(--tier-established))',
  },
};

export function SignalDetailView({ insightId, onBack }: SignalDetailViewProps) {
  const [insight, setInsight] = useState<Insight | null>(null);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const { data: ins } = await supabase
        .from('insights')
        .select('*')
        .eq('id', insightId)
        .single();

      if (!ins) { setLoading(false); return; }
      setInsight(ins);

      const signalIds = ins.signal_ids || [];
      if (signalIds.length > 0) {
        const { data: sigs } = await supabase
          .from('signals')
          .select('*')
          .in('id', signalIds);

        if (sigs) setSignals(sigs);

        // Fetch edges between these signals
        const { data: edgesData } = await supabase
          .from('signal_edges')
          .select('*')
          .or(`source_id.in.(${signalIds.join(',')}),target_id.in.(${signalIds.join(',')})`);

        if (edgesData) setEdges(edgesData);
      }

      setLoading(false);
    };
    fetchData();
  }, [insightId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <span className="text-sm text-muted-foreground">Loading insight...</span>
      </div>
    );
  }

  if (!insight) {
    return (
      <div className="flex justify-center items-center h-full">
        <span className="text-sm text-muted-foreground">Insight not found</span>
      </div>
    );
  }

  const tier = (insight.tier || 'developing') as keyof typeof TIER_COLORS;
  const colors = TIER_COLORS[tier] || TIER_COLORS.developing;
  const evidenceRefs = Array.isArray(insight.evidence_refs) ? (insight.evidence_refs as EvidenceRef[]) : [];

  return (
    <div className="h-full overflow-y-auto px-4 py-6">
      <div className="max-w-3xl mx-auto">
        {/* Insight header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize', colors.badge)}>
              {tier}
            </span>
            {insight.category && (
              <span className="text-xs text-muted-foreground uppercase tracking-wide">
                {insight.category}
              </span>
            )}
          </div>

          <h1 className="text-xl font-bold text-foreground leading-tight mb-4">
            {insight.title}
          </h1>

          {insight.decision_question && (
            <p className="text-sm text-foreground/80 leading-relaxed mb-4 border-l-2 pl-4 italic"
              style={{ borderColor: colors.border }}>
              {insight.decision_question}
            </p>
          )}

          {insight.user_relevance && (
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              {insight.user_relevance}
            </p>
          )}

          {insight.convergence_reasoning && (
            <div className="mb-4">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                How these signals connect
              </p>
              <p className="text-sm text-foreground/70 leading-relaxed">
                {insight.convergence_reasoning}
              </p>
            </div>
          )}

          {insight.tier_reasoning && (
            <div className="mb-4 p-4 rounded-lg bg-muted/50 border border-border">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">
                Tier reasoning
              </p>
              <p className="text-sm text-foreground/70 leading-relaxed">
                {insight.tier_reasoning}
              </p>
            </div>
          )}
        </div>

        {/* Signals section */}
        <div className="mb-8">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-4">
            Based on {signals.length} signals
          </p>
          <div className="space-y-3">
            {signals.map(signal => (
              <SignalCard key={signal.id} signal={signal} />
            ))}
          </div>
        </div>

        {/* Evidence refs */}
        {evidenceRefs.length > 0 && (
          <div className="mb-8">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-4">
              Evidence citations ({evidenceRefs.length})
            </p>
            <div className="space-y-2">
              {evidenceRefs.map((ref, i) => (
                <div key={i} className="flex gap-3 text-sm p-3 rounded-lg bg-muted/30 border border-border">
                  <span className="text-xs font-mono text-muted-foreground flex-shrink-0 mt-0.5">
                    [{ref.number || i + 1}]
                  </span>
                  <p className="text-foreground/70 text-xs leading-relaxed">
                    {ref.signal_excerpt || ref.excerpt || ''}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface EvidenceRef {
  number?: number;
  signal_id?: string;
  signal_excerpt?: string;
  excerpt?: string;
}

function SignalCard({ signal }: { signal: Signal }) {
  const credPct = Math.round((signal.credibility || 0) * 100);
  const barColor = credPct > 50 ? 'bg-ring' : credPct > 30 ? 'bg-tier-developing' : 'bg-tier-breaking';

  // Extract "David can tell his team:" section from analysis_context
  const takeaway = signal.analysis_context
    ? extractTakeaway(signal.analysis_context)
    : null;

  const relativeTime = signal.created_at ? formatRelative(new Date(signal.created_at)) : '';

  return (
    <div className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-muted-foreground/30">
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className="text-sm font-medium text-card-foreground leading-snug">
          {signal.title}
        </h3>
        <span className="text-xs text-muted-foreground flex-shrink-0">{relativeTime}</span>
      </div>

      {/* Metrics row */}
      <div className="flex items-center gap-4 mb-3 text-xs text-muted-foreground">
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

      {/* Takeaway */}
      {takeaway && (
        <p className="text-xs text-foreground/60 leading-relaxed line-clamp-3">
          {takeaway}
        </p>
      )}

      {/* NB relevance */}
      {signal.nb_relevance && (
        <p className="text-xs text-muted-foreground mt-2 italic line-clamp-2">
          {signal.nb_relevance}
        </p>
      )}
    </div>
  );
}

function extractTakeaway(text: string): string | null {
  const match = text.match(/David can tell his team[:\s]+(.+?)(?:\n|$)/i);
  if (match) return match[1].trim();
  // Fallback: first meaningful line
  const lines = text.split('\n').filter(l => l.trim().length > 20);
  return lines[0]?.replace(/^[•\-]\s*/, '').trim() || null;
}

function formatRelative(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
