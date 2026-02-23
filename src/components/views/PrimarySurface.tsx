import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

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
  memo: string | null;
  stance: string | null;
  confidence: string | null;
  time_sensitivity: string | null;
  signal_count: number | null;
  created_at: string | null;
  status: string | null;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const URGENCY_ORDER: Record<string, number> = { urgent: 0, emerging: 1, monitor: 2 };

const URGENCY_BADGE: Record<string, { bg: string; label: string }> = {
  urgent:   { bg: '#c0392b', label: 'URGENT' },
  emerging: { bg: '#e67e22', label: 'EMERGING' },
  monitor:  { bg: '#999',    label: 'MONITOR' },
};

const STANCE_CONFIG: Record<string, { bg: string; border: string; color: string }> = {
  DEFENSIVE:    { bg: '#fef2f2', border: '#fecaca', color: '#dc2626' },
  OFFENSIVE:    { bg: '#f0fdf4', border: '#bbf7d0', color: '#16a34a' },
  INVESTIGATE:  { bg: '#fffbeb', border: '#fde68a', color: '#b45309' },
  'WAIT-AND-SEE': { bg: '#f8fafc', border: '#e2e8f0', color: '#64748b' },
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
  const stanceKey = (position.stance ?? '').toUpperCase();
  const stance = STANCE_CONFIG[stanceKey] ?? STANCE_CONFIG['INVESTIGATE'];
  const signalCount = position.signal_count ?? 0;

  return (
    <div className="rounded-xl border border-border hover:border-muted-foreground/40 bg-background hover:shadow-md transition-all duration-150 mb-3 overflow-hidden">
      <div className="p-5">
        {/* Top row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {position.stance && (
              <span
                className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full font-mono"
                style={{ background: stance.bg, border: `1px solid ${stance.border}`, color: stance.color }}
              >
                {position.stance}
              </span>
            )}
            {position.confidence && (
              <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
                <span
                  className="w-1.5 h-1.5 rounded-full inline-block"
                  style={{ background: position.confidence === 'high' ? '#16a34a' : '#f59e0b' }}
                />
                {position.confidence} confidence
              </span>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {fmtDate(position.created_at)}
            {signalCount > 0 && ` · ${signalCount} signals`}
          </span>
        </div>

        {/* Title */}
        <p className="text-[15px] font-bold text-foreground leading-snug mb-2" style={{ fontFamily: "'Georgia', serif", letterSpacing: '-0.01em' }}>
          {position.title}
        </p>

        {/* Memo */}
        {position.memo && (
          <p className="text-[13px] text-muted-foreground leading-relaxed mb-3 line-clamp-3">
            {position.memo}
          </p>
        )}

        {/* Time sensitivity */}
        {position.time_sensitivity && (
          <div className="flex items-center gap-1.5 mb-4">
            <span className="text-[9px] text-orange-500">◆</span>
            <span className="text-[10px] font-semibold text-orange-600 uppercase tracking-wider font-mono">
              {position.time_sensitivity}
            </span>
          </div>
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
}

export function PrimarySurface({ onOpenInsight, onDiscuss }: PrimarySurfaceProps) {
  const [insights, setInsights] = useState<InsightRow[]>([]);
  const [positions, setPositions] = useState<PositionRow[]>([]);
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

    const [insightRes, positionRes] = await Promise.all([
      supabase
        .from('insights')
        .select('id, title, tier, user_relevance, urgency, cluster_name, created_at, signal_ids, decision_question')
        .not('tier', 'is', null)
        .not('title', 'like', '[PROTO]%')
        .order('created_at', { ascending: false })
        .limit(50),

      supabase
        .from('positions')
        .select('id, title, memo, stance, confidence, time_sensitivity, signal_count, created_at, status')
        .eq('status', 'draft')
        .order('created_at', { ascending: false })
        .limit(5),
    ]);

    if (insightRes.error) {
      console.error('PrimarySurface insights error:', insightRes.error);
      setLoadError(true);
      setLoading(false);
      return;
    }

    setInsights(processInsights((insightRes.data ?? []) as InsightRow[]));
    setPositions((positionRes.data ?? []) as PositionRow[]);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  // Position actions
  const handleAccept = async (id: string) => {
    await supabase.from('positions').update({ status: 'active' }).eq('id', id);
    setPositions(p => p.filter(x => x.id !== id));
    showToast('Position accepted ✓');
  };

  const handleRevise = (id: string) => {
    const pos = positions.find(p => p.id === id);
    if (pos) onDiscuss({ id: pos.id, title: pos.title } as InsightRow);
  };

  const handleReject = async (id: string) => {
    await supabase.from('positions').update({ status: 'rejected' }).eq('id', id);
    setPositions(p => p.filter(x => x.id !== id));
    showToast('Position rejected');
  };

  const handleDefer = async (id: string) => {
    const deferUntil = new Date();
    deferUntil.setDate(deferUntil.getDate() + 7);
    await supabase.from('positions').update({ status: 'deferred' }).eq('id', id);
    setPositions(p => p.filter(x => x.id !== id));
    showToast('Deferred 7 days →');
  };

  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const hasPositions = positions.length > 0;

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
            {/* POSITIONS FOR REVIEW */}
            {hasPositions && (
              <div className="mb-2">
                <SectionHeader label="Positions for Review" count={positions.length} />
                {positions.map(p => (
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

            {/* Divider */}
            {hasPositions && insights.length > 0 && (
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

            {/* Empty state — no positions, no insights */}
            {!hasPositions && insights.length === 0 && (
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
