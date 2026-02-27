import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { colors, typography, spacing, radius, transition, shadow, pillStyle } from '../design-tokens';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SignalBasis {
  source_quality: number;
  recency_score: number;
  convergence_score: number;
  source_names: string[];
  signal_count: number;
  most_recent_date: string | null;
}

interface FeedPosition {
  id: string;
  title: string;
  tone: string;
  why_now?: string | null;
  reasoning?: string | null;
  position_essence?: string | null;
  cover_image_url?: string | null;
  signal_refs?: unknown[] | null;
  fact_confidence?: number | null;
  signal_basis?: SignalBasis | null;
  validated_at?: string | null;
  validation_issues?: Record<string, unknown> | null;
  created_at: string;
  decision_thread_id: string;
  decision_threads?: {
    id: string;
    title: string;
    lens: string;
    cover_image_url?: string | null;
  } | null;
}

// ─── Typography ───────────────────────────────────────────────────────────────

const T = {
  logo:        { fontSize: 24, fontWeight: 900, letterSpacing: typography.letterSpacing.tight },
  newBtn:      { fontSize: typography.size.md, fontWeight: typography.weight.semibold },
  filterTab:   { fontSize: typography.size.base, fontWeight: typography.weight.medium },
  cardTitle:   { fontSize: 22, fontWeight: typography.weight.bold, letterSpacing: typography.letterSpacing.tight, lineHeight: 1.3 },
  cardThread:  { fontSize: typography.size.sm, fontWeight: typography.weight.medium },
  cardUrgency: { fontSize: 10, fontWeight: typography.weight.bold, letterSpacing: typography.letterSpacing.wider },
} as const;

// ─── Tone normalization ──────────────────────────────────────────────────────

const normalizeTone = (raw: string): string => {
  if (raw === 'CONSIDER') return 'WATCH';
  if (raw === 'ACT_NOW') return 'ACT NOW';
  return raw;
};

// ─── Urgency config ───────────────────────────────────────────────────────────

const URGENCY = {
  BREAKING: {
    label: 'BREAKING', color: '#ef4444',
    glow: '0 0 10px rgba(239,68,68,0.9)',
    gradient: 'linear-gradient(to right, transparent 0%, transparent 25%, rgba(180,0,0,0.5) 55%, rgba(120,0,0,0.97) 100%)',
  },
  'ACT NOW': {
    label: 'ACT NOW', color: '#ef4444',
    glow: '0 0 8px rgba(239,68,68,0.8)',
    gradient: 'linear-gradient(to right, transparent 0%, transparent 30%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.82) 68%, rgba(0,0,0,0.96) 100%)',
  },
  WATCH: {
    label: 'WATCH', color: '#f59e0b',
    glow: 'none',
    gradient: 'linear-gradient(to right, transparent 0%, transparent 30%, rgba(0,0,0,0.25) 50%, rgba(0,0,0,0.80) 68%, rgba(0,0,0,0.94) 100%)',
  },
} as const;

const getUrgency = (tone: string) =>
  URGENCY[tone as keyof typeof URGENCY] || URGENCY.WATCH;

const formatLens = (lens: string): string =>
  (lens || "").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

const formatRecency = (dateStr: string): string => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const LENS_GRADIENTS: Record<string, string> = {
  textile_innovation:      'linear-gradient(135deg, #b8753a 0%, #5c2e0e 100%)',
  supply_chain_resilience: 'linear-gradient(135deg, #1a3f6e 0%, #071628 100%)',
  sourcing:                'linear-gradient(135deg, #5c4020 0%, #1f1208 100%)',
  regulatory_compliance:   'linear-gradient(135deg, #1e3448 0%, #080f18 100%)',
  competitive:             'linear-gradient(135deg, #2a2a2a 0%, #080808 100%)',
};

// ─── Urgency weight for sorting ──────────────────────────────────────────────

const urgencyWeight = (tone: string): number => {
  const t = tone?.toUpperCase();
  if (t === 'BREAKING') return 4;
  if (t === 'ACT NOW' || t === 'ACT_NOW') return 3;
  if (t === 'WATCH') return 2;
  if (t === 'CONSIDER') return 1;
  return 0;
};

// ─── PositionCard — L→R gradient, image left, text right ────────────────────

function PositionCard({
  pos, onClick, onLensClick,
}: {
  pos: FeedPosition;
  onClick: (positionId: string) => void;
  onLensClick: (lens: string) => void;
}) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [hovered, setHovered] = useState(false);

  const tone = normalizeTone(pos.tone || 'WATCH');
  const urg = getUrgency(tone);
  const lens = pos.decision_threads?.lens || '';
  const imageUrl = pos.cover_image_url || pos.decision_threads?.cover_image_url;
  const isBreaking = tone === 'BREAKING';

  return (
    <div
      onClick={() => onClick(pos.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        borderRadius: 16,
        overflow: 'hidden',
        height: 260,
        background: LENS_GRADIENTS[lens] || LENS_GRADIENTS.competitive,
        boxShadow: hovered ? shadow.lg : shadow.sm,
        cursor: 'pointer',
        transition: transition.slow,
        flexShrink: 0,
      }}
    >
      {/* Cover image — z1 */}
      {imageUrl && (
        <img
          src={imageUrl} alt=""
          onLoad={() => setImageLoaded(true)}
          className={hovered ? 'auo-card-img-hover' : ''}
          style={{
            position: 'absolute', inset: 0, zIndex: 1,
            width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center center',
            opacity: imageLoaded ? 1 : 0,
            transform: hovered ? 'scale(1.03)' : 'scale(1)',
            transition: 'transform 0.4s ease, opacity 0.5s ease',
          }}
        />
      )}

      {/* Hover darkness overlay — z2 */}
      <div
        className={hovered ? 'auo-card-dark-hover' : ''}
        style={{
          position: 'absolute', inset: 0, zIndex: 2,
          pointerEvents: 'none',
          background: 'rgba(0,0,0,0)',
          transition: 'background 0.6s ease-out',
        }}
      />

      {/* L→R gradient overlay — z3 */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 3, background: urg.gradient }} />

      {/* Text content — z5 */}
      <div style={{
        position: 'absolute', top: 0, right: 0, bottom: 36,
        width: '58%', zIndex: 5,
        padding: '0 20px 0 0',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center',
        gap: 8,
        overflow: 'hidden',
      }}>
        {/* Badge + lens */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {isBreaking ? (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '4px 10px',
              borderRadius: 20,
              background: 'rgba(220,0,0,0.85)',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.06em',
              color: colors.text.primary.dark,
            }}>
              <span className="auo-pulse-dot" style={{
                width: 6, height: 6, borderRadius: '50%',
                background: colors.text.primary.dark, display: 'inline-block',
              }} />
              BREAKING
            </div>
          ) : (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: 'rgba(0,0,0,0.35)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
              borderRadius: 20, padding: '3px 9px',
              border: '1px solid rgba(255,255,255,0.08)',
            }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: urg.color, boxShadow: urg.glow, flexShrink: 0,
              }} />
              <span style={{
                ...T.cardUrgency, color: urg.color,
                fontFamily: "'SF Mono', 'Fira Code', monospace",
              }}>
                {urg.label}
              </span>
            </div>
          )}
          {isBreaking && (
            <span style={{ fontSize: 11, color: 'rgba(255,150,150,0.8)', fontWeight: 400 }}>
              · just now
            </span>
          )}
          <span
            onClick={(e) => {
              e.stopPropagation();
              if (lens) onLensClick(lens);
            }}
            style={{
              ...T.cardThread,
              color: 'rgba(255,255,255,0.7)',
              overflow: 'hidden', whiteSpace: 'nowrap',
              textOverflow: 'ellipsis', maxWidth: 200,
              cursor: 'pointer',
              textDecoration: 'underline',
              textUnderlineOffset: 2,
            }}
          >
            {formatLens(lens)}
          </span>
        </div>

        {/* Title */}
        <p style={{
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: '-0.02em',
          lineHeight: 1.25,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          color: colors.text.primary.dark,
          margin: 0,
          textShadow: '0 1px 8px rgba(0,0,0,0.4)',
        }}>
          {pos.title}
        </p>

        {/* why_now */}
        {pos.why_now && (
          <div style={{
            fontSize: 13,
            fontWeight: 400,
            color: 'rgba(255,255,255,0.85)',
            lineHeight: 1.45,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            marginBottom: 4,
          }}>
            {pos.why_now}
          </div>
        )}
      </div>

      {/* CTA Strip — always visible */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 6,
          pointerEvents: 'none',
          height: 44,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          background: hovered
            ? 'rgba(255,255,255,0.12)'
            : 'rgba(255,255,255,0.06)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderTop: `1px solid ${colors.border.dark}`,
          transition: transition.base,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: 12,
            fontWeight: 500,
            color: hovered ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.5)',
            letterSpacing: '0.02em',
            transition: transition.base,
          }}>
            Read insight
          </span>
          {pos.signal_basis?.signal_count != null && pos.signal_basis.signal_count > 0 && (
            <span style={{
              fontSize: 11,
              color: 'rgba(255,255,255,0.45)',
            }}>
              · {pos.signal_basis.signal_count} signal{pos.signal_basis.signal_count !== 1 ? 's' : ''}
              {pos.signal_basis.most_recent_date && (
                ` · ${formatRecency(pos.signal_basis.most_recent_date)}`
              )}
            </span>
          )}
        </div>
        <span style={{
          fontSize: 14,
          color: hovered ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.4)',
          transition: transition.base,
        }}>
          →
        </span>
      </div>
    </div>
  );
}

// ─── New Topic Modal ─────────────────────────────────────────────────────────

function NewTopicModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [messages, setMessages] = useState<{ role: 'auo' | 'user'; text: string }[]>([
    { role: 'auo', text: "What's important to you this week?" },
  ]);
  const PILLS = ['Tariff impact', 'New certification', 'Supplier decision', 'Innovation watch', 'Sourcing risk'];
  const handleSend = async () => {
    const query = input.trim();
    if (!query || submitting) return;
    setMessages(prev => [...prev, { role: 'user', text: query }]);
    setInput('');
    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setSubmitting(false); return; }

      // Check for existing active thread with similar title
      const searchWords = query.split(' ').slice(0, 4).join('%');
      const { data: existing } = await (supabase as any)
        .from('decision_threads')
        .select('id, title')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .ilike('title', `%${searchWords}%`)
        .limit(1);

      if (existing && existing.length > 0) {
        console.log(`[NewTopic] Thread already exists: ${existing[0].title}`);
        setMessages(prev => [...prev, { role: 'auo', text: `You already have "${existing[0].title}" — opening it now.` }]);
        setTimeout(() => { onClose(); navigate(`/insights/${existing[0].id}`); }, 1200);
        return;
      }

      // Create new thread
      const { data: thread, error } = await (supabase as any)
        .from('decision_threads')
        .insert({
          user_id: user.id,
          title: query,
          status: 'active',
        })
        .select()
        .single();

      if (error || !thread) {
        console.error('[NewTopic] Failed to create thread:', error);
        setMessages(prev => [...prev, { role: 'auo', text: 'Something went wrong. Try again.' }]);
        setSubmitting(false);
        return;
      }

      // Trigger scan_priority
      supabase.functions.invoke('scan_priority', { body: { thread_id: thread.id } }).catch(err =>
        console.warn('[NewTopic] scan_priority invoke failed (non-blocking):', err)
      );

      setMessages(prev => [...prev, { role: 'auo', text: "Got it. I'll start monitoring this and build your first positions. Give me a few minutes." }]);
      setTimeout(() => { onClose(); navigate(`/insights/${thread.id}`); }, 2000);
    } catch (err) {
      console.error('[NewTopic] Error:', err);
      setMessages(prev => [...prev, { role: 'auo', text: 'Something went wrong. Try again.' }]);
      setSubmitting(false);
    }
  };
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', zIndex: 100 }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 'min(600px, 90vw)', background: colors.bg.light, borderRadius: 20, boxShadow: '0 24px 64px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.06)', zIndex: 101, overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '80vh' }}>
        <div style={{ padding: '18px 20px 14px', borderBottom: `1px solid ${colors.border.light}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: colors.text.primary.light }}>Add topic</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.text.muted.light, fontSize: 18, padding: '2px 6px', borderRadius: 6 }}>×</button>
        </div>
        <div style={{ padding: '20px 20px 12px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{ maxWidth: '80%', background: msg.role === 'auo' ? colors.bg.surface : colors.text.primary.light, color: msg.role === 'auo' ? colors.text.primary.light : colors.text.primary.dark, borderRadius: msg.role === 'auo' ? '4px 16px 16px 16px' : '16px 4px 16px 16px', padding: '10px 14px', fontSize: 14, lineHeight: 1.5 }}>{msg.text}</div>
            </div>
          ))}
        </div>
        <div style={{ padding: '0 20px 12px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {PILLS.map(pill => (
            <button key={pill} onClick={() => setInput(pill)} style={{ background: input === pill ? colors.text.primary.light : colors.bg.surface, color: input === pill ? colors.text.primary.dark : colors.text.secondary.light, border: 'none', borderRadius: 20, padding: '6px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: transition.fast }}>{pill}</button>
          ))}
        </div>
        <div style={{ padding: '0 20px 20px', display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} placeholder="Or describe what you want to track..." style={{ flex: 1, border: `1px solid ${colors.border.medium}`, borderRadius: 12, padding: '10px 14px', fontSize: 14, resize: 'none', height: 44, fontFamily: 'inherit', outline: 'none', color: colors.text.primary.light, lineHeight: 1.5, transition: transition.fast }} onFocus={e => (e.currentTarget.style.borderColor = colors.text.primary.light)} onBlur={e => (e.currentTarget.style.borderColor = colors.border.medium)} />
          <button onClick={handleSend} disabled={!input.trim() || submitting} style={{ background: input.trim() && !submitting ? colors.text.primary.light : colors.border.medium, color: input.trim() && !submitting ? colors.text.primary.dark : colors.text.muted.light, border: 'none', borderRadius: 10, width: 44, height: 44, fontSize: 18, cursor: input.trim() && !submitting ? 'pointer' : 'default', flexShrink: 0, transition: transition.fast, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{submitting ? '…' : '→'}</button>
        </div>
      </div>
    </>
  );
}

// ─── Main Feed ────────────────────────────────────────────────────────────────

const FONT = typography.fontFamily;
const FILTER_TABS = ['All', 'ACT NOW', 'WATCH', '✦ Suggested'] as const;
type FilterTab = typeof FILTER_TABS[number];

export default function Feed() {
  const navigate = useNavigate();
  const [positions, setPositions] = useState<FeedPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewTopic, setShowNewTopic] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('All');
  const [activeLens, setActiveLens] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'urgent' | 'recent'>('urgent');
  const [hoveredPill, setHoveredPill] = useState<string | null>(null);

  const loadFeed = useCallback(async () => {
    try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Step 1: Get user's active thread IDs + metadata
    const { data: threadData } = await (supabase as any)
      .from('decision_threads')
      .select('id, title, lens, cover_image_url')
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (!threadData?.length) { setPositions([]); setLoading(false); return; }

    const threadIds = threadData.map((t: any) => t.id);
    const threadMap: Record<string, FeedPosition['decision_threads']> = {};
    for (const t of threadData) {
      threadMap[t.id] = { id: t.id, title: t.title, lens: t.lens, cover_image_url: t.cover_image_url };
    }

    // Step 2: Fetch all validated positions for those threads
    const { data: positionData, error: posErr } = await (supabase as any)
      .from('positions')
      .select('id, title, tone, position_essence, why_now, reasoning, cover_image_url, fact_confidence, signal_basis, validated_at, validation_issues, signal_refs, created_at, decision_thread_id')
      .in('decision_thread_id', threadIds)
      .not('validated_at', 'is', null)
      .order('created_at', { ascending: false })
      .limit(50);

    if (posErr) { console.error('[Feed] positions query error:', posErr); }
    if (!positionData) { setPositions([]); setLoading(false); return; }

    // Step 3: Filter hidden, attach thread data
    const enriched: FeedPosition[] = (positionData as any[])
      .filter((p: any) => {
        const vi = p.validation_issues as Record<string, unknown> | null;
        return !vi?.hidden;
      })
      .map((p: any) => ({
        ...p,
        decision_threads: threadMap[p.decision_thread_id] || null,
      }));

    // Step 4: Sort — urgency DESC, fact_confidence DESC, created_at DESC
    const sorted = [...enriched].sort((a, b) => {
      const urgDiff = urgencyWeight(b.tone) - urgencyWeight(a.tone);
      if (urgDiff !== 0) return urgDiff;
      const confDiff = (b.fact_confidence || 0) - (a.fact_confidence || 0);
      if (confDiff !== 0) return confDiff;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    // Step 5: Dedup — within same lens, skip if title too similar
    const deduped: FeedPosition[] = [];
    const shownTitleWords: Record<string, Set<string>> = {};

    for (const pos of sorted) {
      const lens = pos.decision_threads?.lens || 'other';
      if (!shownTitleWords[lens]) shownTitleWords[lens] = new Set();

      const words = new Set(
        pos.title.toLowerCase().split(/\s+/).filter(w => w.length > 3)
      );
      const existing = shownTitleWords[lens];
      const overlap = [...words].filter(w => existing.has(w)).length;

      if (overlap >= 3) continue;

      deduped.push(pos);
      words.forEach(w => existing.add(w));
    }

    setPositions(deduped);
    setLoading(false);
    } catch (err) {
      console.error('[Feed] loadFeed error:', err);
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadFeed(); const i = setInterval(loadFeed, 30000); return () => clearInterval(i); }, [loadFeed]);

  const handleClick = (positionId: string) => navigate(`/insights/${positionId}`);

  // ─── Derive lens options from positions ──────────────────────────────────
  const lensOptions = Array.from(
    new Set(
      positions
        .map(p => p.decision_threads?.lens)
        .filter((l): l is string => Boolean(l))
    )
  );

  // ─── Filter: urgency + lens ──────────────────────────────────────────────
  const filtered = positions.filter(pos => {
    const rawTone = pos.tone || '';

    // Urgency filter
    const urgencyMatch = (() => {
      if (activeFilter === 'All') return true;
      if (activeFilter === '✦ Suggested') return false;
      if (activeFilter === 'ACT NOW') {
        return rawTone === 'ACT NOW' || rawTone === 'ACT_NOW' || rawTone === 'BREAKING';
      }
      if (activeFilter === 'WATCH') {
        return rawTone === 'WATCH' || rawTone === 'CONSIDER';
      }
      return false;
    })();

    // Lens filter
    const lensMatch = activeLens === null
      ? true
      : pos.decision_threads?.lens === activeLens;

    return urgencyMatch && lensMatch;
  });

  // ─── Re-sort for display ─────────────────────────────────────────────────
  const displayPositions = [...filtered].sort((a, b) => {
    if (sortBy === 'urgent') {
      const urgDiff = urgencyWeight(b.tone) - urgencyWeight(a.tone);
      if (urgDiff !== 0) return urgDiff;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });


  if (loading) {
    return <div style={{ minHeight: '100vh', background: colors.bg.light, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT }}><p style={{ color: colors.text.muted.light, fontSize: 14 }}>Loading…</p></div>;
  }

  return (
    <div style={{ minHeight: '100vh', background: colors.bg.light, fontFamily: FONT }}>

      {/* HEADER */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: colors.bg.light, borderBottom: `1px solid ${colors.border.light}`,
        padding: '0 32px', height: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ ...T.logo, color: colors.text.primary.light }}>AUO</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 13, color: colors.text.muted.light }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
          <button
            onClick={() => setShowNewTopic(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: colors.text.primary.light, color: colors.text.primary.dark, border: 'none',
              borderRadius: 20, padding: '8px 18px',
              ...T.newBtn, cursor: 'pointer', transition: transition.fast,
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#374151')}
            onMouseLeave={e => (e.currentTarget.style.background = colors.text.primary.light)}
          >
            <span style={{ fontSize: 17, lineHeight: 1 }}>+</span> Add topic
          </button>
          <div onClick={() => navigate('/alert-sources')} style={{
            width: 34, height: 34, borderRadius: '50%', background: colors.text.primary.light, color: colors.text.primary.dark,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 700, cursor: 'pointer',
          }}>D</div>
        </div>
      </header>

      {/* BODY */}
      <main style={{ maxWidth: 960, margin: '0 auto', padding: '36px 28px' }}>

        {/* Controls: Row 1 — urgency filter + sort */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 0, gap: 12 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {FILTER_TABS.map(tab => {
              const isActive = activeFilter === tab;
              const isHovered = hoveredPill === `urgency-${tab}`;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveFilter(tab)}
                  onMouseEnter={() => setHoveredPill(`urgency-${tab}`)}
                  onMouseLeave={() => setHoveredPill(null)}
                  style={pillStyle(isActive, isHovered)}
                >
                  {tab}
                </button>
              );
            })}
          </div>
          <select value={sortBy} onChange={e => setSortBy(e.target.value as 'urgent' | 'recent')} style={{
            ...T.filterTab, padding: '6px 28px 6px 12px', borderRadius: 8,
            border: `1.5px solid ${colors.border.medium}`, background: colors.bg.light, color: colors.text.secondary.light,
            cursor: 'pointer', outline: 'none',
            WebkitAppearance: 'none', appearance: 'none' as never,
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M3 5l3 3 3-3' stroke='%239ca3af' fill='none' stroke-width='1.5'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center',
          }}>
            <option value="urgent">Most urgent</option>
            <option value="recent">Most recent</option>
          </select>
        </div>

        {/* Row 2 — Lens filter */}
        {lensOptions.length > 0 && (
          <div style={{
            display: 'flex',
            gap: 8,
            marginTop: 10,
            marginBottom: 24,
            flexWrap: 'wrap',
          }}>
            <button
              onClick={() => setActiveLens(null)}
              onMouseEnter={() => setHoveredPill('lens-all')}
              onMouseLeave={() => setHoveredPill(null)}
              style={pillStyle(activeLens === null, hoveredPill === 'lens-all')}
            >
              All Topics
            </button>
            {lensOptions.map(lens => {
              const isActive = activeLens === lens;
              const pillId = `lens-${lens}`;
              const isHovered = hoveredPill === pillId;
              return (
                <button
                  key={lens}
                  onClick={() => setActiveLens(lens)}
                  onMouseEnter={() => setHoveredPill(pillId)}
                  onMouseLeave={() => setHoveredPill(null)}
                  style={pillStyle(isActive, isHovered)}
                >
                  {formatLens(lens)}
                </button>
              );
            })}
          </div>
        )}

        {/* Add margin when no lens options */}
        {lensOptions.length === 0 && <div style={{ marginBottom: 24 }} />}

        {/* Suggested empty state */}
        {activeFilter === '✦ Suggested' && (
          <div style={{
            textAlign: 'center',
            padding: '60px 24px',
            color: colors.text.muted.light,
            fontSize: 14,
          }}>
            AUO will suggest new topics to monitor here.
          </div>
        )}

        {/* Position cards — single column */}
        {activeFilter !== '✦ Suggested' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing["6"] }}>
            {displayPositions.map(p => (
              <PositionCard key={p.id} pos={p} onClick={handleClick} onLensClick={setActiveLens} />
            ))}
          </div>
        )}

        {/* Empty */}
        {activeFilter !== '✦ Suggested' && displayPositions.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <p style={{ fontSize: 16, fontWeight: 600, color: colors.text.secondary.light, marginBottom: 8 }}>
              {activeFilter === 'All' && activeLens === null
                ? 'AUO is building your first positions.'
                : `No matching insights right now.`}
            </p>
            <p style={{ fontSize: 14, color: colors.text.muted.light }}>
              {activeFilter === 'All' && activeLens === null
                ? 'Check back in a few minutes.'
                : 'Try changing the filters above.'}
            </p>
          </div>
        )}
      </main>

      {showNewTopic && <NewTopicModal onClose={() => setShowNewTopic(false)} />}

      <style>{`
        @keyframes auo-img-zoom {
          0%   { transform: scale(1.0); }
          100% { transform: scale(1.08); }
        }
        @keyframes auo-darken {
          0%   { background: rgba(0,0,0,0); }
          100% { background: rgba(0,0,0,0.7); }
        }
        @keyframes auo-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
        .auo-card-img-hover {
          animation: auo-img-zoom 4s ease-out forwards !important;
        }
        .auo-card-dark-hover {
          animation: auo-darken 4s ease-out forwards !important;
        }
        .auo-pulse-dot {
          animation: auo-pulse 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
