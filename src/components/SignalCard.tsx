import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

export interface Signal {
  id: string;
  category: 'competitive' | 'market' | 'technology' | 'supply_chain' | 'policy' | 'commercial' | 'brand';
  title: string;
  summary: string;
  urgency: 'urgent' | 'emerging' | 'monitor' | 'stable';
  sourceCount: number;
  createdAt: string;
}

const categoryColors: Record<Signal['category'], string> = {
  competitive: '#f87171',
  market: '#34d399',
  technology: '#a78bfa',
  supply_chain: '#f5a623',
  policy: '#4a9eff',
  commercial: '#22d3ee',
  brand: '#ec4899',
};

const categoryLabels: Record<Signal['category'], string> = {
  competitive: 'Competitive',
  market: 'Market',
  technology: 'Technology',
  supply_chain: 'Supply Chain',
  policy: 'Policy',
  commercial: 'Commercial',
  brand: 'Brand',
};

interface SignalCardProps {
  signal: Signal;
}

export function SignalCard({ signal }: SignalCardProps) {
  const navigate = useNavigate();

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <button
      onClick={() => navigate(`/signals/${signal.id}`)}
      className={cn(
        'w-full text-left p-4 rounded-[10px] border border-border bg-card',
        'transition-colors hover:border-muted-foreground/50',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background'
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        {/* Category badge */}
        <span
          className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium"
          style={{ 
            backgroundColor: `${categoryColors[signal.category]}20`,
            color: categoryColors[signal.category]
          }}
        >
          {categoryLabels[signal.category]}
        </span>

        {/* Urgency indicator */}
        {signal.urgency !== 'stable' && (
          <span className="flex-shrink-0 mt-1">
            {signal.urgency === 'urgent' && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
            )}
            {signal.urgency === 'emerging' && (
              <span className="inline-flex rounded-full h-2 w-2 bg-amber-500" />
            )}
            {signal.urgency === 'monitor' && (
              <span className="inline-flex rounded-full h-2 w-2 bg-muted-foreground/50" />
            )}
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="text-[16px] font-semibold text-foreground mb-1 leading-tight">
        {signal.title}
      </h3>

      {/* Summary */}
      <p className="text-[14px] text-muted-foreground line-clamp-1 mb-3">
        {signal.summary}
      </p>

      {/* Metadata */}
      <div className="flex items-center gap-2 text-[12px] text-muted-foreground/70">
        <span>{signal.sourceCount} source{signal.sourceCount !== 1 ? 's' : ''}</span>
        <span>·</span>
        <span>{formatDate(signal.createdAt)}</span>
      </div>
    </button>
  );
}
