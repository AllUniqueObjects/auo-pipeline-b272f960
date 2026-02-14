import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSignalDetail } from '@/hooks/useSignalDetail';
import { ChatBar } from '@/components/ChatBar';

const URGENCY_VAR: Record<string, string> = {
  urgent: 'hsl(var(--urgent))',
  emerging: 'hsl(var(--emerging))',
  monitor: 'hsl(var(--monitoring))',
  monitoring: 'hsl(var(--monitoring))',
};

function parseAnalysisBullets(text: string): string[] {
  return text
    .split('\n')
    .filter(line => line.trim().startsWith('•') || line.trim().startsWith('-'))
    .map(line => line.replace(/^[•\-]\s*/, '').trim())
    .filter(Boolean);
}

function HighlightedText({ text }: { text: string }) {
  const parts = text.split(/(\$[\d,.]+[BMK]?|[\d,.]+%|\b\d{1,3}(?:,\d{3})*(?:\.\d+)?\b)/g);
  return (
    <>
      {parts.map((part, i) =>
        /^\$|^\d/.test(part)
          ? <strong key={i} className="font-semibold">{part}</strong>
          : <span key={i}>{part}</span>
      )}
    </>
  );
}

export default function SignalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { signal, connectedSignals, cluster, loading } = useSignalDetail(id);
  const [refsOpen, setRefsOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex justify-center items-center">
        <p className="text-sm text-muted-foreground">Loading signal...</p>
      </div>
    );
  }

  if (!signal) {
    return (
      <div className="min-h-screen bg-background flex justify-center items-center">
        <p className="text-sm text-muted-foreground">Signal not found</p>
      </div>
    );
  }

  const urgencyColor = URGENCY_VAR[signal.urgency] || URGENCY_VAR.monitor;
  const bullets = signal.analysis_context ? parseAnalysisBullets(signal.analysis_context) : [];
  const trustedPct = Math.round((signal.credibility || 0) * 100);
  const barColorVar = trustedPct > 50 ? '--ring' : trustedPct > 30 ? '--emerging' : '--urgent';

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-[680px] mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Canvas
          </button>
          <button
            onClick={() => navigate('/')}
            className="text-[18px] font-bold tracking-[0.3em] text-destructive"
          >
            A U O
          </button>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-6">
          {cluster && (
            <span className="rounded-full px-3 py-1 text-xs font-medium bg-accent text-accent-foreground">
              {cluster.name}
            </span>
          )}
          {signal.urgency === 'urgent' && (
            <span className="rounded-full px-3 py-1 text-xs font-medium bg-destructive text-destructive-foreground">
              URGENT
            </span>
          )}
          {signal.urgency === 'emerging' && (
            <span className="rounded-full px-3 py-1 text-xs font-medium bg-emerging text-emerging-foreground">
              EMERGING
            </span>
          )}
          {signal.adjacent_layer && (
            <span className="rounded-full px-3 py-1 text-xs text-muted-foreground border border-border">
              ◆ ADJACENT · {signal.adjacent_layer.toUpperCase()}
            </span>
          )}
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-foreground leading-tight mb-6">
          {signal.title}
        </h1>

        {/* Reference bar */}
        <div className="mb-8">
          <p className="text-sm text-muted-foreground mb-2">
            {signal.sources} references · {trustedPct}% from trusted sources
          </p>
          <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.max(trustedPct, 3)}%`,
                backgroundColor: `hsl(var(${barColorVar}))`,
              }}
            />
          </div>
        </div>

        {/* NB Impact callout */}
        {signal.nb_relevance && (
          <div
            className="rounded-lg p-4 mb-8"
            style={{
              borderLeft: '4px solid hsl(var(--nb-callout-border))',
              backgroundColor: 'hsl(var(--nb-callout))',
            }}
          >
            <p className="text-xs font-medium uppercase tracking-wider text-foreground mb-2">
              WHY THIS MATTERS FOR NB
            </p>
            <p className="text-sm text-foreground/80 leading-relaxed">
              {signal.nb_relevance}
            </p>
          </div>
        )}

        {/* Analysis bullets */}
        {bullets.length > 0 && (
          <div className="space-y-3 mb-8">
            {bullets.map((bullet, i) => {
              const isDecision = bullet.toLowerCase().startsWith('decision point');
              const text = isDecision ? bullet.replace(/^decision point:\s*/i, '') : bullet;
              return (
                <div key={i} className="flex gap-3 text-sm text-foreground/80 leading-relaxed">
                  <span className="text-muted-foreground mt-0.5 flex-shrink-0">•</span>
                  <span>
                    {isDecision && <span className="font-semibold text-foreground">Decision point: </span>}
                    <HighlightedText text={text} />
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Summary */}
        {signal.summary && (
          <div className="mb-8">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
              WHAT THIS MEANS FOR NB
            </p>
            <p className="text-sm text-foreground/80 leading-relaxed">
              {signal.summary}
            </p>
          </div>
        )}

        {/* Entity tags */}
        {signal.entity_tags && Array.isArray(signal.entity_tags) && (signal.entity_tags as unknown[]).length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            {(signal.entity_tags as unknown[]).map((tag, i) => (
              <span key={i} className="rounded-full bg-accent px-3 py-1 text-xs text-accent-foreground">
                {String(tag)}
              </span>
            ))}
          </div>
        )}

        {/* Decision question */}
        {signal.decision_question && (
          <div className="mb-8 border-l-2 border-border pl-4">
            <p className="text-sm italic text-foreground/70 leading-relaxed">
              {signal.decision_question}
            </p>
          </div>
        )}

        {/* Connected signals */}
        {connectedSignals.length > 0 && (
          <div className="mb-8">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-4">
              CONNECTED SIGNALS
            </p>
            <div className="space-y-3">
              {connectedSignals.map(cs => {
                const csColor = URGENCY_VAR[cs.signal.urgency] || URGENCY_VAR.monitor;
                return (
                  <button
                    key={cs.signal.id}
                    onClick={() => navigate(`/signal/${cs.signal.id}`)}
                    className="w-full rounded-xl border border-border bg-card p-4 text-left transition-all duration-200 hover:shadow-md"
                    style={{ borderLeftWidth: 4, borderLeftColor: csColor }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] tracking-[0.08em] font-medium uppercase" style={{ color: csColor }}>
                        ● {cs.edgeType}
                      </span>
                      <span className="text-muted-foreground text-sm">→</span>
                    </div>
                    <h3 className="text-sm font-medium text-card-foreground line-clamp-2 mb-1">
                      {cs.signal.title}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {cs.signal.urgency} · {cs.signal.sources} references
                    </p>
                    {cs.edgeLabel && (
                      <p className="text-xs text-muted-foreground mt-1 italic line-clamp-1">
                        {cs.edgeLabel}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* References toggle */}
        <div className="mb-8">
          <button
            onClick={() => setRefsOpen(!refsOpen)}
            className="text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
          >
            {refsOpen ? '▾' : '▸'} REFERENCES ({signal.sources})
          </button>
          {refsOpen && (
            <p className="mt-3 text-xs text-muted-foreground italic">
              Reference details will be available soon.
            </p>
          )}
        </div>
      </div>

      <ChatBar />
    </div>
  );
}
