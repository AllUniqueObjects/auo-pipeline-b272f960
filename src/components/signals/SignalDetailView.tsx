import { useState } from 'react';
import { format } from 'date-fns';
import type { Signal, ClusterWithColor } from '@/hooks/useSignalGraphData';

interface SignalDetailViewProps {
  signal: Signal;
  cluster: ClusterWithColor | null;
  relatedSignals: Signal[];
  onBack: () => void;
  onSelectSignal: (signal: Signal) => void;
}

export function SignalDetailView({
  signal,
  cluster,
  relatedSignals,
  onBack,
  onSelectSignal,
}: SignalDetailViewProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const backLabel = cluster ? cluster.name : 'SIGNALS';
  const backColor = cluster ? cluster.color.text : '#6b6b7b';
  const sourceCount = signal.sources || 0;

  return (
    <div className="min-h-screen px-[60px] py-10 max-w-[640px] mx-auto animate-fade-in">
      {/* Back navigation */}
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-[11px] tracking-[0.12em] uppercase hover:opacity-70 transition-opacity"
        style={{ fontWeight: 500, color: backColor }}
      >
        ← {backLabel}
      </button>

      {/* Signal header */}
      <div className="mt-12">
        <h1 className="text-[20px] leading-[1.3] font-normal text-foreground">
          {signal.title}
        </h1>

        <p className="mt-3 text-[13px] leading-[1.6] font-light text-muted-foreground">
          {signal.summary}
        </p>

        <p className="mt-3 text-[11px] font-light text-muted-foreground/60">
          {signal.urgency || 'stable'} · {sourceCount} source{sourceCount !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Decision question - HERO */}
      {signal.decision_question && (
        <p className="mt-12 text-[17px] leading-[1.5] italic font-light text-foreground">
          {signal.decision_question}
        </p>
      )}

      {/* Collapsible sections */}
      <div className="mt-12 space-y-4">
        {/* Analysis */}
        {signal.analysis_context && (
          <div>
            <button
              onClick={() => toggleSection('analysis')}
              className="text-[11px] tracking-[0.08em] uppercase hover:opacity-70 transition-opacity font-medium text-muted-foreground"
            >
              ▸ Full analysis
            </button>
            {expandedSections.has('analysis') && (
              <div className="mt-3 text-[13px] leading-[1.7] font-light text-muted-foreground">
                {signal.analysis_context.split('\n\n').map((paragraph, i) => (
                  <p key={i} className={i > 0 ? 'mt-3' : ''}>
                    {paragraph}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Related signals */}
      {cluster && relatedSignals.length > 0 && (
        <div className="mt-12">
          <p className="text-[11px] tracking-[0.12em] uppercase font-medium text-muted-foreground/60">
            ALSO IN THIS CLUSTER
          </p>
          <div className="mt-2 space-y-2">
            {relatedSignals.map((related) => (
              <button
                key={related.id}
                onClick={() => onSelectSignal(related)}
                className="block text-[13px] text-left hover:opacity-70 transition-opacity font-normal text-muted-foreground"
              >
                {related.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-16 mb-10">
        <p className="text-[10px] font-light text-muted-foreground/40">
          Created{' '}
          {signal.created_at
            ? format(new Date(signal.created_at), 'd MMM yyyy')
            : 'Unknown'}
        </p>
      </div>
    </div>
  );
}
