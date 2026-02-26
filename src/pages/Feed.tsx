import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DecisionThread {
  id: string;
  title: string;
  lens: string;
  key_question: string;
  cover_image_url: string | null;
  updated_at: string;
  latest_position?: {
    id: string;
    title: string;
    position_essence: string | null;
    tone: string | null;
  } | null;
  position_count: number;
  signal_count: number;
}

// ─── Typography ───────────────────────────────────────────────────────────────

const T = {
  logo:        { fontSize: 24, fontWeight: 900, letterSpacing: '-0.03em' },
  pageTitle:   { fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' },
  pageMeta:    { fontSize: 14, fontWeight: 400 },
  newBtn:      { fontSize: 14, fontWeight: 600 },
  filterTab:   { fontSize: 13, fontWeight: 500 },
  cardTitle:   { fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.3 },
  cardThread:  { fontSize: 12, fontWeight: 500 },
  cardUrgency: { fontSize: 10, fontWeight: 700, letterSpacing: '0.08em' },
  cardReason:  { fontSize: 12, fontWeight: 500 },
  cardNbRel:   { fontSize: 12, fontWeight: 400, lineHeight: 1.4 },
  cardBtn:     { fontSize: 13, fontWeight: 600 },
  radarLabel:  { fontSize: 10, fontWeight: 700, letterSpacing: '0.1em' },
  radarTopic:  { fontSize: 13, fontWeight: 400 },
  sectionHdr:  { fontSize: 11, fontWeight: 700, letterSpacing: '0.09em' },
} as const;

// ─── Urgency config ───────────────────────────────────────────────────────────

const URGENCY = {
  BREAKING: {
    label: 'BREAKING', color: '#ef4444',
    glow: '0 0 10px rgba(239,68,68,0.9)',
    gradient: 'linear-gradient(to right, transparent 0%, transparent 25%, rgba(180,0,0,0.5) 55%, rgba(120,0,0,0.97) 100%)',
  },
  ACT_NOW: {
    label: 'ACT NOW', color: '#ef4444',
    glow: '0 0 8px rgba(239,68,68,0.8)',
    gradient: 'linear-gradient(to right, transparent 0%, transparent 30%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.82) 68%, rgba(0,0,0,0.96) 100%)',
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
  CONSIDER: {
    label: 'CONSIDER', color: '#9ca3af',
    glow: 'none',
    gradient: 'linear-gradient(to right, transparent 0%, transparent 30%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.75) 68%, rgba(0,0,0,0.92) 100%)',
  },
} as const;

const getUrgency = (tone: string) =>
  URGENCY[tone as keyof typeof URGENCY] || URGENCY.CONSIDER;

const LENS_GRADIENTS: Record<string, string> = {
  textile_innovation:      'linear-gradient(135deg, #b8753a 0%, #5c2e0e 100%)',
  supply_chain_resilience: 'linear-gradient(135deg, #1a3f6e 0%, #071628 100%)',
  sourcing:                'linear-gradient(135deg, #5c4020 0%, #1f1208 100%)',
  regulatory_compliance:   'linear-gradient(135deg, #1e3448 0%, #080f18 100%)',
  competitive:             'linear-gradient(135deg, #2a2a2a 0%, #080808 100%)',
};

// ─── Urgency reason helper ────────────────────────────────────────────────────

function getUrgencyReason(tone: string, position: DecisionThread['latest_position'], thread: DecisionThread): string | null {
  const normalized = tone === 'ACT_NOW' ? 'ACT NOW' : tone;
  if (normalized === 'ACT NOW' || normalized === 'BREAKING') {
    const essence = position?.position_essence || '';
    const firstSentence = essence.split(/[.·]/)[0].trim();
    return firstSentence || null;
  }
  if (normalized === 'WATCH') {
    const count = thread.signal_count || 0;
    return count > 0 ? `↑${Math.min(count, 9)} signals this week` : null;
  }
  return null;
}

// ─── Shared card props ────────────────────────────────────────────────────────

interface CardProps {
  thread: DecisionThread;
  onAccept: (positionId: string, threadId: string) => void;
  onReject: (positionId: string, threadId: string, reason?: string) => void;
  onOpen: (threadId: string) => void;
}

// ─── ThreadCard — L→R gradient, image left, text right ───────────────────────

function ThreadCard({ thread, onAccept, onReject, onOpen }: CardProps) {
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [imageLoaded, setImageLoaded] = useState(false);
  const [done, setDone] = useState(false);
  const [accepting, setAccepting] = useState(false);

  if (done) return null;

  const position = thread.latest_position;
  const tone = position?.tone || 'CONSIDER';
  const urg = getUrgency(tone);
  const urgencyReason = getUrgencyReason(tone, position, thread);

  const essenceShort = (() => {
    const text = position?.position_essence || '';
    return text.length > 80 ? text.slice(0, 80).trim() + '…' : text;
  })();

  const leftBorderWidth = (tone === 'BREAKING') ? 5
    : (tone === 'ACT_NOW' || tone === 'ACT NOW') ? 4
    : tone === 'WATCH' ? 3
    : 0;

  const leftBorderColor = (tone === 'ACT_NOW' || tone === 'ACT NOW' || tone === 'BREAKING')
    ? '#ef4444'
    : tone === 'WATCH' ? '#f59e0b' : 'transparent';

  const leftBorderShadow = (tone === 'ACT_NOW' || tone === 'ACT NOW' || tone === 'BREAKING')
    ? '2px 0 12px rgba(239,68,68,0.5)'
    : tone === 'WATCH' ? '2px 0 8px rgba(245,158,11,0.4)' : 'none';

  return (
    <div
      onClick={() => !rejectingId && onOpen(thread.id)}
      style={{
        position: 'relative',
        borderRadius: 16,
        overflow: 'hidden',
        height: 220,
        background: LENS_GRADIENTS[thread.lens] || LENS_GRADIENTS.competitive,
        boxShadow: '0 2px 12px rgba(0,0,0,0.09), 0 0 0 1px rgba(0,0,0,0.05)',
        cursor: 'pointer',
        transition: 'transform 0.18s ease, box-shadow 0.18s ease',
        flexShrink: 0,
        opacity: tone === 'CONSIDER' ? 0.88 : 1,
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.transform = 'translateY(-2px)';
        el.style.boxShadow = '0 8px 28px rgba(0,0,0,0.14), 0 0 0 1px rgba(0,0,0,0.07)';
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.transform = 'translateY(0)';
        el.style.boxShadow = '0 2px 12px rgba(0,0,0,0.09), 0 0 0 1px rgba(0,0,0,0.05)';
      }}
    >
      {/* Cover image */}
      {thread.cover_image_url && (
        <img
          src={thread.cover_image_url} alt=""
          onLoad={() => setImageLoaded(true)}
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%', objectFit: 'cover',
            opacity: imageLoaded ? 1 : 0,
            transition: 'opacity 0.7s ease',
          }}
        />
      )}

      {/* L→R gradient overlay */}
      <div style={{ position: 'absolute', inset: 0, background: urg.gradient }} />

      {/* Left urgency border */}
      {leftBorderWidth > 0 && (
        <div style={{
          position: 'absolute', top: 0, left: 0, bottom: 0,
          width: leftBorderWidth,
          background: leftBorderColor,
          boxShadow: leftBorderShadow,
          zIndex: 3,
          borderRadius: '16px 0 0 16px',
        }} />
      )}

      {/* Text content — right 55% */}
      <div
        style={{
          position: 'absolute', top: 0, right: 0, bottom: 0,
          width: '55%',
          padding: '18px 20px 20px',
          display: 'flex', flexDirection: 'column',
          justifyContent: 'space-between',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Top: badge + thread */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
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
          <span style={{
            ...T.cardThread, color: 'rgba(255,255,255,0.6)',
            overflow: 'hidden', whiteSpace: 'nowrap',
            textOverflow: 'ellipsis', maxWidth: 160,
          }}>
            {thread.title}
          </span>
        </div>

        {/* Middle: title + reason */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 5, paddingBottom: 10 }}>
          {position ? (
            <>
              <p style={{
                ...T.cardTitle, color: '#ffffff', margin: 0,
                textShadow: '0 1px 8px rgba(0,0,0,0.4)',
              }}>
                {position.title}
              </p>
              {urgencyReason && (
                <p style={{
                  ...T.cardReason, margin: 0,
                  color: tone === 'WATCH' ? '#fcd34d' : '#fb923c',
                }}>
                  {urgencyReason}
                </p>
              )}
              {essenceShort && !urgencyReason && (
                <p style={{
                  ...T.cardNbRel, color: 'rgba(255,255,255,0.6)', margin: 0,
                  display: '-webkit-box',
                  WebkitLineClamp: 1,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}>
                  {essenceShort}
                </p>
              )}
            </>
          ) : (
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: 0 }}>
              AUO is building positions…
            </p>
          )}
        </div>

        {/* Bottom: actions */}
        {position && (
          <div onClick={e => e.stopPropagation()}>
            {rejectingId ? (
              <div>
                <textarea
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="Why reject? (helps AUO learn)"
                  autoFocus
                  style={{
                    width: '100%', background: 'rgba(0,0,0,0.5)',
                    backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: 8, color: '#fff', padding: '7px 10px',
                    fontSize: 12, resize: 'none', height: 48,
                    fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
                  }}
                />
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  <button
                    onClick={() => { onReject(position.id, thread.id, rejectReason); setDone(true); }}
                    style={{
                      flex: 1, background: 'rgba(255,255,255,0.9)',
                      color: '#111', border: 'none', borderRadius: 7,
                      padding: '6px 0', ...T.cardBtn, cursor: 'pointer',
                    }}
                  >Confirm</button>
                  <button
                    onClick={() => { setRejectingId(null); setRejectReason(''); }}
                    style={{
                      flex: 1, background: 'none',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: 7, padding: '6px 0',
                      fontSize: 12, color: 'rgba(255,255,255,0.6)', cursor: 'pointer',
                    }}
                  >Cancel</button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                {accepting ? (
                  <div style={{
                    flex: 1, background: 'rgba(255,255,255,0.92)', borderRadius: 8,
                    padding: '8px 0', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', gap: 6, ...T.cardBtn, color: '#111',
                  }}>
                    <span>✓</span> Accepted
                  </div>
                ) : (
                  <button
                    onClick={async () => { setAccepting(true); await new Promise(r => setTimeout(r, 350)); onAccept(position.id, thread.id); }}
                    style={{
                      flex: 1, background: 'rgba(255,255,255,0.15)',
                      border: '1px solid rgba(255,255,255,0.35)',
                      color: '#fff', borderRadius: 8, padding: '8px 0',
                      ...T.cardBtn, cursor: 'pointer', transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.25)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
                  >Accept</button>
                )}
                {!accepting && (
                  <button
                    onClick={() => setRejectingId(position.id)}
                    style={{
                      flex: 1, background: 'transparent',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: 8, padding: '8px 0',
                      ...T.cardBtn, color: 'rgba(255,255,255,0.5)',
                      cursor: 'pointer', transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >Reject</button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Breaking Card — full width, red glow, pulse dot ─────────────────────────

function BreakingCard({ thread, onOpen }: { thread: DecisionThread; onOpen: (id: string) => void }) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const position = thread.latest_position;

  return (
    <div
      onClick={() => onOpen(thread.id)}
      style={{
        position: 'relative', borderRadius: 16, overflow: 'hidden',
        height: 260,
        background: LENS_GRADIENTS[thread.lens] || LENS_GRADIENTS.competitive,
        boxShadow: '0 4px 24px rgba(239,68,68,0.25), 0 0 0 1.5px rgba(239,68,68,0.4)',
        cursor: 'pointer', marginBottom: 28,
        transition: 'transform 0.18s ease',
      }}
      onMouseEnter={e => ((e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)')}
      onMouseLeave={e => ((e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)')}
    >
      {thread.cover_image_url && (
        <img src={thread.cover_image_url} alt="" onLoad={() => setImageLoaded(true)}
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover', opacity: imageLoaded ? 1 : 0, transition: 'opacity 0.7s ease',
          }}
        />
      )}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to right, transparent 0%, transparent 25%, rgba(180,0,0,0.45) 50%, rgba(100,0,0,0.95) 100%)',
      }} />

      <div style={{
        position: 'absolute', top: 0, right: 0, bottom: 0, width: '55%',
        padding: '20px 22px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="auo-pulse-dot" style={{
            width: 8, height: 8, borderRadius: '50%',
            background: '#ef4444', boxShadow: '0 0 0 3px rgba(239,68,68,0.3)',
          }} />
          <span style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
            color: '#ef4444', fontFamily: 'monospace',
          }}>BREAKING</span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>· just now</span>
        </div>
        <div>
          <p style={{
            fontSize: 24, fontWeight: 800, color: '#fff', lineHeight: 1.25,
            letterSpacing: '-0.02em', marginBottom: 10,
            textShadow: '0 1px 8px rgba(0,0,0,0.5)',
          }}>
            {position?.title || thread.title}
          </p>
          {position?.position_essence && (
            <p style={{
              fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.4, marginBottom: 16,
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>
              {position.position_essence}
            </p>
          )}
          <button
            onClick={e => { e.stopPropagation(); onOpen(thread.id); }}
            style={{
              background: '#ef4444', color: '#fff', border: 'none',
              borderRadius: 8, padding: '9px 20px',
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
            }}
          >
            See impact →
          </button>
        </div>
      </div>

      <style>{`
        @keyframes auo-pulse {
          0%, 100% { box-shadow: 0 0 0 3px rgba(239,68,68,0.3); }
          50% { box-shadow: 0 0 0 6px rgba(239,68,68,0.1); }
        }
        .auo-pulse-dot { animation: auo-pulse 1.5s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

// ─── New Decision Modal ───────────────────────────────────────────────────────

function NewDecisionModal({ onClose }: { onClose: () => void }) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ role: 'auo' | 'user'; text: string }[]>([
    { role: 'auo', text: "What's important to you this week?" },
  ]);
  const PILLS = ['Tariff impact', 'New certification', 'Supplier decision', 'Innovation watch', 'Sourcing risk'];
  const handleSend = () => {
    if (!input.trim()) return;
    setMessages(prev => [...prev, { role: 'user', text: input }]);
    setInput('');
    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'auo', text: "Got it. I'll start monitoring this and build your first positions. Give me a few minutes." }]);
      setTimeout(onClose, 2000);
    }, 800);
  };
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', zIndex: 100 }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 'min(600px, 90vw)', background: '#fff', borderRadius: 20, boxShadow: '0 24px 64px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.06)', zIndex: 101, overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '80vh' }}>
        <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#111' }}>New decision</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 18, padding: '2px 6px', borderRadius: 6 }}>×</button>
        </div>
        <div style={{ padding: '20px 20px 12px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{ maxWidth: '80%', background: msg.role === 'auo' ? '#f8f9fa' : '#111', color: msg.role === 'auo' ? '#111' : '#fff', borderRadius: msg.role === 'auo' ? '4px 16px 16px 16px' : '16px 4px 16px 16px', padding: '10px 14px', fontSize: 14, lineHeight: 1.5 }}>{msg.text}</div>
            </div>
          ))}
        </div>
        <div style={{ padding: '0 20px 12px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {PILLS.map(pill => (
            <button key={pill} onClick={() => setInput(pill)} style={{ background: input === pill ? '#111' : '#f3f4f6', color: input === pill ? '#fff' : '#374151', border: 'none', borderRadius: 20, padding: '6px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s' }}>{pill}</button>
          ))}
        </div>
        <div style={{ padding: '0 20px 20px', display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} placeholder="Or describe what you want to track..." style={{ flex: 1, border: '1px solid #e5e7eb', borderRadius: 12, padding: '10px 14px', fontSize: 14, resize: 'none', height: 44, fontFamily: 'inherit', outline: 'none', color: '#111', lineHeight: 1.5, transition: 'border-color 0.15s' }} onFocus={e => (e.currentTarget.style.borderColor = '#111')} onBlur={e => (e.currentTarget.style.borderColor = '#e5e7eb')} />
          <button onClick={handleSend} disabled={!input.trim()} style={{ background: input.trim() ? '#111' : '#e5e7eb', color: input.trim() ? '#fff' : '#9ca3af', border: 'none', borderRadius: 10, width: 44, height: 44, fontSize: 18, cursor: input.trim() ? 'pointer' : 'default', flexShrink: 0, transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>→</button>
        </div>
      </div>
    </>
  );
}

// ─── Main Feed ────────────────────────────────────────────────────────────────

const FONT = "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif";
const FILTER_TABS = ['all', 'ACT NOW', 'WATCH', 'CONSIDER'] as const;
type FilterTab = typeof FILTER_TABS[number];

export default function Feed() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [threads, setThreads] = useState<DecisionThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewDecision, setShowNewDecision] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [sortBy, setSortBy] = useState<'urgent' | 'recent'>('urgent');

  const loadFeed = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: threadData } = await supabase
      .from('decision_threads')
      .select('id, title, lens, key_question, cover_image_url, updated_at, level, status')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('updated_at', { ascending: false });
    if (!threadData) { setLoading(false); return; }

    const enriched = await Promise.all(
      threadData.map(async (thread) => {
        const { data: allPositions } = await supabase
          .from('positions')
          .select('id, title, position_essence, tone, validation_issues')
          .eq('decision_thread_id', thread.id)
          .order('created_at', { ascending: false })
          .limit(10);
        const visiblePositions = (allPositions || []).filter(p => {
          const vi = p.validation_issues as Record<string, unknown> | null;
          return !vi?.hidden;
        });
        const { count: signalCount } = await supabase
          .from('decision_signals')
          .select('*', { count: 'exact', head: true })
          .eq('decision_thread_id', thread.id);
        return {
          ...thread,
          latest_position: visiblePositions[0] ? {
            id: visiblePositions[0].id, title: visiblePositions[0].title,
            position_essence: visiblePositions[0].position_essence,
            tone: visiblePositions[0].tone,
          } : null,
          signal_count: signalCount ?? 0,
          position_count: visiblePositions.length,
        };
      })
    );
    setThreads(enriched);
    setLoading(false);
  }, []);

  useEffect(() => { loadFeed(); const i = setInterval(loadFeed, 30000); return () => clearInterval(i); }, [loadFeed]);

  const handleAccept = async (positionId: string, threadId: string) => {
    await supabase.from('positions').update({
      status: 'accepted',
      accepted_at: new Date().toISOString(),
      validated_at: new Date().toISOString(),
    }).eq('id', positionId);
    navigate(`/workspace/${threadId}`);
  };
  const handleReject = async (positionId: string, threadId: string, reason?: string) => {
    const { data: existing } = await supabase.from('positions').select('validation_issues').eq('id', positionId).single();
    const currentIssues = (existing?.validation_issues as Record<string, unknown>)?.issues as unknown[] ?? [];
    await supabase.from('positions').update({
      status: 'rejected',
      rejected_at: new Date().toISOString(),
      rejected_reason: reason || null,
      validation_issues: { hidden: true, issues: [...currentIssues, { type: 'user_rejected', reason: reason || 'No reason provided', rejected_at: new Date().toISOString() }] },
    }).eq('id', positionId);
    toast({ description: 'Position rejected — AUO will learn from this' });
    setTimeout(loadFeed, 400);
  };
  const handleOpen = (threadId: string) => navigate(`/workspace/${threadId}`);

  const filteredThreads = threads.filter(t => {
    if (activeFilter === 'all') return true;
    const tone = t.latest_position?.tone || 'CONSIDER';
    if (activeFilter === 'ACT NOW') return ['ACT_NOW', 'ACT NOW', 'BREAKING'].includes(tone);
    return tone === activeFilter;
  });

  const urgencyOrder: Record<string, number> = { BREAKING: 0, ACT_NOW: 1, 'ACT NOW': 1, WATCH: 2, CONSIDER: 3 };
  const sortedThreads = [...filteredThreads].sort((a, b) => {
    if (sortBy === 'urgent') return (urgencyOrder[a.latest_position?.tone ?? 'CONSIDER'] ?? 4) - (urgencyOrder[b.latest_position?.tone ?? 'CONSIDER'] ?? 4);
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });

  const breaking = sortedThreads.filter(t => t.latest_position?.tone === 'BREAKING');
  const nonBreaking = sortedThreads.filter(t => t.latest_position?.tone !== 'BREAKING');

  if (loading) {
    return <div style={{ minHeight: '100vh', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT }}><p style={{ color: '#9ca3af', fontSize: 14 }}>Loading…</p></div>;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', fontFamily: FONT }}>

      {/* HEADER */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: '#fff', borderBottom: '1px solid #f0f0f0',
        padding: '0 32px', height: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ ...T.logo, color: '#111' }}>AUO</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 13, color: '#9ca3af' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
          <div onClick={() => navigate('/alert-sources')} style={{
            width: 34, height: 34, borderRadius: '50%', background: '#111', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 700, cursor: 'pointer',
          }}>D</div>
        </div>
      </header>

      {/* BODY */}
      <main style={{ maxWidth: 960, margin: '0 auto', padding: '36px 28px' }}>

        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ ...T.pageTitle, color: '#111' }}>Your decisions</span>
            <span style={{ ...T.pageMeta, color: '#9ca3af' }}>· {threads.length} active</span>
          </div>
          <button
            onClick={() => setShowNewDecision(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: '#111', color: '#fff', border: 'none',
              borderRadius: 20, padding: '8px 18px',
              ...T.newBtn, cursor: 'pointer', transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#374151')}
            onMouseLeave={e => (e.currentTarget.style.background = '#111')}
          >
            <span style={{ fontSize: 17, lineHeight: 1 }}>+</span> New decision
          </button>
        </div>

        {/* Controls: filter + sort */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, gap: 12 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {FILTER_TABS.map(tab => (
              <button key={tab} onClick={() => setActiveFilter(tab)} style={{
                ...T.filterTab, padding: '6px 14px', borderRadius: 20,
                border: activeFilter === tab ? '1.5px solid #111' : '1.5px solid #e5e7eb',
                background: activeFilter === tab ? '#111' : 'none',
                color: activeFilter === tab ? '#fff' : '#6b7280',
                cursor: 'pointer', transition: 'all 0.15s',
                textTransform: tab === 'all' ? 'capitalize' : 'none',
              }}>
                {tab === 'all' ? 'All' : tab}
              </button>
            ))}
          </div>
          <select value={sortBy} onChange={e => setSortBy(e.target.value as 'urgent' | 'recent')} style={{
            ...T.filterTab, padding: '6px 28px 6px 12px', borderRadius: 8,
            border: '1.5px solid #e5e7eb', background: '#fff', color: '#374151',
            cursor: 'pointer', outline: 'none',
            WebkitAppearance: 'none', appearance: 'none' as never,
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M3 5l3 3 3-3' stroke='%239ca3af' fill='none' stroke-width='1.5'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center',
          }}>
            <option value="urgent">Most urgent</option>
            <option value="recent">Most recent</option>
          </select>
        </div>

        {/* BREAKING cards — full width */}
        {breaking.map(t => <BreakingCard key={t.id} thread={t} onOpen={handleOpen} />)}

        {/* Regular cards — single column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {nonBreaking.map(t => (
            <ThreadCard key={t.id} thread={t} onAccept={handleAccept} onReject={handleReject} onOpen={handleOpen} />
          ))}
        </div>

        {/* Empty */}
        {sortedThreads.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <p style={{ fontSize: 16, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
              {activeFilter === 'all' ? 'AUO is building your first positions.' : `No ${activeFilter} decisions right now.`}
            </p>
            <p style={{ fontSize: 14, color: '#9ca3af' }}>
              {activeFilter === 'all' ? 'Check back in a few minutes.' : 'Switch to All to see everything.'}
            </p>
          </div>
        )}

        {/* RADAR */}
        {threads.length > 0 && (
          <div style={{ borderTop: '1px solid #e9ecef', paddingTop: 20, marginTop: 8, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
            <span style={{ ...T.radarLabel, color: '#9ca3af', fontFamily: "'SF Mono', monospace", marginRight: 6 }}>RADAR</span>
            {[{ topic: 'foam innovation', count: 3 }, { topic: 'PFAS', count: 2 }, { topic: 'tariffs', count: 1 }].map((item, i) => (
              <span key={i} style={{ ...T.radarTopic, color: '#4b5563', display: 'flex', alignItems: 'center', gap: 3 }}>
                {i > 0 && <span style={{ color: '#d1d5db', marginRight: 3 }}>·</span>}
                {item.topic}<span style={{ color: '#10b981', fontSize: 12 }}>↑{item.count}</span>
              </span>
            ))}
          </div>
        )}
      </main>

      {showNewDecision && <NewDecisionModal onClose={() => setShowNewDecision(false)} />}
    </div>
  );
}
