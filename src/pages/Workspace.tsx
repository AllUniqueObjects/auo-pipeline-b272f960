import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const FONT = "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif";

const LENS_GRADIENTS: Record<string, string> = {
  textile_innovation:      'linear-gradient(135deg, #b8753a 0%, #5c2e0e 100%)',
  supply_chain_resilience: 'linear-gradient(135deg, #1a3f6e 0%, #071628 100%)',
  sourcing:                'linear-gradient(135deg, #5c4020 0%, #1f1208 100%)',
  regulatory_compliance:   'linear-gradient(135deg, #1e3448 0%, #080f18 100%)',
  competitive:             'linear-gradient(135deg, #2a2a2a 0%, #080808 100%)',
};

interface Thread {
  id: string;
  title: string;
  lens: string;
  key_question: string;
  cover_image_url: string | null;
  status: string;
  decision_rationale: string | null;
}

interface Position {
  id: string;
  title: string;
  position_essence: string | null;
  tone: string | null;
  status: string;
  accepted_at: string | null;
  rejected_at: string | null;
  rejected_reason: string | null;
  validation_issues: Record<string, unknown> | null;
  created_at: string;
}

interface Signal {
  id: string;
  title: string;
  summary: string;
  source_date: string | null;
  raw_sources: Array<{ url?: string; domain?: string }> | null;
}

export default function Workspace() {
  const { threadId } = useParams<{ threadId: string }>();
  const navigate = useNavigate();

  const [thread, setThread] = useState<Thread | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [activePosition, setActivePosition] = useState<Position | null>(null);
  const [loading, setLoading] = useState(true);
  const [deciding, setDeciding] = useState(false);
  const [decisionNote, setDecisionNote] = useState('');
  const [imageLoaded, setImageLoaded] = useState(false);

  const loadWorkspace = useCallback(async (id: string) => {
    const { data: threadData } = await supabase
      .from('decision_threads')
      .select('id, title, lens, key_question, cover_image_url, status, decision_rationale')
      .eq('id', id)
      .single();

    if (!threadData) { setLoading(false); return; }
    setThread(threadData);

    const { data: positionData } = await supabase
      .from('positions')
      .select('id, title, position_essence, tone, status, accepted_at, rejected_at, rejected_reason, validation_issues, created_at')
      .eq('decision_thread_id', id)
      .order('created_at', { ascending: false });

    const visible = (positionData || []).filter(p => {
      if (p.status === 'accepted') return true;
      const vi = p.validation_issues as Record<string, unknown> | null;
      return !vi?.hidden;
    });

    setPositions(visible);

    const accepted = visible.find(p => p.status === 'accepted');
    const latest = visible.find(p => p.status === 'pending' || !p.status);
    setActivePosition(accepted || latest || visible[0] || null);

    const { data: signalLinks } = await supabase
      .from('decision_signals')
      .select('signal_id, actionability_score, signals(id, title, summary, source_date, raw_sources)')
      .eq('decision_thread_id', id)
      .order('actionability_score', { ascending: false })
      .limit(10);

    const signalData = (signalLinks || [])
      .map((s: Record<string, unknown>) => s.signals as Signal | null)
      .filter(Boolean) as Signal[];

    setSignals(signalData);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (threadId) loadWorkspace(threadId);
  }, [threadId, loadWorkspace]);

  const handleMarkDecided = async () => {
    if (!thread || !activePosition) return;
    await supabase.from('decision_threads').update({
      status: 'decided',
      decided_at: new Date().toISOString(),
      decided_position_id: activePosition.id,
      decision_rationale: decisionNote || null,
    }).eq('id', thread.id);
    await supabase.from('positions').update({ status: 'accepted' }).eq('id', activePosition.id);
    setDeciding(false);
    navigate('/');
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT }}>
        <p style={{ color: '#9ca3af', fontSize: 14 }}>Loading…</p>
      </div>
    );
  }

  if (!thread) return null;

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', fontFamily: FONT }}>

      {/* HEADER */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50, background: '#fff',
        borderBottom: '1px solid #f0f0f0', padding: '0 32px', height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={() => navigate('/')} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#9ca3af', fontSize: 20, padding: 0, lineHeight: 1,
            display: 'flex', alignItems: 'center',
          }}>←</button>
          <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.03em', color: '#111' }}>AUO</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {thread.status !== 'decided' && (
            <button onClick={() => setDeciding(true)} style={{
              background: '#111', color: '#fff', border: 'none',
              borderRadius: 20, padding: '7px 18px',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>
              Mark as decided
            </button>
          )}
          {thread.status === 'decided' && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: '#f0fdf4', border: '1px solid #bbf7d0',
              borderRadius: 20, padding: '6px 14px',
            }}>
              <span style={{ color: '#16a34a', fontSize: 13, fontWeight: 600 }}>Decided</span>
            </div>
          )}
        </div>
      </header>

      {/* COVER IMAGE BANNER */}
      <div style={{
        height: 240,
        background: LENS_GRADIENTS[thread.lens] || LENS_GRADIENTS.competitive,
        position: 'relative', overflow: 'hidden',
      }}>
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
          background: 'linear-gradient(to bottom, transparent 30%, rgba(0,0,0,0.75) 100%)',
        }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 32px 24px' }}>
          <p style={{
            fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: 500,
            marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em',
          }}>
            {thread.lens?.replace(/_/g, ' ')}
          </p>
          <h1 style={{
            fontSize: 28, fontWeight: 800, color: '#fff', lineHeight: 1.2,
            letterSpacing: '-0.02em', margin: 0,
          }}>
            {thread.title}
          </h1>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div style={{
        maxWidth: 960, margin: '0 auto', padding: '40px 32px',
        display: 'grid', gridTemplateColumns: '1fr 340px', gap: 40, alignItems: 'start',
      }}>

        {/* LEFT — Positions */}
        <div>
          <h2 style={{
            fontSize: 13, fontWeight: 700, letterSpacing: '0.08em',
            color: '#9ca3af', textTransform: 'uppercase', marginBottom: 16,
          }}>
            Positions
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {positions.map(p => {
              const isActive = p.id === activePosition?.id;
              const isAccepted = p.status === 'accepted';
              const isRejected = p.status === 'rejected';
              const toneColor = (p.tone === 'ACT NOW' || p.tone === 'ACT_NOW')
                ? '#ef4444' : p.tone === 'WATCH' ? '#f59e0b' : '#9ca3af';

              return (
                <div key={p.id} onClick={() => !isRejected && setActivePosition(p)} style={{
                  borderRadius: 12,
                  border: isActive ? '2px solid #111' : '1.5px solid #e5e7eb',
                  padding: '16px 18px',
                  cursor: isRejected ? 'default' : 'pointer',
                  background: isRejected ? '#fafafa' : '#fff',
                  opacity: isRejected ? 0.55 : 1,
                  transition: 'border-color 0.15s',
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      {isAccepted && (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          background: '#f0fdf4', color: '#16a34a',
                          fontSize: 11, fontWeight: 600, borderRadius: 20,
                          padding: '2px 8px', marginBottom: 8,
                        }}>Accepted</span>
                      )}
                      {isRejected && (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          background: '#fef2f2', color: '#ef4444',
                          fontSize: 11, fontWeight: 600, borderRadius: 20,
                          padding: '2px 8px', marginBottom: 8,
                        }}>Rejected</span>
                      )}
                      <p style={{
                        fontSize: 15, fontWeight: 600,
                        color: isRejected ? '#6b7280' : '#111',
                        lineHeight: 1.4, marginBottom: 6,
                      }}>{p.title}</p>
                      {p.position_essence && !isRejected && (
                        <p style={{
                          fontSize: 12, color: '#ea580c', lineHeight: 1.4,
                          display: '-webkit-box', WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical', overflow: 'hidden',
                        }}>{p.position_essence}</p>
                      )}
                      {isRejected && p.rejected_reason && (
                        <p style={{ fontSize: 12, color: '#9ca3af', fontStyle: 'italic' }}>
                          "{p.rejected_reason}"
                        </p>
                      )}
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: '0.07em',
                      color: toneColor, fontFamily: 'monospace', flexShrink: 0, paddingTop: 2,
                    }}>{p.tone}</span>
                  </div>
                </div>
              );
            })}
            {positions.length === 0 && (
              <p style={{ fontSize: 14, color: '#9ca3af', padding: '20px 0' }}>
                AUO is building positions for this decision…
              </p>
            )}
          </div>
        </div>

        {/* RIGHT — Key question + Signals */}
        <div>
          {thread.key_question && (
            <div style={{ background: '#f8f9fa', borderRadius: 12, padding: '16px 18px', marginBottom: 24 }}>
              <p style={{
                fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
                color: '#9ca3af', textTransform: 'uppercase', marginBottom: 8,
              }}>Key question</p>
              <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.5 }}>{thread.key_question}</p>
            </div>
          )}

          <h2 style={{
            fontSize: 13, fontWeight: 700, letterSpacing: '0.08em',
            color: '#9ca3af', textTransform: 'uppercase', marginBottom: 16,
          }}>
            Signals · {signals.length}
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {signals.slice(0, 6).map(s => {
              const firstSource = Array.isArray(s.raw_sources) ? s.raw_sources[0] : null;
              const url = firstSource?.url;
              const domain = firstSource?.domain || (url ? new URL(url).hostname.replace('www.', '') : null);
              const Tag = url ? 'a' : 'div';
              const linkProps = url ? { href: url, target: '_blank', rel: 'noopener noreferrer' } : {};

              return (
                <Tag key={s.id} {...linkProps as Record<string, string>} style={{
                  display: 'block', borderRadius: 10,
                  border: '1.5px solid #f0f0f0', padding: '12px 14px',
                  textDecoration: 'none', transition: 'border-color 0.15s', background: '#fff',
                  cursor: url ? 'pointer' : 'default',
                }}
                  onMouseEnter={(e: React.MouseEvent<HTMLElement>) => ((e.currentTarget as HTMLElement).style.borderColor = '#d1d5db')}
                  onMouseLeave={(e: React.MouseEvent<HTMLElement>) => ((e.currentTarget as HTMLElement).style.borderColor = '#f0f0f0')}
                >
                  <p style={{
                    fontSize: 13, fontWeight: 600, color: '#111', lineHeight: 1.4, marginBottom: 4,
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  }}>{s.title}</p>
                  <p style={{ fontSize: 11, color: '#9ca3af', display: 'flex', gap: 6 }}>
                    {domain && <span>{domain}</span>}
                    {s.source_date && (
                      <>
                        {domain && <span>·</span>}
                        <span>{new Date(s.source_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      </>
                    )}
                  </p>
                </Tag>
              );
            })}
            {signals.length === 0 && (
              <p style={{ fontSize: 13, color: '#9ca3af' }}>No signals linked yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* MARK AS DECIDED modal */}
      {deciding && (
        <>
          <div onClick={() => setDeciding(false)} style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', zIndex: 100,
          }} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            width: 'min(520px, 90vw)', background: '#fff', borderRadius: 20,
            boxShadow: '0 24px 64px rgba(0,0,0,0.15)', zIndex: 101, padding: 28,
          }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111', marginBottom: 6, letterSpacing: '-0.01em' }}>
              Mark as decided
            </h3>
            <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 20, lineHeight: 1.5 }}>
              This will archive the decision and all its context. You can always ask AUO about it later.
            </p>
            {activePosition && (
              <div style={{ background: '#f8f9fa', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
                <p style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>Decision</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#111' }}>{activePosition.title}</p>
              </div>
            )}
            <textarea
              value={decisionNote}
              onChange={e => setDecisionNote(e.target.value)}
              placeholder="Why this decision? (optional — helps AUO learn)"
              style={{
                width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 10,
                padding: '10px 14px', fontSize: 14, resize: 'none', height: 80,
                fontFamily: 'inherit', outline: 'none', color: '#111', lineHeight: 1.5,
                boxSizing: 'border-box', marginBottom: 16,
              }}
              onFocus={e => (e.currentTarget.style.borderColor = '#111')}
              onBlur={e => (e.currentTarget.style.borderColor = '#e5e7eb')}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handleMarkDecided} style={{
                flex: 1, background: '#111', color: '#fff', border: 'none',
                borderRadius: 10, padding: '11px 0', fontSize: 14, fontWeight: 700, cursor: 'pointer',
              }}>Confirm decision</button>
              <button onClick={() => setDeciding(false)} style={{
                flex: 1, background: 'none', border: '1.5px solid #e5e7eb',
                borderRadius: 10, padding: '11px 0', fontSize: 14, color: '#6b7280', cursor: 'pointer',
              }}>Cancel</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
