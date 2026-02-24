import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { WorkspaceCard, type DecisionThread } from '@/components/WorkspaceCard';

// ─── Types ────────────────────────────────────────────────────────────────────

interface InsightRow {
  id: string;
  title: string;
  tier: string | null;
  user_relevance: string | null;
  urgency: string;
  cluster_name: string | null;
  created_at: string | null;
  signal_ids: string[];
  decision_question: string | null;
}

interface PositionRow {
  id: string;
  title: string;
  position_essence: string | null;
  tone: string | null;
  sections: Record<string, unknown> | null;
  created_at: string | null;
  decision_thread_id: string | null;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const URGENCY_ORDER: Record<string, number> = { urgent: 0, emerging: 1, monitor: 2 };

const URGENCY_BADGE: Record<string, { bg: string; label: string }> = {
  urgent:   { bg: '#c0392b', label: 'URGENT' },
  emerging: { bg: '#e67e22', label: 'EMERGING' },
  monitor:  { bg: '#999',    label: 'MONITOR' },
};

const TONE_CONFIG: Record<string, { bg: string; border: string; color: string; label: string }> = {
  decisive:    { bg: '#f0fdf4', border: '#bbf7d0', color: '#16a34a', label: 'DECISIVE' },
  conditional: { bg: '#fffbeb', border: '#fde68a', color: '#b45309', label: 'CONDITIONAL' },
  exploratory: { bg: '#f8fafc', border: '#e2e8f0', color: '#64748b', label: 'EXPLORATORY' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function processInsights(raw: InsightRow[]): InsightRow[] {
  const sorted = [...raw].sort((a, b) => {
    const ua = URGENCY_ORDER[a.urgency] ?? 3;
    const ub = URGENCY_ORDER[b.urgency] ?? 3;
    if (ua !== ub) return ua - ub;
    return (b.created_at ?? '').localeCompare(a.created_at ?? '');
  });

  const result: InsightRow[] = [];
  const clusterCount: Record<string, number> = {};

  for (const row of sorted) {
    if (result.length >= 8) break;
    const key = row.cluster_name;
    if (key) {
      const count = clusterCount[key] ?? 0;
      if (count >= 2) continue;
      clusterCount[key] = count + 1;
    }
    result.push(row);
  }
  return result;
}

function fmtDate(iso: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Skeletons ────────────────────────────────────────────────────────────────

function SkeletonPositionCard() {
  return (
    <div className="rounded-xl border border-border p-5 space-y-3 animate-pulse mb-3">
      <div className="flex gap-2">
        <div className="h-5 w-24 rounded-full bg-muted" />
        <div className="h-5 w-20 rounded-full bg-muted/60" />
      </div>
      <div className="h-4 w-3/4 rounded bg-muted" />
      <div className="h-3 w-full rounded bg-muted/60" />
      <div className="h-3 w-5/6 rounded bg-muted/40" />
    </div>
  );
}

function SkeletonBriefCard() {
  return (
    <div className="rounded-xl border border-border p-4 space-y-2 animate-pulse mb-2">
      <div className="flex justify-between">
        <div className="h-4 w-16 rounded-full bg-muted" />
        <div className="h-3 w-20 rounded bg-muted/60" />
      </div>
      <div className="h-3.5 w-full rounded bg-muted" />
      <div className="h-3 w-4/5 rounded bg-muted/50" />
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground font-mono">
        {label}
      </span>
      <span className="text-[10px] font-bold bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full font-mono">
        {count}
      </span>
    </div>
  );
}

// ─── Position Card ────────────────────────────────────────────────────────────

interface PositionCardProps {
  position: PositionRow;
  onAccept: (id: string) => void;
  onRevise: (id: string) => void;
  onReject: (id: string) => void;
  onDefer: (id: string) => void;
}

function PositionCard({ position, onAccept, onRevise, onReject, onDefer }: PositionCardProps) {
  const toneKey = (position.tone ?? 'decisive').toLowerCase();
  const tone = TONE_CONFIG[toneKey] ?? TONE_CONFIG['decisive'];
  const memo = (position.sections as Record<string, unknown>)?.memo as string | undefined;

  return (
    <div className="rounded-xl border border-border hover:border-muted-foreground/40 bg-background hover:shadow-md transition-all duration-150 mb-3 overflow-hidden">
      <div className="p-5">
        {/* Top row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {position.tone && (
              <span
                className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full font-mono"
                style={{ background: tone.bg, border: `1px solid ${tone.border}`, color: tone.color }}
              >
                {tone.label}
              </span>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {fmtDate(position.created_at)}
          </span>
        </div>

        {/* Title */}
        <p className="text-[15px] font-bold text-foreground leading-snug mb-2" style={{ fontFamily: "'Georgia', serif", letterSpacing: '-0.01em' }}>
          {position.title}
        </p>

        {/* Position essence */}
        {position.position_essence && (
          <p className="text-[13px] text-foreground/80 font-medium leading-snug mb-2">
            {position.position_essence}
          </p>
        )}

        {/* Memo from sections */}
        {memo && (
          <p className="text-[13px] text-muted-foreground leading-relaxed mb-3 line-clamp-3">
            {memo}
          </p>
        )}

        {/* Divider */}
        <div className="border-t border-border mb-3" />

        {/* Actions */}
        <div className="flex gap-2">
          <ActionButton
            label="Accept" icon="✓"
            activeColor="#16a34a" activeBg="#f0fdf4" activeBorder="#bbf7d0"
            onClick={() => onAccept(position.id)}
          />
          <ActionButton
            label="Revise" icon="↗"
            activeColor="#2563eb" activeBg="#eff6ff" activeBorder="#bfdbfe"
            onClick={() => onRevise(position.id)}
          />
          <ActionButton
            label="Reject" icon="✕"
            activeColor="#dc2626" activeBg="#fef2f2" activeBorder="#fecaca"
            onClick={() => onReject(position.id)}
          />
          <ActionButton
            label="Defer" icon="→"
            activeColor="#6b7280" activeBg="#f9fafb" activeBorder="#e5e7eb"
            onClick={() => onDefer(position.id)}
          />
        </div>
      </div>
    </div>
  );
}

function ActionButton({
  label, icon, activeColor, activeBg, activeBorder, onClick
}: {
  label: string; icon: string;
  activeColor: string; activeBg: string; activeBorder: string;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg border transition-all duration-100 cursor-pointer"
      style={{
        color: hovered ? activeColor : '#6b7280',
        background: hovered ? activeBg : '#fff',
        borderColor: hovered ? activeBorder : '#e5e7eb',
      }}
    >
      <span className="text-[10px]">{icon}</span>
      {label}
    </button>
  );
}

// ─── Briefing Card ────────────────────────────────────────────────────────────

interface BriefingCardProps {
  insight: InsightRow;
  onOpen: (id: string) => void;
  onDiscuss: (insight: InsightRow) => void;
}

function BriefingCard({ insight, onOpen, onDiscuss }: BriefingCardProps) {
  const badge = URGENCY_BADGE[insight.urgency] ?? null;
  const signalCount = insight.signal_ids?.length ?? 0;

  return (
    <div
      onClick={() => onOpen(insight.id)}
      className="group rounded-xl border border-border hover:border-muted-foreground/30 hover:bg-accent/20 transition-all duration-150 cursor-pointer mb-2 overflow-hidden"
    >
      <div className="px-4 py-3">
        {/* Top row */}
        <div className="flex items-center justify-between mb-1.5">
          {badge && (
            <span
              className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: badge.bg }}
            >
              {badge.label}
            </span>
          )}
          <span className="text-[10px] text-muted-foreground tabular-nums ml-auto">
            {fmtDate(insight.created_at)}
            {signalCount > 0 && ` · ${signalCount} signal${signalCount !== 1 ? 's' : ''}`}
          </span>
        </div>

        {/* Title */}
        <p className="text-[13px] font-semibold text-foreground leading-snug mb-1">
          {insight.title}
        </p>

        {/* Decision question */}
        {insight.decision_question && (
          <p className="text-[11px] italic text-muted-foreground leading-snug line-clamp-2">
            {insight.decision_question}
          </p>
        )}
      </div>

      {/* Hover actions */}
      <div className="px-4 pb-2.5 pt-0 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        <button
          onClick={e => { e.stopPropagation(); onDiscuss(insight); }}
          className="text-[11px] font-medium text-muted-foreground hover:text-foreground border border-border rounded-md px-2.5 py-1 hover:bg-background transition-colors"
        >
          Ask AUO →
        </button>
        <button
          onClick={e => { e.stopPropagation(); onOpen(insight.id); }}
          className="text-[11px] font-medium text-foreground border border-border rounded-md px-2.5 py-1 hover:bg-background transition-colors"
        >
          Explore detail →
        </button>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

interface PrimarySurfaceProps {
  onOpenInsight: (id: string) => void;
  onDiscuss: (insight: InsightRow) => void;
  onOpenWorkspace?: (threadId: string) => void;
}

export function PrimarySurface({ onOpenInsight, onDiscuss, onOpenWorkspace }: PrimarySurfaceProps) {
  const [insights, setInsights] = useState<InsightRow[]>([]);
  const [positions, setPositions] = useState<PositionRow[]>([]);
  const [threads, setThreads] = useState<DecisionThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  const fetchAll = async () => {
    setLoading(true);
    setLoadError(false);

    const userId = localStorage.getItem('userId') ?? undefined;

    const [insightRes, positionRes, threadRes] = await Promise.all([
      supabase
        .from('insights')
        .select('id, title, tier, user_relevance, urgency, cluster_name, created_at, signal_ids, decision_question')
        .not('tier', 'is', null)
        .not('title', 'like', '[PROTO]%')
        .order('created_at', { ascending: false })
        .limit(50),

      supabase
        .from('positions')
        .select('id, title, position_essence, tone, sections, created_at, validation_issues, decision_thread_id')
        .or('validation_issues.is.null,validation_issues->>hidden.neq.true')
        .order('created_at', { ascending: false })
        .limit(30),

      supabase
        .from('decision_threads')
        .select('id, title, level, topic_cluster, updated_at, decision_signals(count)')
        .not('level', 'in', '("decided","archived")')
        .order('updated_at', { ascending: false }),
    ]);

    if (insightRes.error) {
      console.error('PrimarySurface insights error:', insightRes.error);
      setLoadError(true);
      setLoading(false);
      return;
    }

    setInsights(processInsights((insightRes.data ?? []) as InsightRow[]));
    setPositions((positionRes.data ?? []) as PositionRow[]);

    const rawThreads = (threadRes.data ?? []) as Record<string, unknown>[];
    setThreads(rawThreads.map(t => {
      const sigArr = t.decision_signals as { count: number }[] | undefined;
      return {
        id: t.id as string,
        title: t.title as string,
        level: t.level as string,
        topic_cluster: t.topic_cluster as string | null,
        updated_at: t.updated_at as string,
        signal_count: sigArr?.[0]?.count ?? 0,
      };
    }));

    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  // Position actions — positions table has no status column yet,
  // so we delete the row on accept/reject and remove from local state.
  const handleAccept = async (id: string) => {
    // TODO: when status column is added, update to 'active' instead of deleting
    await supabase.from('positions').delete().eq('id', id);
    setPositions(p => p.filter(x => x.id !== id));
    showToast('Position accepted ✓');
  };

  const handleRevise = (id: string) => {
    const pos = positions.find(p => p.id === id);
    if (pos) onDiscuss({ id: pos.id, title: pos.title } as InsightRow);
  };

  const handleReject = async (id: string) => {
    await supabase.from('positions').delete().eq('id', id);
    setPositions(p => p.filter(x => x.id !== id));
    showToast('Position rejected');
  };

  const handleDefer = async (id: string) => {
    // Remove from view — no status column to set deferred
    setPositions(p => p.filter(x => x.id !== id));
    showToast('Deferred (hidden this session)');
  };

  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const sortedThreads = [...threads].sort((a, b) => {
    if (a.level === 'monitoring' && b.level !== 'monitoring') return -1;
    if (b.level === 'monitoring' && a.level !== 'monitoring') return 1;
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });

  const radarPositions = positions.filter(p => !p.decision_thread_id);
  const hasThreads = sortedThreads.length > 0;
  const hasRadar = radarPositions.length > 0;

  return (
    <div className="flex flex-col h-full relative">

      {/* Toast */}
      {toast && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-foreground text-background text-[11px] font-semibold px-4 py-2 rounded-lg shadow-lg pointer-events-none animate-in fade-in duration-200">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex-shrink-0 px-5 pt-5 pb-4 border-b border-border">
        <h1 className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground mb-0.5">
          Today's Intelligence
        </h1>
        <p className="text-xs text-muted-foreground">{today}</p>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-5 py-5">

        {loading ? (
          <div className="space-y-1">
            <SkeletonPositionCard />
            <SkeletonPositionCard />
            <div className="border-t border-border my-5" />
            {[1,2,3].map(i => <SkeletonBriefCard key={i} />)}
          </div>

        ) : loadError ? (
          <div className="flex flex-col items-center justify-center mt-16 gap-2">
            <p className="text-sm text-muted-foreground">Unable to load.</p>
            <button
              onClick={fetchAll}
              className="text-xs text-muted-foreground hover:text-foreground underline transition-colors"
            >
              Retry?
            </button>
          </div>

        ) : (
          <>
            {/* ACTIVE DECISIONS */}
            {hasThreads ? (
              <div className="mb-2">
                <SectionHeader label="Active Decisions" count={sortedThreads.length} />
                {sortedThreads.map(t => (
                  <WorkspaceCard
                    key={t.id}
                    thread={t}
                    onClick={(id) => onOpenWorkspace?.(id)}
                  />
                ))}
              </div>
            ) : (
              <div className="mb-6 rounded-xl border border-dashed border-border px-4 py-6 text-center">
                <p className="text-[13px] text-muted-foreground">
                  Start a conversation with AUO about a decision you're evaluating to create your first workspace.
                </p>
              </div>
            )}

            {/* Divider */}
            {hasRadar && (
              <div className="border-t border-border my-6" />
            )}

            {/* RADAR */}
            {hasRadar && (
              <div className="mb-2">
                <SectionHeader label="Radar" count={radarPositions.length} />
                {radarPositions.map(p => (
                  <PositionCard
                    key={p.id}
                    position={p}
                    onAccept={handleAccept}
                    onRevise={handleRevise}
                    onReject={handleReject}
                    onDefer={handleDefer}
                  />
                ))}
              </div>
            )}

            {/* Divider before signals */}
            {(hasThreads || hasRadar) && insights.length > 0 && (
              <div className="border-t border-border my-6" />
            )}

            {/* SIGNALS WORTH WATCHING */}
            {insights.length > 0 && (
              <div>
                <SectionHeader label="Signals Worth Watching" count={insights.length} />
                {insights.map(insight => (
                  <BriefingCard
                    key={insight.id}
                    insight={insight}
                    onOpen={onOpenInsight}
                    onDiscuss={onDiscuss}
                  />
                ))}
              </div>
            )}

            {/* Empty state — nothing at all */}
            {!hasThreads && !hasRadar && insights.length === 0 && (
              <div className="flex flex-col items-center justify-center mt-20 gap-2">
                <p className="text-sm text-muted-foreground">No intelligence yet.</p>
                <p className="text-xs text-muted-foreground/60">Check back after the next scan.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
