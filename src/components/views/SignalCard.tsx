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
  created_at: string | null;
  analysis_context: string | string[] | null;
  nb_relevance?: string | null;
  source_urls?: { title: string; url: string; domain: string }[];
}

interface SignalCardProps {
  signal: SignalCardData;
  expanded: boolean;
  onToggle: () => void;
  commentCount?: number;
  showLiveBadge?: boolean;
}

// Parse nb_relevance prefix: [CRITICAL], [HIGH], [WATCH], [FYI]
const NB_PREFIX_COLORS: Record<string, string> = {
  CRITICAL: 'bg-tier-breaking',
  HIGH: 'bg-tier-developing',
  WATCH: 'bg-muted-foreground',
  FYI: 'bg-muted-foreground/50',
};

function parseNbRelevance(raw: string | null | undefined): { dot: string | null; text: string | null } {
  if (!raw) return { dot: null, text: null };
  const match = raw.match(/^\[(CRITICAL|HIGH|WATCH|FYI)\]\s*/);
  if (match) {
    return { dot: NB_PREFIX_COLORS[match[1]], text: raw.slice(match[0].length) };
  }
  return { dot: null, text: raw };
}

const STALE_DAYS = 7;

export function SignalCard({ signal, expanded, onToggle, commentCount, showLiveBadge }: SignalCardProps) {
  const cred = signal.credibility ?? 0;
  const credPct = Math.round(cred * 100);
  const barColor = credPct > 50 ? 'bg-ring' : credPct > 30 ? 'bg-tier-developing' : 'bg-tier-breaking';
  const relTime = signal.created_at ? formatRelative(new Date(signal.created_at)) : '';
  const analysisText = Array.isArray(signal.analysis_context)
    ? signal.analysis_context.join('\n')
    : signal.analysis_context;

  const { dot: nbDot, text: nbText } = parseNbRelevance(signal.nb_relevance);

  // Stale: older than 7 days → dimmed
  const isStale = signal.created_at
    ? (Date.now() - new Date(signal.created_at).getTime()) > STALE_DAYS * 86400 * 1000
    : false;

  return (
    <div
      onClick={onToggle}
      className={cn(
        'text-left rounded-lg border bg-card p-4 transition-all duration-200 overflow-hidden cursor-pointer',
        expanded ? 'border-ring/40 bg-accent/5 md:col-span-2' : 'border-border hover:border-muted-foreground/30',
        isStale && 'opacity-50'
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
          {relTime && <span className="text-xs text-muted-foreground whitespace-nowrap">{relTime}</span>}
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
      {expanded && analysisText && (
        <p className="text-xs text-foreground/60 leading-relaxed mb-1.5" style={{ overflowWrap: 'break-word' }}>{analysisText}</p>
      )}
      {signal.source_urls && signal.source_urls.length > 0 && (
        <div className="mt-2 pt-2 border-t border-border/50">
          <div className="space-y-0.5">
            {signal.source_urls.slice(0, expanded ? undefined : 3).map((src, i) => (
              <a key={i} href={src.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                className="flex items-center gap-2 text-[11px] text-foreground/60 hover:text-foreground transition-colors group">
                <span className="text-muted-foreground text-[10px] font-mono flex-shrink-0">{src.domain}</span>
                <span className="truncate">{src.title}</span>
                <ExternalLink className="h-3 w-3 flex-shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
            ))}
          </div>
        </div>
      )}
      {nbText && (
        <div className={cn('flex items-start gap-1.5 mt-1.5', !expanded && 'line-clamp-1')}>
          {nbDot && <span className={cn('h-1.5 w-1.5 rounded-full flex-shrink-0 mt-1', nbDot)} />}
          <p className="text-xs text-emerging italic leading-relaxed" style={{ overflowWrap: 'break-word' }}>{nbText}</p>
        </div>
      )}
    </div>
  );
}
