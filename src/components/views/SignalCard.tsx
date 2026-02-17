import { ExternalLink, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

export function formatRelative(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export interface SignalCardData {
  id: string;
  title: string;
  credibility: number;
  sources: number;
  created_at: string;
  analysis_context: string | string[];
  nb_relevance?: string;
  source_urls?: { title: string; url: string; domain: string }[];
}

interface SignalCardProps {
  signal: SignalCardData;
  expanded: boolean;
  onToggle: () => void;
  commentCount?: number;
  showLiveBadge?: boolean;
}

export function SignalCard({ signal, expanded, onToggle, commentCount, showLiveBadge }: SignalCardProps) {
  const credPct = Math.round(signal.credibility * 100);
  const barColor = credPct > 50 ? 'bg-ring' : credPct > 30 ? 'bg-tier-developing' : 'bg-tier-breaking';
  const relTime = formatRelative(new Date(signal.created_at));
  const analysisText = Array.isArray(signal.analysis_context)
    ? signal.analysis_context.join('\n')
    : signal.analysis_context;

  return (
    <div
      onClick={onToggle}
      className={cn(
        'text-left rounded-lg border bg-card p-4 transition-all duration-200 overflow-hidden cursor-pointer',
        expanded ? 'border-ring/40 bg-accent/5 md:col-span-2' : 'border-border hover:border-muted-foreground/30'
      )}
      style={{ overflowWrap: 'break-word' }}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          {showLiveBadge && (
            <span className="inline-flex items-center gap-1 flex-shrink-0">
              <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--live-blue))] animate-pulse" />
              <span className="text-[10px] font-mono text-[hsl(var(--live-blue))] uppercase tracking-wider">Live</span>
            </span>
          )}
          <h3 className={cn('text-sm font-medium text-card-foreground leading-snug', !expanded && 'line-clamp-2')}>{signal.title}</h3>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {commentCount != null && commentCount > 0 && (
            <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
              <MessageSquare className="h-3 w-3" />
              {commentCount}
            </span>
          )}
          <span className="text-xs text-muted-foreground whitespace-nowrap">{relTime}</span>
        </div>
      </div>
      <div className="flex items-center gap-4 mb-1.5 text-xs text-muted-foreground whitespace-nowrap">
        <span>{signal.sources} sources</span>
        <span className="flex items-center gap-1.5">
          Credibility
          <span className="inline-block w-12 h-1.5 rounded-full bg-muted overflow-hidden">
            <span className={cn('block h-full rounded-full', barColor)} style={{ width: `${Math.max(credPct, 5)}%` }} />
          </span>
          <span className="text-[10px]">{credPct}%</span>
        </span>
      </div>
      {expanded && (
        <>
          <p className="text-xs text-foreground/60 leading-relaxed mb-1.5" style={{ overflowWrap: 'break-word' }}>{analysisText}</p>
          {signal.source_urls && signal.source_urls.length > 0 && (
            <div className="mt-3 pt-2.5 border-t border-border/50">
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Sources</span>
              <div className="mt-1.5 space-y-1">
                {signal.source_urls.map((src, i) => (
                  <a key={i} href={src.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                    className="flex items-center gap-2 text-xs text-foreground/70 hover:text-foreground transition-colors group">
                    <span className="text-muted-foreground text-[10px] font-mono flex-shrink-0">{src.domain}</span>
                    <span className="truncate">{src.title}</span>
                    <ExternalLink className="h-3 w-3 flex-shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </>
      )}
      {signal.nb_relevance && (
        <p className={cn('text-xs text-muted-foreground italic', !expanded && 'line-clamp-1')} style={{ overflowWrap: 'break-word' }}>{signal.nb_relevance}</p>
      )}
    </div>
  );
}
