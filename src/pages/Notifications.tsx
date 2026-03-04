import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { colors, typography, transition } from '../design-tokens';
import AppHeader from '../components/AppHeader';

const FONT = typography.fontFamily;

interface DirectionEvent {
  id: string;
  thread_id: string;
  event_type: string;
  payload: Record<string, any>;
  created_at: string;
  read?: boolean;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function cleanText(text: string): string {
  return text
    .replace(/\(scan-[a-f0-9]+\)/g, '')
    .replace(/\s*—scan-\S+/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export default function Notifications() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<DirectionEvent[]>([]);
  const [threadMap, setThreadMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const dismissedIds = new Set<string>(
    JSON.parse(sessionStorage.getItem('dismissedDirectionEvents') || '[]')
  );

  const loadEvents = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

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

  useEffect(() => { loadEvents(); }, [loadEvents]);

  // Mark all unread events as read when page loads
  useEffect(() => {
    if (loading || events.length === 0) return;
    const unreadIds = events.filter(e => !e.read).map(e => e.id);
    if (unreadIds.length === 0) return;
    (supabase as any)
      .from('agent_events')
      .update({ read: true })
      .in('id', unreadIds)
      .then(() => {
        setEvents(prev => prev.map(e => ({ ...e, read: true })));
      })
      .catch(() => {});
  }, [loading, events.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const isRead = (evt: DirectionEvent) => evt.read === true || dismissedIds.has(evt.id);

  const handleViewInsight = async (evt: DirectionEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isRead(evt)) {
      await (supabase as any)
        .from('agent_events')
        .update({ read: true })
        .eq('id', evt.id)
        .catch(() => {});
    }
    if (evt.payload?.position_id) {
      navigate(`/insights/${evt.payload.position_id}`);
      return;
    }
    // Fallback: find the latest position for this thread
    const { data: pos } = await (supabase as any)
      .from('positions')
      .select('id')
      .eq('decision_thread_id', evt.thread_id)
      .not('validated_at', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1);
    if (pos?.[0]?.id) {
      navigate(`/insights/${pos[0].id}`);
    } else {
      navigate(`/?thread=${evt.thread_id}`);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#fafafa',
      fontFamily: FONT,
    }}>
      <AppHeader />
      <div style={{
        maxWidth: 680,
        margin: '0 auto',
        padding: '40px 24px',
      }}>
        <button
          onClick={() => navigate('/')}
          style={{
            display: 'block',
            marginBottom: 16,
            background: 'none',
            border: 'none',
            fontSize: 13,
            color: '#999',
            cursor: 'pointer',
            fontFamily: FONT,
            transition: transition.fast,
            padding: 0,
          }}
        >
          &larr; Back to Feed
        </button>

        <h1 style={{
          fontSize: 24,
          fontWeight: 700,
          color: '#111',
          letterSpacing: typography.letterSpacing.tight,
          marginBottom: 32,
        }}>
          Notifications
        </h1>

        {loading && (
          <div style={{
            textAlign: 'center',
            padding: '60px 0',
            color: '#999',
            fontSize: 14,
          }}>
            Loading…
          </div>
        )}

        {!loading && events.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <p style={{ fontSize: 16, fontWeight: 600, color: '#666', marginBottom: 8 }}>
              No notifications yet
            </p>
            <p style={{ fontSize: 14, color: '#999' }}>
              When AUO detects a direction change on your topics, it will appear here.
            </p>
          </div>
        )}

        {!loading && events.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {events.map(evt => {
              const p = evt.payload || {};
              const posTitle = p.position_title;
              const threadTitle = threadMap[evt.thread_id] || 'Unknown topic';
              const confidence = p.new_confidence ?? p.confidence;
              const rel = relativeTime(evt.created_at);
              const read = isRead(evt);

              // Was / Now text — try rich summaries, fall back to direction labels
              const wasText = cleanText(
                p.old_summary || p.old_position_essence || p.old_direction || ''
              );
              const nowText = cleanText(
                p.new_summary || p.new_position_essence || p.new_direction || ''
              );

              // Build display title
              const title = posTitle
                ? `${posTitle}\n— ${threadTitle}`
                : threadTitle;

              return (
                <div
                  key={evt.id}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e8e8e8',
                    borderRadius: 12,
                    padding: '20px 24px',
                    position: 'relative',
                    opacity: read ? 0.7 : 1,
                    transition: transition.fast,
                  }}
                >
                  {/* Top row: badge + confidence + time */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 12,
                  }}>
                    <span style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#92400e',
                      background: '#fef3c7',
                      padding: '3px 8px',
                      borderRadius: 4,
                      letterSpacing: '0.3px',
                    }}>
                      ⚡ Direction changed
                    </span>
                    {confidence != null && (
                      <span style={{ fontSize: 12, color: '#999' }}>
                        · {Math.round(confidence * 100)}% confidence
                      </span>
                    )}
                    <span style={{
                      marginLeft: 'auto',
                      fontSize: 12,
                      color: '#bbb',
                    }}>
                      {rel}
                    </span>
                  </div>

                  {/* Title */}
                  <div style={{
                    fontSize: 16,
                    fontWeight: 600,
                    color: '#111',
                    lineHeight: 1.4,
                    marginBottom: (wasText || nowText) ? 16 : 0,
                    whiteSpace: 'pre-line',
                  }}>
                    {title}
                  </div>

                  {/* Was / Now rows */}
                  {(wasText || nowText) && (
                    <>
                      <div style={{
                        height: 1,
                        background: '#f0f0f0',
                        marginBottom: 16,
                      }} />

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {wasText && (
                          <div style={{ display: 'flex', gap: 16 }}>
                            <span style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: '#bbb',
                              letterSpacing: '0.5px',
                              textTransform: 'uppercase' as const,
                              paddingTop: 2,
                              minWidth: 28,
                              flexShrink: 0,
                            }}>
                              Was
                            </span>
                            <span style={{
                              fontSize: 14,
                              color: '#666',
                              lineHeight: 1.6,
                            }}>
                              {wasText}
                            </span>
                          </div>
                        )}

                        {nowText && (
                          <div style={{ display: 'flex', gap: 16 }}>
                            <span style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: '#92400e',
                              letterSpacing: '0.5px',
                              textTransform: 'uppercase' as const,
                              paddingTop: 2,
                              minWidth: 28,
                              flexShrink: 0,
                            }}>
                              Now
                            </span>
                            <span style={{
                              fontSize: 14,
                              color: '#111',
                              lineHeight: 1.6,
                              fontWeight: 500,
                            }}>
                              {nowText}
                            </span>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* Bottom: View insight CTA */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    marginTop: 16,
                    paddingTop: 16,
                    borderTop: '1px solid #f5f5f5',
                  }}>
                    <a
                      onClick={(e) => handleViewInsight(evt, e)}
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#111',
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        cursor: 'pointer',
                      }}
                    >
                      View insight →
                    </a>
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
