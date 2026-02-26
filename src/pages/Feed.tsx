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

// ─── Urgency config ───────────────────────────────────────────────────────────

const URGENCY_CONFIG: Record<string, {
  order: number; label: string; dot: string;
  overlay: string; textColor: string; size: 'large' | 'medium' | 'small';
}> = {
  BREAKING: {
    order: 0, label: 'BREAKING', dot: '#ef4444',
    overlay: 'rgba(239, 68, 68, 0.45)', textColor: '#fff', size: 'large',
  },
  'ACT NOW': {
    order: 1, label: 'ACT NOW', dot: '#ef4444',
    overlay: 'rgba(239, 68, 68, 0.25)', textColor: '#fff', size: 'large',
  },
  WATCH: {
    order: 2, label: 'WATCH', dot: '#eab308',
    overlay: 'rgba(234, 179, 8, 0.15)', textColor: '#fff', size: 'medium',
  },
  CONSIDER: {
    order: 3, label: 'CONSIDER', dot: 'rgba(255,255,255,0.4)',
    overlay: 'rgba(0,0,0,0.15)', textColor: '#fff', size: 'small',
  },
};

const getUrgencyConfig = (tone: string | null | undefined) =>
  URGENCY_CONFIG[tone ?? ''] ?? URGENCY_CONFIG.CONSIDER;

// ─── Gradient placeholders per lens ───────────────────────────────────────────

const LENS_GRADIENTS: Record<string, string> = {
  textile_innovation: 'linear-gradient(135deg, #c8956c 0%, #8b5e3c 50%, #3d1f0d 100%)',
  supply_chain_resilience: 'linear-gradient(135deg, #1a3a5c 0%, #2d6a8f 50%, #0a1628 100%)',
  sourcing: 'linear-gradient(135deg, #5c4a2a 0%, #8b7355 50%, #2a1f0a 100%)',
  regulatory_compliance: 'linear-gradient(135deg, #2a3a4c 0%, #4a6a8c 50%, #0d1a27 100%)',
  competitive: 'linear-gradient(135deg, #1a1a1a 0%, #4a4a4a 50%, #0a0a0a 100%)',
};

// ─── Thread Card ──────────────────────────────────────────────────────────────

function ThreadCard({
  thread,
  onAccept,
  onReject,
  onOpen,
}: {
  thread: DecisionThread;
  onAccept: (positionId: string, threadId: string) => void;
  onReject: (positionId: string, threadId: string, reason?: string) => void;
  onOpen: (threadId: string) => void;
}) {
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [imageLoaded, setImageLoaded] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [acceptedFlash, setAcceptedFlash] = useState(false);

  const position = thread.latest_position;
  const urgency = getUrgencyConfig(position?.tone);
  const bgGradient = LENS_GRADIENTS[thread.lens] ??
    'linear-gradient(135deg, #2a2a3a 0%, #4a4a6a 50%, #0a0a1a 100%)';

  if (accepted) return null;

  const aspectRatio = urgency.size === 'large' ? '4/3' : urgency.size === 'medium' ? '3/2' : '16/9';

  return (
    <div
      onClick={() => !rejectingId && onOpen(thread.id)}
      style={{
        position: 'relative',
        borderRadius: 16,
        overflow: 'hidden',
        cursor: 'pointer',
        aspectRatio,
        background: bgGradient,
        boxShadow: '0 2px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06)',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease, opacity 0.5s ease',
        opacity: acceptedFlash ? 0 : 1,
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
        (e.currentTarget as HTMLDivElement).style.boxShadow =
          '0 8px 24px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.08)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLDivElement).style.boxShadow =
          '0 2px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06)';
      }}
    >
      {/* Cover image */}
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
            transition: 'opacity 0.8s ease',
          }}
        />
      )}

      {/* Accepted flash overlay */}
      {acceptedFlash && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(255,255,255,0.9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 20,
          transition: 'opacity 0.3s ease',
        }}>
          <span style={{ fontSize: 20, fontWeight: 700, color: '#111' }}>Accepted</span>
        </div>
      )}

      {/* Urgency overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: urgency.overlay,
        transition: 'background 0.3s ease',
      }} />

      {/* Bottom gradient for text legibility */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '65%',
        background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)',
      }} />

      {/* Card content */}
      <div style={{
        position: 'absolute',
        inset: 0,
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}>
        {/* Top: urgency badge + thread name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 8, height: 8,
            borderRadius: '50%',
            background: urgency.dot,
            flexShrink: 0,
            boxShadow: urgency.dot !== 'rgba(255,255,255,0.4)'
              ? `0 0 8px ${urgency.dot}` : 'none',
          }} />
          <span style={{
            fontSize: 11, fontWeight: 700,
            letterSpacing: '0.08em',
            color: urgency.dot, fontFamily: 'monospace',
          }}>
            {urgency.label}
          </span>
          <span style={{
            fontSize: 11,
            color: 'rgba(255,255,255,0.5)',
            fontFamily: 'monospace',
          }}>
            · {thread.title}
          </span>
        </div>

        {/* Bottom: position info + actions */}
        <div onClick={e => e.stopPropagation()}>
          {position && (
            <>
              <p style={{
                fontSize: urgency.size === 'large' ? 18 : 15,
                fontWeight: 700,
                color: '#fff',
                lineHeight: 1.3,
                marginBottom: 6,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}>
                {position.title}
              </p>

              {position.position_essence && (
                <p style={{
                  fontSize: 12,
                  color: '#fb923c',
                  lineHeight: 1.4,
                  marginBottom: 12,
                  display: '-webkit-box',
                  WebkitLineClamp: 1,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}>
                  {position.position_essence}
                </p>
              )}

              {/* Signal dots */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 12 }}>
                {Array.from({ length: Math.min(thread.signal_count, 7) }).map((_, i) => (
                  <div key={i} style={{
                    width: 5, height: 5,
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.5)',
                  }} />
                ))}
                {thread.signal_count > 7 && (
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginLeft: 2 }}>
                    +{thread.signal_count - 7}
                  </span>
                )}
              </div>
            </>
          )}

          {/* Reject textarea */}
          {rejectingId && (
            <div style={{ marginBottom: 10 }}>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Why reject? (helps AUO learn)"
                autoFocus
                style={{
                  width: '100%',
                  background: 'rgba(0,0,0,0.4)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 8,
                  color: '#fff',
                  padding: '8px 10px',
                  fontSize: 12,
                  resize: 'none',
                  height: 52,
                  fontFamily: 'inherit',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                <button
                  onClick={() => {
                    if (position) onReject(position.id, thread.id, rejectReason);
                    setRejectingId(null);
                    setRejectReason('');
                  }}
                  style={{
                    background: 'rgba(255,255,255,0.15)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: 6, color: '#fff',
                    padding: '5px 14px', fontSize: 12,
                    cursor: 'pointer', fontWeight: 600,
                  }}
                >
                  Confirm
                </button>
                <button
                  onClick={() => { setRejectingId(null); setRejectReason(''); }}
                  style={{
                    background: 'none',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 6, color: 'rgba(255,255,255,0.5)',
                    padding: '5px 14px', fontSize: 12, cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Action buttons */}
          {position && !rejectingId && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => {
                  setAcceptedFlash(true);
                  setTimeout(() => setAccepted(true), 600);
                  onAccept(position.id, thread.id);
                }}
                style={{
                  flex: 1,
                  background: 'rgba(255,255,255,0.95)',
                  border: 'none',
                  borderRadius: 8, color: '#111',
                  padding: '8px 0', fontSize: 13,
                  fontWeight: 700, cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
              >
                Accept
              </button>
              <button
                onClick={() => position && setRejectingId(position.id)}
                style={{
                  flex: 1,
                  background: 'rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 8, color: 'rgba(255,255,255,0.7)',
                  padding: '8px 0', fontSize: 13,
                  fontWeight: 600, cursor: 'pointer',
                }}
              >
                Reject
              </button>
            </div>
          )}

          {!position && (
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
              AUO is building positions…
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Feed ────────────────────────────────────────────────────────────────

export default function Feed() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [threads, setThreads] = useState<DecisionThread[]>([]);
  const [loading, setLoading] = useState(true);

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
        const { data: positions } = await supabase
          .from('positions')
          .select('id, title, position_essence, tone')
          .eq('decision_thread_id', thread.id)
          .not('validation_issues->>hidden', 'eq', 'true')
          .order('created_at', { ascending: false })
          .limit(1);

        const { count: signalCount } = await supabase
          .from('decision_signals')
          .select('*', { count: 'exact', head: true })
          .eq('decision_thread_id', thread.id);

        const { count: positionCount } = await supabase
          .from('positions')
          .select('*', { count: 'exact', head: true })
          .eq('decision_thread_id', thread.id)
          .not('validation_issues->>hidden', 'eq', 'true');

        return {
          ...thread,
          latest_position: positions?.[0] ?? null,
          signal_count: signalCount ?? 0,
          position_count: positionCount ?? 0,
        };
      })
    );

    const urgencyOrder: Record<string, number> = {
      BREAKING: 0, 'ACT NOW': 1, WATCH: 2, CONSIDER: 3,
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

  const handleAccept = async (positionId: string, _threadId: string) => {
    await supabase
      .from('positions')
      .update({ validated_at: new Date().toISOString() })
      .eq('id', positionId);

    toast({ description: 'Position accepted' });
    setTimeout(loadFeed, 500);
  };

  const handleReject = async (positionId: string, _threadId: string, reason?: string) => {
    const { data: existing } = await supabase
      .from('positions')
      .select('validation_issues')
      .eq('id', positionId)
      .single();

    const currentIssues = (existing?.validation_issues as Record<string, unknown>)?.issues as unknown[] ?? [];

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
    const tone = t.latest_position?.tone ?? '';
    return tone === 'BREAKING' || tone === 'ACT NOW';
  });
  const watch = threads.filter(t => t.latest_position?.tone === 'WATCH');
  const consider = threads.filter(t => {
    const tone = t.latest_position?.tone ?? '';
    return !['BREAKING', 'ACT NOW', 'WATCH'].includes(tone);
  });

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
      {/* Header */}
      <div style={{
        padding: '20px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        background: '#fff',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <span style={{
          fontSize: 18, fontWeight: 800,
          letterSpacing: '-0.02em', color: '#111',
        }}>
          AUO
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            onClick={() => navigate('/alert-sources')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 13, color: '#9ca3af',
            }}
          >
            Sources
          </button>
          <button
            onClick={() => supabase.auth.signOut()}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 13, color: '#9ca3af',
            }}
          >
            Sign out
          </button>
          <span style={{ fontSize: 13, color: '#9ca3af' }}>
            {new Date().toLocaleDateString('en-US', {
              weekday: 'short', month: 'short', day: 'numeric',
            })}
          </span>
        </div>
      </div>

      {/* Feed */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 24px' }}>

        {/* ACT NOW */}
        {actNow.length > 0 && (
          <section style={{ marginBottom: 40 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: '#ef4444', boxShadow: '0 0 8px #ef4444',
              }} />
              <span style={{
                fontSize: 11, fontWeight: 700,
                letterSpacing: '0.1em', color: '#ef4444', fontFamily: 'monospace',
              }}>
                ACT NOW
              </span>
              <span style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'monospace' }}>
                · {actNow.length}
              </span>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
              gap: 16,
            }}>
              {actNow.map(t => (
                <ThreadCard
                  key={t.id} thread={t}
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
          <section style={{ marginBottom: 40 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%', background: '#eab308',
              }} />
              <span style={{
                fontSize: 11, fontWeight: 700,
                letterSpacing: '0.1em', color: '#eab308', fontFamily: 'monospace',
              }}>
                WATCH
              </span>
              <span style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'monospace' }}>
                · {watch.length}
              </span>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 16,
            }}>
              {watch.map(t => (
                <ThreadCard
                  key={t.id} thread={t}
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
          <section style={{ marginBottom: 40 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%', background: '#d1d5db',
              }} />
              <span style={{
                fontSize: 11, fontWeight: 700,
                letterSpacing: '0.1em', color: '#9ca3af', fontFamily: 'monospace',
              }}>
                CONSIDER
              </span>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 12,
            }}>
              {consider.map(t => (
                <ThreadCard
                  key={t.id} thread={t}
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
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#9ca3af' }}>
            <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
              AUO is building your first positions.
            </p>
            <p style={{ fontSize: 13 }}>Check back in a few minutes.</p>
          </div>
        )}

        {/* RADAR line */}
        <div style={{
          borderTop: '1px solid rgba(0,0,0,0.06)',
          paddingTop: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          flexWrap: 'wrap',
        }}>
          <span style={{
            fontSize: 11, fontWeight: 700,
            letterSpacing: '0.1em', color: '#9ca3af',
            fontFamily: 'monospace', marginRight: 4,
          }}>
            RADAR
          </span>
          {threads.map((t, i) => (
            <span key={t.id} style={{ fontSize: 12, color: '#6b7280' }}>
              {i > 0 && <span style={{ marginRight: 6, color: '#d1d5db' }}>·</span>}
              {t.title.split(/[\s—–-]+/).slice(0, 3).join(' ')}{' '}
              <span style={{ color: '#10b981', fontSize: 11 }}>↑{t.signal_count}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
