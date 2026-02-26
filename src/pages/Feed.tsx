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

// ─── Thread Card ──────────────────────────────────────────────────────────────

function ThreadCard({
  thread,
  onAccept,
  onReject,
  onOpen,
}: {
  thread: DecisionThread;
  onAccept: (positionId: string) => void;
  onReject: (positionId: string, reason?: string) => void;
  onOpen: (threadId: string) => void;
}) {
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [imageLoaded, setImageLoaded] = useState(false);
  const [done, setDone] = useState(false);

  if (done) return null;

  const position = thread.latest_position;
  const tone = position?.tone || 'CONSIDER';

  const URGENCY: Record<string, { label: string; color: string; glow: string }> = {
    BREAKING:  { label: 'BREAKING',  color: '#ef4444', glow: '0 0 8px rgba(239,68,68,0.8)' },
    'ACT NOW': { label: 'ACT NOW',   color: '#ef4444', glow: '0 0 8px rgba(239,68,68,0.8)' },
    ACT_NOW:   { label: 'ACT NOW',   color: '#ef4444', glow: '0 0 8px rgba(239,68,68,0.8)' },
    WATCH:     { label: 'WATCH',     color: '#f59e0b', glow: 'none' },
    CONSIDER:  { label: 'CONSIDER',  color: '#9ca3af', glow: 'none' },
  };
  const urg = URGENCY[tone] || URGENCY.CONSIDER;

  const GRADIENTS: Record<string, string> = {
    textile_innovation:      'linear-gradient(160deg, #b8753a 0%, #5c2e0e 100%)',
    supply_chain_resilience: 'linear-gradient(160deg, #1a3f6e 0%, #071628 100%)',
    sourcing:                'linear-gradient(160deg, #5c4020 0%, #1f1208 100%)',
    regulatory_compliance:   'linear-gradient(160deg, #1e3448 0%, #080f18 100%)',
    competitive:             'linear-gradient(160deg, #2a2a2a 0%, #080808 100%)',
  };
  const bgGradient = GRADIENTS[thread.lens] || GRADIENTS.competitive;

  return (
    <div
      style={{
        position: 'relative',
        borderRadius: 16,
        overflow: 'hidden',
        height: 300,
        background: bgGradient,
        boxShadow: '0 2px 8px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)',
        cursor: 'pointer',
        transition: 'transform 0.18s ease, box-shadow 0.18s ease',
        flexShrink: 0,
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.transform = 'translateY(-3px)';
        el.style.boxShadow = '0 8px 24px rgba(0,0,0,0.13), 0 0 0 1px rgba(0,0,0,0.06)';
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.transform = 'translateY(0)';
        el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)';
      }}
      onClick={() => !rejectingId && onOpen(thread.id)}
    >
      {/* Cover image — full bleed */}
      {thread.cover_image_url && (
        <img
          src={thread.cover_image_url}
          alt=""
          onLoad={() => setImageLoaded(true)}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: imageLoaded ? 1 : 0,
            transition: 'opacity 0.7s ease',
          }}
        />
      )}

      {/* Strong gradient overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: `linear-gradient(
          to top,
          rgba(0,0,0,0.92) 0%,
          rgba(0,0,0,0.72) 35%,
          rgba(0,0,0,0.30) 60%,
          rgba(0,0,0,0.08) 80%,
          transparent 100%
        )`,
      }} />

      {/* Urgency badge — top left, glassmorphism pill */}
      <div style={{
        position: 'absolute',
        top: 14,
        left: 14,
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        borderRadius: 20,
        padding: '4px 10px',
        border: '1px solid rgba(255,255,255,0.08)',
      }}>
        <div style={{
          width: 6, height: 6, borderRadius: '50%',
          background: urg.color,
          boxShadow: urg.glow,
          flexShrink: 0,
        }} />
        <span style={{
          fontSize: 10, fontWeight: 700,
          letterSpacing: '0.08em',
          color: urg.color,
          fontFamily: "'SF Mono', 'Fira Code', monospace",
          lineHeight: 1,
        }}>
          {urg.label}
        </span>
        <span style={{
          fontSize: 10,
          color: 'rgba(255,255,255,0.45)',
          fontFamily: "'SF Mono', 'Fira Code', monospace",
          lineHeight: 1,
        }}>
          · {thread.title}
        </span>
      </div>

      {/* Bottom content — text + actions */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '0 18px 18px',
        }}
        onClick={e => e.stopPropagation()}
      >
        {position ? (
          <>
            <p style={{
              fontSize: 19,
              fontWeight: 700,
              color: '#ffffff',
              lineHeight: 1.3,
              marginBottom: 6,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              letterSpacing: '-0.01em',
              textShadow: '0 1px 6px rgba(0,0,0,0.4)',
            }}>
              {position.title}
            </p>

            {position.position_essence && (
              <p style={{
                fontSize: 12,
                color: '#fb923c',
                lineHeight: 1.4,
                marginBottom: 14,
                display: '-webkit-box',
                WebkitLineClamp: 1,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                textShadow: '0 1px 4px rgba(0,0,0,0.5)',
              }}>
                {position.position_essence}
              </p>
            )}

            {/* Reject reason textarea */}
            {rejectingId && (
              <div style={{ marginBottom: 10 }}>
                <textarea
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="Why reject? (helps AUO learn)"
                  autoFocus
                  style={{
                    width: '100%',
                    background: 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: 8,
                    color: '#fff',
                    padding: '8px 12px',
                    fontSize: 13,
                    resize: 'none',
                    height: 56,
                    fontFamily: 'inherit',
                    outline: 'none',
                    boxSizing: 'border-box',
                    lineHeight: 1.5,
                  }}
                />
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button
                    onClick={() => {
                      onReject(position.id, rejectReason);
                      setDone(true);
                    }}
                    style={{
                      flex: 1,
                      background: 'rgba(255,255,255,0.9)',
                      color: '#111',
                      border: 'none',
                      borderRadius: 8,
                      padding: '8px 0',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => { setRejectingId(null); setRejectReason(''); }}
                    style={{
                      flex: 1,
                      background: 'rgba(255,255,255,0.08)',
                      color: 'rgba(255,255,255,0.6)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: 8,
                      padding: '8px 0',
                      fontSize: 13,
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Accept / Reject */}
            {!rejectingId && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => { onAccept(position.id); setDone(true); }}
                  style={{
                    flex: 1,
                    background: 'rgba(255,255,255,0.95)',
                    color: '#111',
                    border: 'none',
                    borderRadius: 8,
                    padding: '9px 0',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#fff')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.95)')}
                >
                  Accept
                </button>
                <button
                  onClick={() => setRejectingId(position.id)}
                  style={{
                    flex: 1,
                    background: 'rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.7)',
                    border: '1px solid rgba(255,255,255,0.14)',
                    borderRadius: 8,
                    padding: '9px 0',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.14)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                >
                  Reject
                </button>
              </div>
            )}
          </>
        ) : (
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
            AUO is building positions…
          </p>
        )}
      </div>
    </div>
  );
}

// ─── New Decision Modal ───────────────────────────────────────────────────────

function NewDecisionModal({ onClose }: { onClose: () => void }) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ role: 'auo' | 'user'; text: string }[]>([
    { role: 'auo', text: "What's important to you this week?" },
  ]);

  const PILLS = [
    'Tariff impact',
    'New certification',
    'Supplier decision',
    'Innovation watch',
    'Sourcing risk',
  ];

  const handlePill = (pill: string) => {
    setInput(pill);
  };

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages(prev => [...prev, { role: 'user', text: input }]);
    setInput('');
    setTimeout(() => {
      setMessages(prev => [...prev, {
        role: 'auo',
        text: "Got it. I'll start monitoring this and build your first positions. Give me a few minutes.",
      }]);
      setTimeout(onClose, 2000);
    }, 800);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          zIndex: 100,
        }}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'min(600px, 90vw)',
        background: '#fff',
        borderRadius: 20,
        boxShadow: '0 24px 64px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.06)',
        zIndex: 101,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '80vh',
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 20px 14px',
          borderBottom: '1px solid #f0f0f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#111', letterSpacing: '-0.01em' }}>
            New decision
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#9ca3af', fontSize: 18, lineHeight: 1,
              padding: '2px 6px', borderRadius: 6,
            }}
          >
            ×
          </button>
        </div>

        {/* Messages */}
        <div style={{
          padding: '20px 20px 12px',
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}>
          {messages.map((msg, i) => (
            <div key={i} style={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            }}>
              <div style={{
                maxWidth: '80%',
                background: msg.role === 'auo' ? '#f8f9fa' : '#111',
                color: msg.role === 'auo' ? '#111' : '#fff',
                borderRadius: msg.role === 'auo' ? '4px 16px 16px 16px' : '16px 4px 16px 16px',
                padding: '10px 14px',
                fontSize: 14,
                lineHeight: 1.5,
              }}>
                {msg.text}
              </div>
            </div>
          ))}
        </div>

        {/* Pills */}
        <div style={{ padding: '0 20px 12px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {PILLS.map(pill => (
            <button
              key={pill}
              onClick={() => handlePill(pill)}
              style={{
                background: input === pill ? '#111' : '#f3f4f6',
                color: input === pill ? '#fff' : '#374151',
                border: 'none',
                borderRadius: 20,
                padding: '6px 14px',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {pill}
            </button>
          ))}
        </div>

        {/* Input */}
        <div style={{ padding: '0 20px 20px', display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Or describe what you want to track..."
            style={{
              flex: 1,
              border: '1px solid #e5e7eb',
              borderRadius: 12,
              padding: '10px 14px',
              fontSize: 14,
              resize: 'none',
              height: 44,
              fontFamily: 'inherit',
              outline: 'none',
              color: '#111',
              lineHeight: 1.5,
              transition: 'border-color 0.15s',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = '#111')}
            onBlur={e => (e.currentTarget.style.borderColor = '#e5e7eb')}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            style={{
              background: input.trim() ? '#111' : '#e5e7eb',
              color: input.trim() ? '#fff' : '#9ca3af',
              border: 'none',
              borderRadius: 10,
              width: 44,
              height: 44,
              fontSize: 18,
              cursor: input.trim() ? 'pointer' : 'default',
              flexShrink: 0,
              transition: 'all 0.15s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            →
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Main Feed ────────────────────────────────────────────────────────────────

export default function Feed() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [threads, setThreads] = useState<DecisionThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewDecision, setShowNewDecision] = useState(false);

  const loadFeed = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: threadData } = await supabase
      .from('decision_threads')
      .select('id, title, lens, key_question, cover_image_url, updated_at, level')
      .eq('user_id', user.id)
      .not('level', 'in', '("decided","archived")')
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
        const latestPosition = visiblePositions[0] || null;

        const { count: signalCount } = await supabase
          .from('decision_signals')
          .select('*', { count: 'exact', head: true })
          .eq('decision_thread_id', thread.id);

        return {
          ...thread,
          latest_position: latestPosition ? {
            id: latestPosition.id,
            title: latestPosition.title,
            position_essence: latestPosition.position_essence,
            tone: latestPosition.tone,
          } : null,
          signal_count: signalCount ?? 0,
          position_count: visiblePositions.length,
        };
      })
    );

    const urgencyOrder: Record<string, number> = {
      BREAKING: 0, 'ACT NOW': 1, ACT_NOW: 1, WATCH: 2, CONSIDER: 3,
    };
    enriched.sort((a, b) => {
      const aOrder = urgencyOrder[a.latest_position?.tone ?? 'CONSIDER'] ?? 4;
      const bOrder = urgencyOrder[b.latest_position?.tone ?? 'CONSIDER'] ?? 4;
      return aOrder - bOrder;
    });

    setThreads(enriched);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadFeed();
    const interval = setInterval(loadFeed, 30000);
    return () => clearInterval(interval);
  }, [loadFeed]);

  const handleAccept = async (positionId: string) => {
    await supabase
      .from('positions')
      .update({ validated_at: new Date().toISOString() })
      .eq('id', positionId);

    toast({ description: 'Position accepted' });
    setTimeout(loadFeed, 500);
  };

  const handleReject = async (positionId: string, reason?: string) => {
    const { data: existing } = await supabase
      .from('positions')
      .select('validation_issues')
      .eq('id', positionId)
      .single();

    const currentIssues =
      (existing?.validation_issues as Record<string, unknown>)?.issues as unknown[] ?? [];

    await supabase
      .from('positions')
      .update({
        validation_issues: {
          hidden: true,
          issues: [
            ...currentIssues,
            {
              type: 'user_rejected',
              reason: reason || 'No reason provided',
              rejected_at: new Date().toISOString(),
            },
          ],
        },
      })
      .eq('id', positionId);

    toast({ description: 'Position rejected — AUO will learn from this' });
    setTimeout(loadFeed, 500);
  };

  const handleOpen = (threadId: string) => {
    navigate(`/workspace/${threadId}`);
  };

  const actNow = threads.filter(t => {
    const tone = t.latest_position?.tone || '';
    return ['BREAKING', 'ACT_NOW', 'ACT NOW'].includes(tone);
  });
  const watch = threads.filter(t => t.latest_position?.tone === 'WATCH');
  const consider = threads.filter(t =>
    !['BREAKING', 'ACT_NOW', 'ACT NOW', 'WATCH'].includes(t.latest_position?.tone || '')
  );

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#f8f9fa',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <p style={{ color: '#9ca3af', fontSize: 14 }}>Loading…</p>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f8f9fa',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>

      {/* HEADER */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: '#fff',
        borderBottom: '1px solid #f0f0f0',
        padding: '0 32px',
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{
          fontSize: 18, fontWeight: 800,
          letterSpacing: '-0.03em', color: '#111',
        }}>
          AUO
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 13, color: '#9ca3af' }}>
            {new Date().toLocaleDateString('en-US', {
              weekday: 'short', month: 'short', day: 'numeric',
            })}
          </span>
          <div
            onClick={() => navigate('/alert-sources')}
            style={{
              width: 32, height: 32,
              borderRadius: '50%',
              background: '#111',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            D
          </div>
        </div>
      </header>

      {/* BODY */}
      <main style={{ maxWidth: 960, margin: '0 auto', padding: '32px 24px' }}>

        {/* Section header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 28,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#111' }}>
              Your decisions
            </span>
            <span style={{ fontSize: 14, color: '#9ca3af' }}>
              · {threads.length} active
            </span>
          </div>
          <button
            onClick={() => setShowNewDecision(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'none',
              border: '1.5px solid #e5e7eb',
              borderRadius: 20,
              padding: '7px 16px',
              fontSize: 13,
              fontWeight: 600,
              color: '#374151',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = '#111';
              e.currentTarget.style.color = '#111';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = '#e5e7eb';
              e.currentTarget.style.color = '#374151';
            }}
          >
            <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
            New decision
          </button>
        </div>

        {/* ACT NOW */}
        {actNow.length > 0 && (
          <section style={{ marginBottom: 36 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
              <div style={{
                width: 7, height: 7, borderRadius: '50%',
                background: '#ef4444',
                boxShadow: '0 0 6px rgba(239,68,68,0.7)',
              }} />
              <span style={{
                fontSize: 11, fontWeight: 700, letterSpacing: '0.09em',
                color: '#ef4444',
                fontFamily: "'SF Mono', monospace",
              }}>
                ACT NOW
              </span>
              <span style={{
                fontSize: 11, color: '#9ca3af',
                fontFamily: "'SF Mono', monospace",
              }}>
                · {actNow.length}
              </span>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 18,
            }}>
              {actNow.map(t => (
                <ThreadCard key={t.id} thread={t}
                  onAccept={handleAccept}
                  onReject={handleReject}
                  onOpen={handleOpen}
                />
              ))}
            </div>
          </section>
        )}

        {/* WATCH */}
        {watch.length > 0 && (
          <section style={{ marginBottom: 36 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
              <div style={{
                width: 7, height: 7, borderRadius: '50%', background: '#f59e0b',
              }} />
              <span style={{
                fontSize: 11, fontWeight: 700, letterSpacing: '0.09em',
                color: '#f59e0b',
                fontFamily: "'SF Mono', monospace",
              }}>
                WATCH
              </span>
              <span style={{
                fontSize: 11, color: '#9ca3af',
                fontFamily: "'SF Mono', monospace",
              }}>
                · {watch.length}
              </span>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 18,
            }}>
              {watch.map(t => (
                <ThreadCard key={t.id} thread={t}
                  onAccept={handleAccept}
                  onReject={handleReject}
                  onOpen={handleOpen}
                />
              ))}
            </div>
          </section>
        )}

        {/* CONSIDER */}
        {consider.length > 0 && (
          <section style={{ marginBottom: 36 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
              <div style={{
                width: 7, height: 7, borderRadius: '50%', background: '#d1d5db',
              }} />
              <span style={{
                fontSize: 11, fontWeight: 700, letterSpacing: '0.09em',
                color: '#9ca3af',
                fontFamily: "'SF Mono', monospace",
              }}>
                CONSIDER
              </span>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 18,
            }}>
              {consider.map(t => (
                <ThreadCard key={t.id} thread={t}
                  onAccept={handleAccept}
                  onReject={handleReject}
                  onOpen={handleOpen}
                />
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {threads.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <p style={{ fontSize: 16, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
              AUO is building your first positions.
            </p>
            <p style={{ fontSize: 14, color: '#9ca3af' }}>
              Check back in a few minutes.
            </p>
          </div>
        )}

        {/* RADAR */}
        {threads.length > 0 && (
          <div style={{
            borderTop: '1px solid #e9ecef',
            paddingTop: 20,
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 6,
          }}>
            <span style={{
              fontSize: 10, fontWeight: 700,
              letterSpacing: '0.1em', color: '#9ca3af',
              fontFamily: "'SF Mono', monospace",
              marginRight: 6,
            }}>
              RADAR
            </span>
            {[
              { topic: 'foam innovation', count: 3 },
              { topic: 'PFAS', count: 2 },
              { topic: 'tariffs', count: 1 },
            ].map((item, i) => (
              <span key={i} style={{
                fontSize: 13, color: '#4b5563',
                display: 'flex', alignItems: 'center', gap: 3,
              }}>
                {i > 0 && <span style={{ color: '#d1d5db', marginRight: 3 }}>·</span>}
                {item.topic}
                <span style={{ color: '#10b981', fontSize: 12 }}>↑{item.count}</span>
              </span>
            ))}
          </div>
        )}
      </main>

      {/* NEW DECISION MODAL */}
      {showNewDecision && (
        <NewDecisionModal onClose={() => setShowNewDecision(false)} />
      )}
    </div>
  );
}
