import { useParams, Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { ArrowLeft, Zap, Shield, Target, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSignal } from '@/hooks/useSignals';
import { Skeleton } from '@/components/ui/skeleton';

interface ActionPaths {
  experiment?: string;
  defensive?: string;
  strategic?: string;
  monitor?: string;
}

type SignalCategory = 'competitive' | 'market' | 'technology' | 'supply_chain' | 'policy' | 'commercial' | 'brand';
type SignalUrgency = 'urgent' | 'emerging' | 'monitor' | 'stable';
type SignalConfidence = 'high' | 'medium' | 'low';

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

const confidenceStyles: Record<SignalConfidence, { bg: string; color: string }> = {
  high: { bg: 'rgba(52, 211, 153, 0.15)', color: '#34d399' },
  medium: { bg: 'rgba(245, 166, 35, 0.15)', color: '#f5a623' },
  low: { bg: 'rgba(156, 163, 175, 0.15)', color: '#9ca3af' },
};

export default function SignalDetail() {
  const { id } = useParams();
  const { signal: rawSignal, loading, error } = useSignal(id);

  // Parse data_points from JSONB as string array
  const dataPoints: string[] = rawSignal?.data_points 
    ? (Array.isArray(rawSignal.data_points) ? rawSignal.data_points as string[] : [])
    : [];

  // Parse action_paths from JSONB
  const actionPaths: ActionPaths = rawSignal?.action_paths 
    ? (rawSignal.action_paths as ActionPaths)
    : {};

  const category = (rawSignal?.category || 'market') as SignalCategory;
  const urgency = (rawSignal?.urgency || 'stable') as SignalUrgency;
  const confidence = rawSignal?.confidence as SignalConfidence | null;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">
          <div className="content-wrapper py-6">
            <Button variant="ghost" size="sm" asChild className="mb-6 -ml-2">
              <Link to="/signals">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to signals
              </Link>
            </Button>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-16" />
              </div>
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-5 w-3/4" />
              <div className="pt-4 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !rawSignal) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">
          <div className="content-wrapper py-6">
            <Button variant="ghost" size="sm" asChild className="mb-6 -ml-2">
              <Link to="/signals">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to signals
              </Link>
            </Button>
            <div className="text-center py-12">
              <p className="text-muted-foreground text-sm">
                {error ? 'Failed to load signal.' : 'Signal not found.'}
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="content-wrapper py-6">
          {/* Back button */}
          <Button variant="ghost" size="sm" asChild className="mb-6 -ml-2">
            <Link to="/signals">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to signals
            </Link>
          </Button>

          {/* Category + Urgency + Confidence badges */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium"
              style={{ 
                backgroundColor: `${categoryColors[category]}20`,
                color: categoryColors[category]
              }}
            >
              {categoryLabels[category]}
            </span>
            {urgency !== 'stable' && (
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium"
                style={{
                  backgroundColor: urgency === 'urgent' ? 'rgba(239, 68, 68, 0.15)' :
                                   urgency === 'emerging' ? 'rgba(245, 158, 11, 0.15)' :
                                   'rgba(156, 163, 175, 0.15)',
                  color: urgency === 'urgent' ? '#ef4444' :
                         urgency === 'emerging' ? '#f59e0b' :
                         '#9ca3af'
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
            {confidence && (
              <span
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium capitalize"
                style={{
                  backgroundColor: confidenceStyles[confidence].bg,
                  color: confidenceStyles[confidence].color
                }}
              >
                {confidence} confidence
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-[24px] font-bold text-foreground mb-3 leading-tight">
            {rawSignal.title}
          </h1>

          {/* Summary */}
          <p className="text-[16px] text-muted-foreground mb-8 leading-relaxed">
            {rawSignal.summary}
          </p>

          {/* Analysis / Body */}
          <section className="mb-8">
            <h2 className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-wider mb-3">
              Analysis
            </h2>
            <div className="text-[14px] text-foreground leading-relaxed space-y-4">
              {(rawSignal.body || '').split('\n\n').map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          </section>

          {/* Opportunity for NB */}
          {rawSignal.opportunity && (
            <section className="mb-8">
              <h2 className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-wider mb-3">
                Opportunity for NB
              </h2>
              <div 
                className="rounded-lg p-4"
                style={{
                  backgroundColor: 'rgba(52, 211, 153, 0.03)',
                  borderLeft: '3px solid #34d399'
                }}
              >
                <div className="text-[14px] text-foreground leading-relaxed space-y-4">
                  {rawSignal.opportunity.split('\n\n').map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Risk if Ignored */}
          {rawSignal.risk && (
            <section className="mb-8">
              <h2 className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-wider mb-3">
                Risk if Ignored
              </h2>
              <div 
                className="rounded-lg p-4"
                style={{
                  backgroundColor: 'rgba(248, 113, 113, 0.03)',
                  borderLeft: '3px solid #f87171'
                }}
              >
                <div className="text-[14px] text-foreground leading-relaxed space-y-4">
                  {rawSignal.risk.split('\n\n').map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* What To Do - Action Paths */}
          {(actionPaths.experiment || actionPaths.defensive || actionPaths.strategic || actionPaths.monitor) && (
            <section className="mb-8">
              <h2 className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-wider mb-3">
                What To Do
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {actionPaths.experiment && (
                  <div 
                    className="p-4 rounded-lg"
                    style={{ backgroundColor: '#18181c', border: '1px solid #2a2a2f' }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-4 h-4 text-amber-400" />
                      <span className="text-[13px] font-semibold text-foreground">Quick Test</span>
                    </div>
                    <p className="text-[13px] text-muted-foreground leading-relaxed">
                      {actionPaths.experiment}
                    </p>
                  </div>
                )}
                {actionPaths.defensive && (
                  <div 
                    className="p-4 rounded-lg"
                    style={{ backgroundColor: '#18181c', border: '1px solid #2a2a2f' }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-4 h-4 text-blue-400" />
                      <span className="text-[13px] font-semibold text-foreground">Defend</span>
                    </div>
                    <p className="text-[13px] text-muted-foreground leading-relaxed">
                      {actionPaths.defensive}
                    </p>
                  </div>
                )}
                {actionPaths.strategic && (
                  <div 
                    className="p-4 rounded-lg"
                    style={{ backgroundColor: '#18181c', border: '1px solid #2a2a2f' }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="w-4 h-4 text-purple-400" />
                      <span className="text-[13px] font-semibold text-foreground">Strategic Bet</span>
                    </div>
                    <p className="text-[13px] text-muted-foreground leading-relaxed">
                      {actionPaths.strategic}
                    </p>
                  </div>
                )}
                {actionPaths.monitor && (
                  <div 
                    className="p-4 rounded-lg"
                    style={{ backgroundColor: '#18181c', border: '1px solid #2a2a2f' }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Eye className="w-4 h-4 text-gray-400" />
                      <span className="text-[13px] font-semibold text-foreground">Monitor</span>
                    </div>
                    <p className="text-[13px] text-muted-foreground leading-relaxed">
                      {actionPaths.monitor}
                    </p>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Key Data Points */}
          {dataPoints.length > 0 && (
            <section className="mb-8">
              <h2 className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-wider mb-3">
                Key Data
              </h2>
              <div className="flex flex-wrap gap-2">
                {dataPoints.map((dp, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3.5 py-1.5 rounded-full text-[12px] font-medium"
                    style={{ 
                      backgroundColor: '#18181c', 
                      border: '1px solid #2a2a2f',
                      color: '#22d3ee'
                    }}
                  >
                    {dp}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Created date */}
          <div className="pt-6 border-t border-border">
            <p className="text-[12px] text-muted-foreground/60">
              Created {formatDate(rawSignal.created_at || new Date().toISOString())}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
