import { useState } from 'react';
import { format } from 'date-fns';
import type { Signal } from '@/hooks/useSignalGraphData';
import type { ClusterWithColor } from '@/hooks/useSignalGraphData';

interface ActionPaths {
  experiment?: string;
  defensive?: string;
  strategic?: string;
  monitor?: string;
}

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
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const backLabel = cluster ? cluster.name : 'SIGNALS';
  const backColor = cluster ? cluster.color.text : '#6b6b7b';

  const sourceUrls = signal.source_urls || [];
  const sourceCount = sourceUrls.length;

  const dataPoints: string[] = signal.data_points
    ? Array.isArray(signal.data_points)
      ? (signal.data_points as string[])
      : []
    : [];

  const actionPaths: ActionPaths = signal.action_paths
    ? (signal.action_paths as ActionPaths)
    : {};

  const actionItems = [
    { key: 'experiment', icon: '⚡', text: actionPaths.experiment },
    { key: 'defensive', icon: '◇', text: actionPaths.defensive },
    { key: 'strategic', icon: '◎', text: actionPaths.strategic },
    { key: 'monitor', icon: '◌', text: actionPaths.monitor },
  ].filter((a) => a.text && a.text.trim() !== '');

  const getDomainFromUrl = (url: string): string => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return url;
    }
  };

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
        <h1
          className="text-[20px] leading-[1.3]"
          style={{ fontWeight: 400, color: '#e8e8ed' }}
        >
          {signal.title}
        </h1>

        <p
          className="mt-3 text-[13px] leading-[1.6]"
          style={{ fontWeight: 300, color: '#6b6b7b' }}
        >
          {signal.summary}
        </p>

        <p
          className="mt-3 text-[11px]"
          style={{ fontWeight: 300, color: '#44444f' }}
        >
          {signal.urgency || 'stable'} · {signal.confidence || 'medium'} · {sourceCount} source
          {sourceCount !== 1 ? 's' : ''} · {signal.category}
        </p>

        {signal.urgency_reason && (
          <p
            className="mt-1 text-[11px] italic"
            style={{ fontWeight: 300, color: '#44444f' }}
          >
            {signal.urgency_reason}
          </p>
        )}

        {signal.confidence_reason && (
          <p
            className="mt-1 text-[11px] italic"
            style={{ fontWeight: 300, color: '#44444f' }}
          >
            {signal.confidence_reason}
          </p>
        )}
      </div>

      {/* Decision question - HERO */}
      {signal.decision_question && (
        <p
          className="mt-12 text-[17px] leading-[1.5] italic"
          style={{ fontWeight: 300, color: '#e8e8ed' }}
        >
          {signal.decision_question}
        </p>
      )}

      {/* Action paths */}
      {actionItems.length > 0 && (
        <div className="mt-12 space-y-4">
          {actionItems.map((action) => (
            <div key={action.key} className="flex items-start gap-4">
              <span
                className="text-xs flex-shrink-0"
                style={{ color: cluster?.color.text || '#6b6b7b' }}
              >
                {action.icon}
              </span>
              <span
                className="text-[13px]"
                style={{ fontWeight: 400, color: '#e8e8ed' }}
              >
                {action.text}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Collapsible sections */}
      <div className="mt-12 space-y-4">
        {/* Analysis */}
        <div>
          <button
            onClick={() => toggleSection('analysis')}
            className="text-[11px] tracking-[0.08em] uppercase hover:opacity-70 transition-opacity"
            style={{ fontWeight: 500, color: '#6b6b7b' }}
          >
            Analysis {expandedSections.has('analysis') ? '↑' : '↓'}
          </button>
          {expandedSections.has('analysis') && (
            <div
              className="mt-3 text-[13px] leading-[1.7]"
              style={{ fontWeight: 300, color: '#6b6b7b' }}
            >
              {(signal.body || '').split('\n\n').map((paragraph, i) => (
                <p key={i} className={i > 0 ? 'mt-3' : ''}>
                  {paragraph}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Key Data */}
        {dataPoints.length > 0 && (
          <div>
            <button
              onClick={() => toggleSection('data')}
              className="text-[11px] tracking-[0.08em] uppercase hover:opacity-70 transition-opacity"
              style={{ fontWeight: 500, color: '#6b6b7b' }}
            >
              Key Data {expandedSections.has('data') ? '↑' : '↓'}
            </button>
            {expandedSections.has('data') && (
              <div className="mt-3 space-y-1">
                {dataPoints.map((dp, i) => (
                  <p
                    key={i}
                    className="text-xs"
                    style={{ fontWeight: 300, color: '#6b6b7b' }}
                  >
                    {dp}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Sources */}
        {sourceUrls.length > 0 && (
          <div>
            <button
              onClick={() => toggleSection('sources')}
              className="text-[11px] tracking-[0.08em] uppercase hover:opacity-70 transition-opacity"
              style={{ fontWeight: 500, color: '#6b6b7b' }}
            >
              Sources {expandedSections.has('sources') ? '↑' : '↓'}
            </button>
            {expandedSections.has('sources') && (
              <div className="mt-3 space-y-1">
                {sourceUrls.map((url, i) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-xs hover:underline"
                    style={{ fontWeight: 300, color: '#6b6b7b' }}
                  >
                    {getDomainFromUrl(url)}
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Opportunity + Risk */}
      {(signal.opportunity || signal.risk) && (
        <div className="mt-12 space-y-6">
          {signal.opportunity && (
            <div>
              <p
                className="text-[11px] tracking-[0.08em] uppercase"
                style={{ fontWeight: 500, color: '#a8d5ba' }}
              >
                OPPORTUNITY
              </p>
              <p
                className="mt-2 text-[13px]"
                style={{ fontWeight: 300, color: '#6b6b7b' }}
              >
                {signal.opportunity}
              </p>
            </div>
          )}

          {signal.risk && (
            <div>
              <p
                className="text-[11px] tracking-[0.08em] uppercase"
                style={{ fontWeight: 500, color: '#f4a3a0' }}
              >
                RISK
              </p>
              <p
                className="mt-2 text-[13px]"
                style={{ fontWeight: 300, color: '#6b6b7b' }}
              >
                {signal.risk}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Related signals (same cluster) */}
      {cluster && relatedSignals.length > 0 && (
        <div className="mt-12">
          <p
            className="text-[11px] tracking-[0.12em] uppercase"
            style={{ fontWeight: 500, color: '#44444f' }}
          >
            ALSO IN THIS CLUSTER
          </p>
          <div className="mt-2 space-y-2">
            {relatedSignals.map((related) => (
              <button
                key={related.id}
                onClick={() => onSelectSignal(related)}
                className="block text-[13px] text-left hover:opacity-70 transition-opacity"
                style={{ fontWeight: 400, color: '#6b6b7b' }}
              >
                {related.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-16 mb-10">
        <p className="text-[10px]" style={{ fontWeight: 300, color: '#44444f' }}>
          Created{' '}
          {signal.created_at
            ? format(new Date(signal.created_at), 'd MMM yyyy')
            : 'Unknown'}
        </p>
      </div>
    </div>
  );
}
