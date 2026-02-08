import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { SignalRow } from './SignalRow';
import type { ClusterWithSignals } from '@/hooks/useSignalClusters';
import type { Signal } from '@/hooks/useSignals';

interface ClusterBlockProps {
  cluster: ClusterWithSignals;
  selectedSignalId: string | null;
  onSelectSignal: (signal: Signal) => void;
}

const urgencyDot: Record<string, React.ReactNode> = {
  urgent: (
    <span className="relative flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
    </span>
  ),
  emerging: <span className="inline-flex rounded-full h-2 w-2 bg-amber-500" />,
  monitor: <span className="inline-flex rounded-full h-2 w-2 bg-gray-500" />,
  stable: null,
};

export function ClusterBlock({ cluster, selectedSignalId, onSelectSignal }: ClusterBlockProps) {
  const isUrgent = cluster.top_urgency === 'urgent';
  const [isOpen, setIsOpen] = useState(isUrgent);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mb-1">
      <CollapsibleTrigger className="w-full text-left py-3 px-3 hover:bg-[#111113] transition-colors rounded-lg group">
        <div className="flex items-center gap-2">
          {isOpen ? (
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          )}
          {urgencyDot[cluster.top_urgency || 'stable']}
          <span className="text-[14px] font-semibold text-foreground flex-1 truncate">
            {cluster.name}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {cluster.signal_count} signal{cluster.signal_count !== 1 ? 's' : ''}
          </span>
        </div>
        {cluster.description && (
          <p className="text-[12px] text-muted-foreground/70 mt-1 ml-6 line-clamp-1">
            {cluster.description}
          </p>
        )}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="ml-4 border-l border-border/50 pl-2">
          {cluster.signals.map((signal) => (
            <SignalRow
              key={signal.id}
              signal={signal}
              isSelected={selectedSignalId === signal.id}
              onSelect={() => onSelectSignal(signal)}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
