import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { colors, typography, transition, shadow } from '../design-tokens';

const FONT = typography.fontFamily;

interface DirectionEvent {
  id: string;
  thread_id: string;
  event_type: string;
  payload: {
    position_id?: string;
    position_title?: string;
    old_direction?: string;
    new_direction?: string;
    old_confidence?: number;
    new_confidence?: number;
    confidence?: number;
    reason?: string;
    reasoning?: string;
  };
  created_at: string;
  read?: boolean;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    + ' at '
    + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return '';
}

export default function Notifications() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<DirectionEvent[]>([]);
  const [threadMap, setThreadMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // IDs dismissed in this session (from Feed's sessionStorage)
  const dismissedIds = new Set<string>(
    JSON.parse(sessionStorage.getItem('dismissedDirectionEvents') || '[]')
  );

  const loadEvents = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's thread IDs
      const { data: threads } = await (supabase as any)
        .from('decision_threads')
        .select('id, title')
        .eq('user_id', user.id);

      if (!threads || threads.length === 0) {
        setLoading(false);
        return;
      }

      const tMap: Record<string, string> = {};
      const threadIds: string[] = [];
      for (const t of threads) {
        tMap[t.id] = t.title || 'Untitled';
        threadIds.push(t.id);
      }
      setThreadMap(tMap);

      // Fetch all direction_changed events for these threads
      const { data } = await (supabase as any)
        .from('agent_events')
        .select('id, thread_id, event_type, payload, created_at, read')
        .eq('event_type', 'direction_changed')
        .in('thread_id', threadIds)
        .order('created_at', { ascending: false })
        .limit(50);

      if (data) setEvents(data);
    } catch (err) {
      console.warn('[Notifications] Failed to load events:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const isRead = (evt: DirectionEvent) => evt.read === true || dismissedIds.has(evt.id);

  const handleClick = async (evt: DirectionEvent) => {
    // Mark as read
    if (!isRead(evt)) {
      await (supabase as any)
        .from('agent_events')
        .update({ read: true })
        .eq('id', evt.id)
        .catch(() => {});
    }

    if (evt.payload?.position_id) {
      navigate(`/insights/${evt.payload.position_id}`);
    } else {
      navigate(`/?thread=${evt.thread_id}`);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: colors.bg.light,
      fontFamily: FONT,
    }}>
      <div style={{
        maxWidth: 860,
        margin: '0 auto',
        padding: '40px 24px',
      }}>
        {/* Back button */}
        <button
          onClick={() => navigate('/')}
          style={{
            display: 'block',
            marginBottom: 16,
            background: 'none',
            border: 'none',
            fontSize: 13,
            color: colors.text.muted.light,
            cursor: 'pointer',
            fontFamily: FONT,
            transition: transition.fast,
            padding: 0,
          }}
        >
          &larr; Back to Feed
        </button>

        {/* Header */}
        <h1 style={{
          fontSize: 24,
          fontWeight: 700,
          color: colors.text.primary.light,
          letterSpacing: typography.letterSpacing.tight,
          marginBottom: 32,
        }}>
          Notifications
        </h1>

        {/* Loading */}
        {loading && (
          <div style={{
            textAlign: 'center',
            padding: '60px 0',
            color: colors.text.muted.light,
            fontSize: 14,
          }}>
            Loading…
          </div>
        )}

        {/* Empty state */}
        {!loading && events.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '80px 0',
          }}>
            <p style={{
              fontSize: 16,
              fontWeight: 600,
              color: colors.text.secondary.light,
              marginBottom: 8,
            }}>
              No notifications yet
            </p>
            <p style={{
              fontSize: 14,
              color: colors.text.muted.light,
            }}>
              When AUO detects a direction change on your topics, it will appear here.
            </p>
          </div>
        )}

        {/* Event list */}
        {!loading && events.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {events.map(evt => {
              const p = evt.payload;
              const posTitle = p?.position_title;
              const threadTitle = threadMap[evt.thread_id] || 'Unknown topic';
              const confidence = p?.new_confidence ?? p?.confidence;
              const rawReason = p?.reasoning || p?.reason || '';
              const cleanReason = rawReason.replace(/\s*\(scan-[^)]+\)/g, '');
              const hasDirectionShift = p?.old_direction && p?.new_direction;
              const read = isRead(evt);
              const rel = relativeTime(evt.created_at);

              return (
                <div
                  key={evt.id}
                  onClick={() => handleClick(evt)}
                  style={{
                    display: 'flex',
                    gap: 12,
                    padding: '16px 18px',
                    borderRadius: 12,
                    background: read ? 'transparent' : 'rgba(217,119,6,0.05)',
                    border: `1px solid ${read ? colors.border.light : 'rgba(217,119,6,0.15)'}`,
                    cursor: 'pointer',
                    transition: transition.fast,
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = read
                      ? colors.bg.surface
                      : 'rgba(217,119,6,0.09)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = read
                      ? 'transparent'
                      : 'rgba(217,119,6,0.05)';
                  }}
                >
                  <span style={{
                    fontSize: 16,
                    flexShrink: 0,
                    marginTop: 1,
                    opacity: read ? 0.45 : 1,
                  }}>
                    ⚡
                  </span>

                  <div style={{ minWidth: 0, flex: 1 }}>
                    {/* Title */}
                    <div style={{
                      fontSize: 14,
                      fontWeight: read ? 500 : 600,
                      color: read ? colors.text.secondary.light : colors.text.primary.light,
                      lineHeight: 1.3,
                    }}>
                      {posTitle
                        ? <>Direction shifted on <span style={{ fontWeight: read ? 600 : 700 }}>{posTitle}</span></>
                        : <>Direction changed on <span style={{ fontWeight: read ? 600 : 700 }}>{threadTitle}</span></>
                      }
                    </div>

                    {/* Direction shift badge */}
                    {hasDirectionShift && (
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        marginTop: 6,
                        fontSize: 12,
                        fontWeight: 500,
                        color: colors.text.secondary.light,
                      }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: 6,
                          background: 'rgba(0,0,0,0.05)',
                          fontSize: 11,
                          fontWeight: 600,
                        }}>
                          {p!.old_direction}
                        </span>
                        <span style={{ color: colors.text.muted.light }}>→</span>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: 6,
                          background: colors.accent.amberLight,
                          color: colors.accent.amber,
                          fontSize: 11,
                          fontWeight: 600,
                        }}>
                          {p!.new_direction}
                        </span>
                        {confidence != null && (
                          <span style={{ color: colors.text.muted.light, fontSize: 11 }}>
                            · {Math.round(confidence * 100)}% confidence
                          </span>
                        )}
                      </div>
                    )}

                    {/* Reason — full text, wrapping */}
                    {cleanReason && (
                      <div style={{
                        fontSize: 13,
                        color: read ? colors.text.muted.light : colors.text.secondary.light,
                        marginTop: 6,
                        lineHeight: 1.5,
                      }}>
                        {cleanReason}
                      </div>
                    )}

                    {/* Meta line: topic + date */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginTop: 8,
                      fontSize: 11,
                      color: colors.text.muted.light,
                    }}>
                      {posTitle && (
                        <span>{threadTitle}</span>
                      )}
                      {posTitle && <span>·</span>}
                      <span>{formatDate(evt.created_at)}</span>
                      {rel && <span>· {rel}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
