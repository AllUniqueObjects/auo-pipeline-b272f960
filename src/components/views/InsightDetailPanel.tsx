import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { SignalCard, type SignalCardData } from '@/components/views/SignalCard';

// ─── Types ────────────────────────────────────────────────────────────────────

interface InsightRow {
  id: string;
  title: string;
  tier: string | null;
  user_relevance: string | null;
  urgency: string;
  cluster_name: string | null;
  signal_ids: string[];
  convergence_reasoning: string | null;
  decision_question: string | null;
  created_at: string | null;
}

interface SignalRow {
  id: string;
  title: string;
  summary: string | null;
  urgency: string;
  credibility: number | null;
  nb_relevance: string | null;
  last_source_count: number | null;
  created_at: string | null;
  raw_sources: RawSource[] | null;
}

interface RawSource {
  url: string;
  title: string;
  domain: string;
  source_api?: string;
  source_date?: string;
  query_origin?: string;
}

// ─── Tier display config ───────────────────────────────────────────────────────

const TIER_DOT: Record<string, string> = {
  breaking:    'bg-tier-breaking',
  developing:  'bg-tier-developing',
  established: 'bg-tier-established',
};

const TIER_TEXT: Record<string, string> = {
  breaking:    'text-tier-breaking',
  developing:  'text-tier-developing',
  established: 'text-tier-established',
};

const TIER_LABEL: Record<string, string> = {
  breaking:    'Breaking',
  developing:  'Developing',
  established: 'Established',
};

// ─── Collapsible section ───────────────────────────────────────────────────────

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

// ─── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonDetail() {
  return (
    <div className="px-5 pt-4 pb-6 space-y-5 animate-pulse">
      <div className="h-3 w-24 rounded bg-muted" />
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-muted" />
        <div className="h-3 w-20 rounded bg-muted" />
      </div>
      <div className="space-y-2">
        <div className="h-6 w-full rounded bg-muted" />
        <div className="h-6 w-4/5 rounded bg-muted" />
      </div>
      <div className="h-14 rounded-lg bg-muted/60" />
      <div className="space-y-1.5">
        <div className="h-3 w-full rounded bg-muted/60" />
        <div className="h-3 w-5/6 rounded bg-muted/60" />
        <div className="h-3 w-4/6 rounded bg-muted/60" />
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

interface InsightDetailPanelProps {
  insightId: string;
  sourceName: string;
  onBack: () => void;
  onBuildPosition: () => void;
}

export function InsightDetailPanel({ insightId, sourceName, onBack, onBuildPosition }: InsightDetailPanelProps) {
  const [insight, setInsight] = useState<InsightRow | null>(null);
  const [signals, setSignals] = useState<SignalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSignals, setExpandedSignals] = useState<Record<string, boolean>>({});
  

  useEffect(() => {
    if (!insightId) return;

    async function fetchData() {
      setLoading(true);
      setError(null);

      // Fetch insight row
      const { data: insightData, error: insightError } = await supabase
        .from('insights')
        .select('id, title, tier, user_relevance, urgency, cluster_name, signal_ids, convergence_reasoning, decision_question, created_at')
        .eq('id', insightId)
        .maybeSingle();

      if (insightError) {
        setError('Failed to load insight.');
        setLoading(false);
        return;
      }

      if (!insightData) {
        setError('Insight not found.');
        setLoading(false);
        return;
      }

      setInsight(insightData as InsightRow);

      // Fetch linked signals if any signal_ids exist
      const ids: string[] = insightData.signal_ids ?? [];
      if (ids.length > 0) {
        const { data: signalData, error: signalError } = await supabase
          .from('signals')
          .select('id, title, summary, urgency, credibility, nb_relevance, last_source_count, created_at, raw_sources')
          .in('id', ids);

        if (!signalError && signalData) {
          setSignals(signalData as unknown as SignalRow[]);
        }
      }

      setLoading(false);
    }

    fetchData();
  }, [insightId]);

  const tier = insight?.tier ?? 'established';

  return (
    <div className="flex flex-col h-full">
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <SkeletonDetail />
        ) : error ? (
          <div className="px-5 pt-8 text-center space-y-3">
            <p className="text-sm text-muted-foreground">{error}</p>
            <button
              onClick={onBack}
              className="text-xs text-foreground/60 hover:text-foreground transition-colors underline underline-offset-2"
            >
              Go back
            </button>
          </div>
        ) : insight ? (
          <div className="px-5 pt-4 pb-6 space-y-5">
            {/* Breadcrumb */}
            <button
              onClick={onBack}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              {sourceName}
            </button>

            {/* Tier + cluster */}
            <div className="flex items-center gap-2">
              <span className={cn('h-2 w-2 rounded-full flex-shrink-0', TIER_DOT[tier])} />
              <span className={cn('text-[10px] font-bold uppercase tracking-wider', TIER_TEXT[tier])}>
                {TIER_LABEL[tier] ?? tier}
              </span>
              {insight.cluster_name && (
                <>
                  <span className="text-[10px] text-muted-foreground">·</span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    {insight.cluster_name}
                  </span>
                </>
              )}
            </div>

            {/* Title */}
            <h1
              className="text-xl font-semibold text-foreground leading-snug"
              style={{ fontFamily: "'Fraunces', serif" }}
            >
              {insight.title}
            </h1>

            {/* user_relevance — amber, always visible */}
            {insight.user_relevance && (
              <p className="text-sm text-emerging leading-relaxed">
                {insight.user_relevance}
              </p>
            )}

            {/* Decision question — amber blockquote */}
            {insight.decision_question && (
              <div className="border-l-[3px] border-l-emerging bg-emerging/5 rounded-r-lg px-4 py-3">
                <p className="text-sm text-foreground/80 leading-relaxed italic">
                  "{insight.decision_question}"
                </p>
              </div>
            )}

            {/* Convergence reasoning */}
            {insight.convergence_reasoning && (
              <div>
                <h2 className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-2">
                  How These Signals Connect
                </h2>
                <div className="h-px bg-border mb-3" />
                <p className="text-sm text-foreground/70 leading-relaxed">
                  {insight.convergence_reasoning}
                </p>
              </div>
            )}

            {/* Linked signals */}
            {signals.length > 0 && (
              <CollapsibleDetail title={`Based on ${signals.length} Signal${signals.length !== 1 ? 's' : ''}`} defaultOpen={true}>
                <div className="space-y-3">
                  {signals.map(sig => {
                    const sorted = [...(sig.raw_sources ?? [])].sort((a, b) => {
                      if (a.source_api === 'exa_analysis' && b.source_api !== 'exa_analysis') return -1;
                      if (b.source_api === 'exa_analysis' && a.source_api !== 'exa_analysis') return 1;
                      const da = a.source_date ? new Date(a.source_date).getTime() : 0;
                      const db = b.source_date ? new Date(b.source_date).getTime() : 0;
                      return db - da;
                    });
                    const topSources = sorted.slice(0, 5).map(src => ({
                      title: src.title ?? src.url,
                      url: src.url,
                      domain: src.domain ?? new URL(src.url).hostname.replace('www.', ''),
                    }));

                    const cardData: SignalCardData = {
                      id: sig.id,
                      title: sig.title,
                      credibility: sig.credibility ?? 0,
                      sources: sig.last_source_count ?? 0,
                      created_at: sig.created_at ?? null,
                      analysis_context: sig.summary ?? null,
                      nb_relevance: sig.nb_relevance ?? null,
                      source_urls: topSources,
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
            )}

            {/* Tier classification */}
            <CollapsibleDetail title="Why This Tier">
              <p className="text-sm text-foreground/70 leading-relaxed">
                Classified as{' '}
                <span className={cn('font-medium', TIER_TEXT[tier])}>
                  {TIER_LABEL[tier] ?? tier}
                </span>{' '}
                based on urgency level <span className="font-medium">{insight.urgency}</span> and signal convergence across {signals.length} source{signals.length !== 1 ? 's' : ''}.
              </p>
            </CollapsibleDetail>
          </div>
        ) : null}
      </div>

      {/* Build position CTA */}
      {!loading && !error && insight && (
        <div className="flex-shrink-0 border-t border-border px-5 py-3">
          <button
            onClick={onBuildPosition}
            className="w-full py-2 rounded-lg bg-emerging/10 text-emerging text-sm font-semibold hover:bg-emerging/20 transition-colors"
          >
            Build Position from this insight →
          </button>
        </div>
      )}
    </div>
  );
}
