import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

const LEVEL_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  monitoring: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', label: 'MONITORING' },
  listening:  { bg: 'bg-blue-50 border-blue-200',   text: 'text-blue-700',  label: 'LISTENING' },
  radar:      { bg: 'bg-muted border-border',        text: 'text-muted-foreground', label: 'RADAR' },
};

interface PositionSummary {
  id: string;
  title: string;
  tone: string | null;
  created_at: string | null;
}

interface WorkspaceViewProps {
  threadId: string;
  onClose: () => void;
}

export function WorkspaceView({ threadId, onClose }: WorkspaceViewProps) {
  const [thread, setThread] = useState<{ title: string; level: string; topic_cluster: string | null; signal_count: number } | null>(null);
  const [positions, setPositions] = useState<PositionSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWorkspace = async () => {
      setLoading(true);

      const [threadRes, posRes] = await Promise.all([
        supabase
          .from('decision_threads')
          .select('title, level, topic_cluster, decision_signals(count)')
          .eq('id', threadId)
          .single(),

        supabase
          .from('positions')
          .select('id, title, tone, created_at')
          .eq('decision_thread_id', threadId)
          .order('created_at', { ascending: false }),
      ]);

      if (threadRes.data) {
        const raw = threadRes.data as Record<string, unknown>;
        const sigArr = raw.decision_signals as { count: number }[] | undefined;
        setThread({
          title: raw.title as string,
          level: raw.level as string,
          topic_cluster: raw.topic_cluster as string | null,
          signal_count: sigArr?.[0]?.count ?? 0,
        });
      }

      setPositions((posRes.data ?? []) as PositionSummary[]);
      setLoading(false);
    };

    fetchWorkspace();
  }, [threadId]);

  const level = LEVEL_BADGE[thread?.level ?? 'radar'] ?? LEVEL_BADGE['radar'];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 px-5 pt-5 pb-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={onClose}
            className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back
          </button>
        </div>

        {loading ? (
          <div className="space-y-2 animate-pulse">
            <div className="h-5 w-48 rounded bg-muted" />
            <div className="h-3 w-24 rounded bg-muted/60" />
          </div>
        ) : thread ? (
          <>
            <h1 className="text-[15px] font-bold text-foreground leading-snug mb-2" style={{ fontFamily: "'Georgia', serif" }}>
              {thread.title}
            </h1>
            <div className="flex items-center gap-2">
              <span className={cn('text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border', level.bg, level.text)}>
                {level.label}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {thread.signal_count} signal{thread.signal_count !== 1 ? 's' : ''}
              </span>
              {thread.topic_cluster && (
                <>
                  <span className="text-[11px] text-muted-foreground/40">·</span>
                  <span className="text-[11px] text-muted-foreground/70">{thread.topic_cluster}</span>
                </>
              )}
            </div>
          </>
        ) : null}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-5">
        {loading ? (
          <div className="space-y-3 animate-pulse">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-lg border border-border p-4 space-y-2">
                <div className="h-3.5 w-3/4 rounded bg-muted" />
                <div className="h-3 w-1/2 rounded bg-muted/50" />
              </div>
            ))}
          </div>
        ) : positions.length > 0 ? (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground font-mono">
                Positions
              </span>
              <span className="text-[10px] font-bold bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full font-mono">
                {positions.length}
              </span>
            </div>
            <div className="space-y-2">
              {positions.map(p => (
                <div key={p.id} className="rounded-lg border border-border px-4 py-3 hover:bg-accent/20 transition-colors">
                  <p className="text-[13px] font-medium text-foreground leading-snug">
                    {p.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {p.tone && (
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{p.tone}</span>
                    )}
                    {p.created_at && (
                      <span className="text-[10px] text-muted-foreground tabular-nums">
                        {new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center mt-16 gap-2">
            <p className="text-sm text-muted-foreground">AUO is gathering signals for this decision.</p>
            <p className="text-xs text-muted-foreground/60">Positions will appear as patterns emerge.</p>
          </div>
        )}
      </div>
    </div>
  );
}
