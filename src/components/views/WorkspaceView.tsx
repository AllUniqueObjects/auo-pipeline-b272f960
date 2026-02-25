import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { credBarColor, formatRelative } from '@/components/views/SignalCard';
import { parseSections, type SignalEvidence } from '@/lib/position-utils';

// ─── Constants ─────────────────────────────────────────────

const LEVEL_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  monitoring: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', label: 'MONITORING' },
  listening:  { bg: 'bg-blue-50 border-blue-200',   text: 'text-blue-700',  label: 'LISTENING' },
  radar:      { bg: 'bg-muted border-border',        text: 'text-muted-foreground', label: 'RADAR' },
};

const TONE_CONFIG: Record<string, { bg: string; border: string; color: string; label: string }> = {
  'BREAKING':    { bg: '#fef2f2', border: '#fecaca', color: '#dc2626', label: 'BREAKING' },
  'ACT NOW':     { bg: '#fff7ed', border: '#fed7aa', color: '#ea580c', label: 'ACT NOW' },
  'WATCH':       { bg: '#fffbeb', border: '#fde68a', color: '#b45309', label: 'WATCH' },
  'CONSIDER':    { bg: '#eff6ff', border: '#bfdbfe', color: '#2563eb', label: 'CONSIDER' },
  // Legacy fallbacks
  decisive:      { bg: '#fff7ed', border: '#fed7aa', color: '#ea580c', label: 'ACT NOW' },
  conditional:   { bg: '#fffbeb', border: '#fde68a', color: '#b45309', label: 'WATCH' },
  exploratory:   { bg: '#eff6ff', border: '#bfdbfe', color: '#2563eb', label: 'CONSIDER' },
};

// ─── Types ─────────────────────────────────────────────────

interface PositionSummary {
  id: string;
  title: string;
  tone: string | null;
  created_at: string | null;
}

interface WorkspaceSignal {
  id: string;
  title: string;
  summary: string | null;
  credibility: number;
  sources: number;
  urgency: string | null;
  category: string | null;
  created_at: string | null;
  relevance_score: number;
}

const SIGNAL_PAGE_SIZE = 8;

interface FullPosition {
  id: string;
  title: string;
  tone: string | null;
  essence: string | null;
  sections: unknown;
  signal_refs: unknown;
  created_at: string | null;
}

interface WorkspaceViewProps {
  threadId: string;
  onClose: () => void;
  onOpenSignal?: (signalId: string, meta?: { backLabel: string }) => void;
  onDiscuss?: (context: { id: string; title: string }) => void;
}

// ─── Component ─────────────────────────────────────────────

export function WorkspaceView({ threadId, onClose, onOpenSignal, onDiscuss }: WorkspaceViewProps) {
  const { toast } = useToast();

  const [thread, setThread] = useState<{ title: string; level: string; topic_cluster: string | null; signal_count: number } | null>(null);
  const [positions, setPositions] = useState<PositionSummary[]>([]);
  const [signals, setSignals] = useState<WorkspaceSignal[]>([]);
  const [loading, setLoading] = useState(true);

  // Position detail state
  const [selectedPositionId, setSelectedPositionId] = useState<string | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<FullPosition | null>(null);
  const [positionLoading, setPositionLoading] = useState(false);
  const [positionError, setPositionError] = useState<string | null>(null);

  // ─── Fetch workspace data ─────────────────────────────────

  useEffect(() => {
    const fetchWorkspace = async () => {
      setLoading(true);
      setSelectedPositionId(null);
      setSelectedPosition(null);

      // 1. Thread metadata (no aggregation)
      const threadRes = await supabase
        .from('decision_threads')
        .select('title, level, topic_cluster')
        .eq('id', threadId)
        .single();

      // 2. Signal count — separate query
      const signalCountRes = await supabase
        .from('decision_signals')
        .select('decision_thread_id')
        .eq('decision_thread_id', threadId);

      const signalCount = signalCountRes.data?.length ?? 0;

      if (threadRes.data) {
        const raw = threadRes.data as Record<string, unknown>;
        setThread({
          title: raw.title as string,
          level: raw.level as string,
          topic_cluster: raw.topic_cluster as string | null,
          signal_count: signalCount,
        });
      }

      // 3. Positions
      const posRes = await supabase
        .from('positions')
        .select('id, title, tone, created_at, validation_issues')
        .eq('decision_thread_id', threadId)
        .or('validation_issues.is.null,validation_issues->>hidden.is.null,validation_issues->>hidden.neq.true')
        .order('created_at', { ascending: false });

      setPositions((posRes.data ?? []) as PositionSummary[]);

      // 4. Linked signals — two-step fetch with relevance scores
      const dsRes = await supabase
        .from('decision_signals')
        .select('signal_id, relevance_score')
        .eq('decision_thread_id', threadId);

      const dsRows = (dsRes.data ?? []) as { signal_id: string; relevance_score: number | null }[];
      const relevanceMap = new Map(dsRows.map(r => [r.signal_id, r.relevance_score ?? 0]));
      const signalIds = dsRows.map(r => r.signal_id).filter(Boolean);

      if (signalIds.length > 0) {
        const { data: sigData } = await supabase
          .from('signals')
          .select('id, title, summary, credibility, last_source_count, urgency, category, created_at')
          .in('id', signalIds);

        const mapped = (sigData ?? []).map((s: Record<string, unknown>) => ({
          id: s.id as string,
          title: s.title as string,
          summary: s.summary as string | null,
          credibility: (s.credibility as number) ?? 0,
          sources: (s.last_source_count as number) ?? 0,
          urgency: s.urgency as string | null,
          category: s.category as string | null,
          created_at: s.created_at as string | null,
          relevance_score: relevanceMap.get(s.id as string) ?? 0,
        }));

        // Sort by relevance descending
        mapped.sort((a, b) => b.relevance_score - a.relevance_score);
        setSignals(mapped);
      } else {
        setSignals([]);
      }

      setLoading(false);
    };

    fetchWorkspace();
  }, [threadId]);

  // ─── Position detail fetch ────────────────────────────────

  const openPositionDetail = async (posId: string) => {
    setSelectedPositionId(posId);
    setPositionLoading(true);
    setPositionError(null);

    const { data, error } = await supabase
      .from('positions')
      .select('*')
      .eq('id', posId)
      .maybeSingle();

    if (error) {
      console.error('[WorkspaceView] position fetch error:', error);
      setPositionError(error.message);
    }
    setSelectedPosition(data as FullPosition | null);
    setPositionLoading(false);
  };

  // ─── Action handlers ──────────────────────────────────────

  const handleAccept = async (id: string) => {
    await supabase.from('positions').delete().eq('id', id);
    setPositions(prev => prev.filter(p => p.id !== id));
    setSelectedPositionId(null);
    setSelectedPosition(null);
    toast({ title: 'Position accepted', description: 'Removed from active decisions.' });
  };

  const handleReject = async (id: string) => {
    await supabase.from('positions').delete().eq('id', id);
    setPositions(prev => prev.filter(p => p.id !== id));
    setSelectedPositionId(null);
    setSelectedPosition(null);
    toast({ title: 'Position rejected', description: 'Removed from active decisions.' });
  };

  const handleDefer = (id: string) => {
    setPositions(prev => prev.filter(p => p.id !== id));
    setSelectedPositionId(null);
    setSelectedPosition(null);
    toast({ title: 'Position deferred', description: 'Hidden for now.' });
  };

  const handleRevise = () => {
    if (!selectedPosition) return;
    onDiscuss?.({ id: selectedPosition.id, title: selectedPosition.title });
  };

  // ─── Derived ──────────────────────────────────────────────

  const level = LEVEL_BADGE[thread?.level ?? 'radar'] ?? LEVEL_BADGE['radar'];

  const backLabel = selectedPositionId
    ? `← ${thread?.title ?? 'Back'}`
    : '← Back';

  const handleBack = () => {
    if (selectedPositionId) {
      setSelectedPositionId(null);
      setSelectedPosition(null);
    } else {
      onClose();
    }
  };

  // ─── Render ───────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 px-5 pt-5 pb-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={handleBack}
            className="text-[11px] text-muted-foreground hover:text-foreground transition-colors truncate max-w-[280px]"
          >
            {backLabel}
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
          <LoadingSkeleton />
        ) : selectedPositionId ? (
          positionLoading ? (
            <LoadingSkeleton />
          ) : selectedPosition ? (
            <PositionDetail
              position={selectedPosition}
              onAccept={() => handleAccept(selectedPosition.id)}
              onReject={() => handleReject(selectedPosition.id)}
              onDefer={() => handleDefer(selectedPosition.id)}
              onRevise={handleRevise}
            />
          ) : (
            <div className="flex flex-col items-center justify-center mt-16 gap-2">
              <p className="text-sm text-muted-foreground">
                {positionError ? `Error: ${positionError}` : `Position not found (id: ${selectedPositionId})`}
              </p>
              <button
                onClick={() => { setSelectedPositionId(null); setSelectedPosition(null); setPositionError(null); }}
                className="text-xs text-muted-foreground hover:text-foreground underline transition-colors"
              >
                Back to list
              </button>
            </div>
          )
        ) : (
          <WorkspaceList
            positions={positions}
            signals={signals}
            totalSignalCount={thread?.signal_count ?? signals.length}
            onClickPosition={openPositionDetail}
            onClickSignal={(id) => onOpenSignal?.(id, { backLabel: thread?.title ?? 'Back' })}
          />
        )}
      </div>
    </div>
  );
}

// ─── WorkspaceList ──────────────────────────────────────────

function WorkspaceList({
  positions,
  signals,
  totalSignalCount,
  onClickPosition,
  onClickSignal,
}: {
  positions: PositionSummary[];
  signals: WorkspaceSignal[];
  totalSignalCount: number;
  onClickPosition: (id: string) => void;
  onClickSignal: (id: string) => void;
}) {
  const [showAllSignals, setShowAllSignals] = useState(false);
  const hasPositions = positions.length > 0;
  const hasSignals = signals.length > 0;

  const displayedSignals = showAllSignals ? signals : signals.slice(0, SIGNAL_PAGE_SIZE);
  const hasMore = signals.length > SIGNAL_PAGE_SIZE && !showAllSignals;

  // Section label: show "8 of 12" when capped, or just the count
  const signalLabel = totalSignalCount > displayedSignals.length
    ? `${displayedSignals.length} of ${totalSignalCount}`
    : `${displayedSignals.length}`;

  if (!hasPositions && !hasSignals) {
    return (
      <div className="flex flex-col items-center justify-center mt-16 gap-2">
        <p className="text-sm text-muted-foreground">AUO is gathering signals for this decision.</p>
        <p className="text-xs text-muted-foreground/60">Positions will appear as patterns emerge.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Positions section */}
      {hasPositions && (
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
            {positions.map(p => {
              const tone = TONE_CONFIG[(p.tone ?? '').toLowerCase()] ?? null;
              return (
                <button
                  key={p.id}
                  onClick={() => onClickPosition(p.id)}
                  className="w-full text-left rounded-lg border border-border px-4 py-3 hover:bg-accent/20 transition-colors cursor-pointer"
                >
                  <p className="text-[13px] font-medium text-foreground leading-snug">
                    {p.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {tone && (
                      <span
                        className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border"
                        style={{ backgroundColor: tone.bg, borderColor: tone.border, color: tone.color }}
                      >
                        {tone.label}
                      </span>
                    )}
                    {p.created_at && (
                      <span className="text-[10px] text-muted-foreground tabular-nums">
                        {new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Signals section */}
      {hasSignals && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground font-mono">
              Signals
            </span>
            <span className="text-[10px] font-bold bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full font-mono">
              {signalLabel}
            </span>
          </div>
          <div className="space-y-2">
            {displayedSignals.map(s => (
              <WorkspaceSignalCard key={s.id} signal={s} onClick={() => onClickSignal(s.id)} />
            ))}
          </div>
          {hasMore && (
            <button
              onClick={() => setShowAllSignals(true)}
              className="w-full mt-2 text-[11px] text-muted-foreground hover:text-foreground py-2 transition-colors"
            >
              View all {signals.length} signals →
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── WorkspaceSignalCard ────────────────────────────────────

function WorkspaceSignalCard({ signal, onClick }: { signal: WorkspaceSignal; onClick: () => void }) {
  const cred = signal.credibility ?? 0;
  const credPct = Math.round(cred * 100);

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-lg border border-border px-4 py-3 hover:bg-accent/20 transition-colors cursor-pointer"
    >
      <p className="text-[13px] font-medium text-foreground leading-snug line-clamp-2">
        {signal.title}
      </p>

      {/* Credibility bar */}
      <div className="w-full h-1 rounded-full bg-muted overflow-hidden mt-1.5 mb-1.5">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.max(credPct, 3)}%`, backgroundColor: credBarColor(cred) }}
        />
      </div>

      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
        <span>{signal.sources} source{signal.sources !== 1 ? 's' : ''}</span>
        <span>{credPct}% credibility</span>
        {signal.urgency && (
          <>
            <span className="text-muted-foreground/40">·</span>
            <span className="uppercase tracking-wider">{signal.urgency}</span>
          </>
        )}
        {signal.created_at && (
          <>
            <span className="text-muted-foreground/40">·</span>
            <span>{formatRelative(new Date(signal.created_at))}</span>
          </>
        )}
      </div>
    </button>
  );
}

// ─── PositionDetail ─────────────────────────────────────────

function PositionDetail({
  position,
  onAccept,
  onReject,
  onDefer,
  onRevise,
}: {
  position: FullPosition;
  onAccept: () => void;
  onReject: () => void;
  onDefer: () => void;
  onRevise: () => void;
}) {
  const tone = TONE_CONFIG[(position.tone ?? '').toLowerCase()] ?? null;
  const timestamp = position.created_at
    ? new Date(position.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : '';

  const { parsed: sections, legacy } = parseSections(position.sections);

  // Parse signal_refs for evidence
  const signalRefs = (() => {
    if (!position.signal_refs) return [] as SignalEvidence[];
    const raw = typeof position.signal_refs === 'string'
      ? (() => { try { return JSON.parse(position.signal_refs as string); } catch { return []; } })()
      : position.signal_refs;
    return Array.isArray(raw) ? (raw as SignalEvidence[]) : [];
  })();

  const evidence = sections?.signal_evidence?.length
    ? sections.signal_evidence
    : signalRefs;

  const memoParagraphs = sections?.memo
    ? sections.memo.split(/\n\n+/).filter(Boolean)
    : [];

  return (
    <div>
      {/* Tone badge + date */}
      <div className="flex items-center gap-2 mb-3">
        {tone && (
          <span
            className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border"
            style={{ backgroundColor: tone.bg, borderColor: tone.border, color: tone.color }}
          >
            {tone.label}
          </span>
        )}
        {timestamp && (
          <span className="text-[10px] text-muted-foreground tabular-nums">{timestamp}</span>
        )}
      </div>

      {/* Title */}
      <h2
        className="text-xl font-bold text-foreground leading-snug mb-3"
        style={{ fontFamily: "'Georgia', serif" }}
      >
        {position.title}
      </h2>

      {/* Essence */}
      {position.essence && (
        <p className="text-[13px] text-foreground/70 leading-relaxed italic border-l-2 border-amber-500/30 pl-3 mb-5">
          {position.essence}
        </p>
      )}

      {/* Key Numbers */}
      {sections?.key_numbers && sections.key_numbers.length > 0 && (
        <div className="grid grid-cols-2 gap-2 mb-5">
          {sections.key_numbers.map((kn, i) => (
            <div key={i} className="border border-border rounded-lg px-3 py-2.5 flex flex-col">
              <span className="text-lg font-bold text-foreground leading-none">{kn.value}</span>
              <span className="text-[11px] text-muted-foreground mt-1 leading-snug">{kn.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Memo paragraphs */}
      {memoParagraphs.length > 0 && (
        <div className="space-y-3 mb-5">
          {memoParagraphs.map((para, i) => (
            <p key={i} className="text-[14px] text-foreground/80 leading-[1.75]">
              {para}
            </p>
          ))}
        </div>
      )}

      {/* Legacy fallback */}
      {legacy && legacy.length > 0 && (
        <div className="space-y-3 mb-5">
          {legacy.map((sec, i) => (
            <p key={i} className="text-sm text-foreground/80 leading-[1.7]">{sec.content}</p>
          ))}
        </div>
      )}

      {/* Evidence / Based On */}
      {evidence.length > 0 && (
        <div className="border-t border-border/50 pt-4 mb-5">
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground font-mono">
            Based on
          </span>
          <div className="mt-3 space-y-3">
            {evidence.map((sig, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-muted-foreground/50 mt-0.5">·</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-medium text-foreground/80 leading-snug">{sig.title}</span>
                    <span className="text-[10px] text-muted-foreground tabular-nums flex-shrink-0">
                      ({Math.round((sig.credibility ?? 0) * 100)}%)
                    </span>
                  </div>
                  {sig.one_liner && (
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{sig.one_liner}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2 border-t border-border/40 pt-4">
        <button
          onClick={onAccept}
          className="text-[11px] font-medium px-3 py-1.5 rounded-md border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
        >
          Accept
        </button>
        <button
          onClick={onRevise}
          className="text-[11px] font-medium px-3 py-1.5 rounded-md border border-border text-muted-foreground hover:bg-accent/50 transition-colors"
        >
          Revise
        </button>
        <button
          onClick={onReject}
          className="text-[11px] font-medium px-3 py-1.5 rounded-md border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
        >
          Reject
        </button>
        <button
          onClick={onDefer}
          className="text-[11px] font-medium px-3 py-1.5 rounded-md border border-border text-muted-foreground hover:bg-accent/50 transition-colors"
        >
          Defer
        </button>
      </div>
    </div>
  );
}

// ─── Loading Skeleton ───────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[1, 2, 3].map(i => (
        <div key={i} className="rounded-lg border border-border p-4 space-y-2">
          <div className="h-3.5 w-3/4 rounded bg-muted" />
          <div className="h-3 w-1/2 rounded bg-muted/50" />
        </div>
      ))}
    </div>
  );
}
