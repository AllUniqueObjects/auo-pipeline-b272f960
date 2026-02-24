import { cn } from '@/lib/utils';

const LEVEL_CONFIG: Record<string, { border: string; badge: string; badgeText: string; label: string }> = {
  monitoring: { border: 'border-l-amber-400', badge: 'bg-amber-50 text-amber-700 border-amber-200', badgeText: 'MONITORING', label: 'monitoring' },
  listening:  { border: 'border-l-blue-400',  badge: 'bg-blue-50 text-blue-700 border-blue-200',    badgeText: 'LISTENING',  label: 'listening' },
  radar:      { border: 'border-l-border',     badge: 'bg-muted text-muted-foreground border-border', badgeText: 'RADAR',      label: 'radar' },
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export interface DecisionThread {
  id: string;
  title: string;
  level: string;
  topic_cluster: string | null;
  updated_at: string;
  signal_count: number;
}

interface WorkspaceCardProps {
  thread: DecisionThread;
  onClick: (threadId: string) => void;
}

export function WorkspaceCard({ thread, onClick }: WorkspaceCardProps) {
  const level = LEVEL_CONFIG[thread.level] ?? LEVEL_CONFIG['radar'];

  return (
    <div
      onClick={() => onClick(thread.id)}
      className={cn(
        'rounded-xl border border-border border-l-[3px] hover:border-muted-foreground/30 hover:shadow-sm',
        'bg-background transition-all duration-150 cursor-pointer mb-2 overflow-hidden',
        level.border
      )}
    >
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className={cn('text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border', level.badge)}>
            {level.badgeText}
          </span>
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {relativeTime(thread.updated_at)}
          </span>
        </div>

        <p className="text-[13px] font-semibold text-foreground leading-snug truncate mb-1">
          {thread.title}
        </p>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground">
            {thread.signal_count} signal{thread.signal_count !== 1 ? 's' : ''}
          </span>
          {thread.topic_cluster && (
            <>
              <span className="text-[11px] text-muted-foreground/40">·</span>
              <span className="text-[11px] text-muted-foreground/70 truncate">
                {thread.topic_cluster}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
