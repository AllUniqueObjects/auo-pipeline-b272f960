import { Zap, Shield, Target, Eye } from 'lucide-react';
import type { Signal } from '@/hooks/useSignalGraphData';

interface ActionPaths {
  experiment?: string;
  defensive?: string;
  strategic?: string;
  monitor?: string;
}

type SignalCategory = 'competitive' | 'market' | 'technology' | 'supply_chain' | 'policy' | 'commercial' | 'brand';
type SignalUrgency = 'urgent' | 'emerging' | 'monitor' | 'stable';

const categoryColors: Record<SignalCategory, string> = {
  competitive: '#f87171',
  market: '#34d399',
  technology: '#a78bfa',
  supply_chain: '#f5a623',
  policy: '#4a9eff',
  commercial: '#22d3ee',
  brand: '#ec4899',
};

const categoryLabels: Record<SignalCategory, string> = {
  competitive: 'Competitive',
  market: 'Market',
  technology: 'Technology',
  supply_chain: 'Supply Chain',
  policy: 'Policy',
  commercial: 'Commercial',
  brand: 'Brand',
};

const urgencyLabels: Record<SignalUrgency, string> = {
  urgent: 'Urgent',
  emerging: 'Emerging',
  monitor: 'Monitor',
  stable: 'Stable',
};

interface SignalDetailPaneProps {
  signal: Signal | null;
}

export function SignalDetailPane({ signal }: SignalDetailPaneProps) {
  if (!signal) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
        Select a signal to view details
      </div>
    );
  }

  const s = signal as any;
  const category = (s.category || s.nb_relevance || 'market') as SignalCategory;
  const urgency = (signal.urgency || 'stable') as SignalUrgency;
  const credibility = signal.credibility;

  const dataPoints: string[] = s.data_points
    ? (Array.isArray(s.data_points) ? s.data_points as string[] : [])
    : [];

  const actionPaths: ActionPaths = s.action_paths
    ? (s.action_paths as ActionPaths)
    : {};

  const sourceUrls: string[] = s.source_urls || [];

  return (
    <div className="h-full overflow-y-auto p-6">
      {/* Category + Urgency pills */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span
          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium"
          style={{
            backgroundColor: `${categoryColors[category] || '#9ca3af'}20`,
            color: categoryColors[category] || '#9ca3af',
          }}
        >
          {categoryLabels[category] || category}
        </span>
        {urgency !== 'stable' && (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium"
            style={{
              backgroundColor:
                urgency === 'urgent'
                  ? 'rgba(239, 68, 68, 0.15)'
                  : urgency === 'emerging'
                  ? 'rgba(245, 158, 11, 0.15)'
                  : 'rgba(156, 163, 175, 0.15)',
              color:
                urgency === 'urgent' ? '#ef4444' : urgency === 'emerging' ? '#f59e0b' : '#9ca3af',
            }}
          >
            {urgency === 'urgent' && (
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
              </span>
            )}
            {urgency === 'emerging' && (
              <span className="inline-flex rounded-full h-1.5 w-1.5 bg-amber-500" />
            )}
            {urgency === 'monitor' && (
              <span className="inline-flex rounded-full h-1.5 w-1.5 bg-gray-400" />
            )}
            {urgencyLabels[urgency]}
          </span>
        )}
        {credibility != null && (
          <span
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium capitalize"
            style={{
              backgroundColor: credibility >= 0.7 ? 'rgba(52, 211, 153, 0.15)' : credibility >= 0.4 ? 'rgba(245, 166, 35, 0.15)' : 'rgba(156, 163, 175, 0.15)',
              color: credibility >= 0.7 ? '#34d399' : credibility >= 0.4 ? '#f5a623' : '#9ca3af',
            }}
          >
            {credibility >= 0.7 ? 'high' : credibility >= 0.4 ? 'medium' : 'low'}
          </span>
        )}
      </div>

      {/* Title */}
      <h1 className="text-[24px] font-bold text-foreground mb-2 leading-tight">{signal.title}</h1>

      {/* Summary */}
      <p className="text-[14px] text-muted-foreground mb-6 leading-relaxed">{signal.summary}</p>

      {/* Analysis */}
      {signal.analysis_context && (
        <section className="mb-6">
          <h2 className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-wider mb-2">
            Analysis
          </h2>
          <div className="text-[14px] text-foreground leading-relaxed space-y-3">
            {signal.analysis_context.split('\n\n').map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        </section>
      )}

      {/* What To Do - 2x2 grid */}
      {(actionPaths.experiment || actionPaths.defensive || actionPaths.strategic || actionPaths.monitor) && (
        <section className="mb-6">
          <h2 className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-wider mb-2">
            What To Do
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {actionPaths.experiment && (
              <div className="p-4 rounded-lg bg-card border border-border">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span className="text-[12px] font-semibold text-foreground">Quick Test</span>
                </div>
                <p className="text-[12px] text-muted-foreground leading-relaxed line-clamp-2">
                  {actionPaths.experiment}
                </p>
              </div>
            )}
            {actionPaths.defensive && (
              <div className="p-4 rounded-lg bg-card border border-border">
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="w-4 h-4 text-blue-400" />
                  <span className="text-[12px] font-semibold text-foreground">Defend</span>
                </div>
                <p className="text-[12px] text-muted-foreground leading-relaxed line-clamp-2">
                  {actionPaths.defensive}
                </p>
              </div>
            )}
            {actionPaths.strategic && (
              <div className="p-4 rounded-lg bg-card border border-border">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="w-4 h-4 text-purple-400" />
                  <span className="text-[12px] font-semibold text-foreground">Strategic Bet</span>
                </div>
                <p className="text-[12px] text-muted-foreground leading-relaxed line-clamp-2">
                  {actionPaths.strategic}
                </p>
              </div>
            )}
            {actionPaths.monitor && (
              <div className="p-4 rounded-lg bg-card border border-border">
                <div className="flex items-center gap-2 mb-1">
                  <Eye className="w-4 h-4 text-gray-400" />
                  <span className="text-[12px] font-semibold text-foreground">Monitor</span>
                </div>
                <p className="text-[12px] text-muted-foreground leading-relaxed line-clamp-2">
                  {actionPaths.monitor}
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Key Data pills */}
      {dataPoints.length > 0 && (
        <section className="mb-6">
          <h2 className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-wider mb-2">
            Key Data
          </h2>
          <div className="flex flex-wrap gap-2">
            {dataPoints.map((dp, index) => (
              <span
                key={index}
                className="inline-flex items-center px-3.5 py-1.5 rounded-full text-[12px] font-medium bg-card border border-border text-foreground"
              >
                {dp}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Sources */}
      {sourceUrls.length > 0 && (
        <section className="mb-6">
          <h2 className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-wider mb-2">
            Sources
          </h2>
          <div className="flex flex-wrap gap-2">
            {sourceUrls.map((url: string, index: number) => {
              let domain = url;
              try {
                domain = new URL(url).hostname.replace('www.', '');
              } catch {
                // keep original
              }
              return (
                <a
                  key={index}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[12px] text-blue-500 hover:underline"
                >
                  {domain}
                </a>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
