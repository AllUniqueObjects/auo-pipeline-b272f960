import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { ClusterBlock } from './ClusterBlock';
import { SignalRow } from './SignalRow';
import type { ClusterWithSignals } from '@/hooks/useSignalClusters';
import type { Signal } from '@/hooks/useSignals';

interface ClusterPaneProps {
  clusters: ClusterWithSignals[];
  standaloneSignals: Signal[];
  loading: boolean;
  summary: {
    total: number;
    needsAttention: number;
    urgent: number;
    emerging: number;
    monitor: number;
  };
  selectedSignalId: string | null;
  onSelectSignal: (signal: Signal) => void;
}

export function ClusterPane({
  clusters,
  standaloneSignals,
  loading,
  summary,
  selectedSignalId,
  onSelectSignal,
}: ClusterPaneProps) {
  if (loading) {
    return (
      <div className="h-full p-4 space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-36" />
        <div className="space-y-3 pt-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const hasContent = clusters.length > 0 || standaloneSignals.length > 0;

  if (!hasContent) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-foreground font-medium mb-1">No signals yet</p>
          <p className="text-muted-foreground text-sm">
            Your intelligence briefings will appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#0a0a0b]">
      {/* Summary header */}
      <div className="p-4 border-b border-border/50">
        <p className="text-[15px] font-semibold text-foreground">
          {summary.needsAttention > 0
            ? `${summary.needsAttention} cluster${summary.needsAttention !== 1 ? 's' : ''} need attention`
            : `${summary.total} cluster${summary.total !== 1 ? 's' : ''}`}
        </p>
        <p className="text-[12px] text-muted-foreground mt-0.5">
          {summary.urgent > 0 && (
            <span className="text-red-400">{summary.urgent} urgent</span>
          )}
          {summary.urgent > 0 && summary.emerging > 0 && ' · '}
          {summary.emerging > 0 && (
            <span className="text-amber-400">{summary.emerging} emerging</span>
          )}
          {(summary.urgent > 0 || summary.emerging > 0) && summary.monitor > 0 && ' · '}
          {summary.monitor > 0 && (
            <span className="text-gray-400">{summary.monitor} monitor</span>
          )}
        </p>
      </div>

      {/* Scrollable cluster list */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {clusters.map((cluster) => (
            <ClusterBlock
              key={cluster.id}
              cluster={cluster}
              selectedSignalId={selectedSignalId}
              onSelectSignal={onSelectSignal}
            />
          ))}

          {/* Standalone signals section */}
          {standaloneSignals.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border/30">
              <div className="px-3 py-2">
                <span className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-wider">
                  Standalone
                </span>
              </div>
              <div className="ml-2">
                {standaloneSignals.map((signal) => (
                  <SignalRow
                    key={signal.id}
                    signal={signal}
                    isSelected={selectedSignalId === signal.id}
                    onSelect={() => onSelectSignal(signal)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
