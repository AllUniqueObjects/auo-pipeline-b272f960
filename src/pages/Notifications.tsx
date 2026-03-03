import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { colors, typography, transition, shadow } from '../design-tokens';

const FONT = typography.fontFamily;

interface DirectionEvent {
  id: string;
  thread_id: string;
  event_type: string;
  payload: Record<string, any>;
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

function cleanText(text: string): string {
  return text.replace(/\s*\(scan-[^)]+\)/g, '').replace(/\s*—scan-\S+/g, '');
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

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const isRead = (evt: DirectionEvent) => evt.read === true || dismissedIds.has(evt.id);

  const handleClick = async (evt: DirectionEvent) => {
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

        <h1 style={{
          fontSize: 24,
          fontWeight: 700,
          color: colors.text.primary.light,
          letterSpacing: typography.letterSpacing.tight,
          marginBottom: 32,
        }}>
          Notifications
        </h1>

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

        {!loading && events.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <p style={{
              fontSize: 16, fontWeight: 600,
              color: colors.text.secondary.light, marginBottom: 8,
            }}>
              No notifications yet
            </p>
            <p style={{ fontSize: 14, color: colors.text.muted.light }}>
              When AUO detects a direction change on your topics, it will appear here.
            </p>
          </div>
        )}

        {!loading && events.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {events.map(evt => {
              const p = evt.payload || {};
              const posTitle = p.position_title;
              const threadTitle = threadMap[evt.thread_id] || 'Unknown topic';
              const displayTitle = posTitle
                ? `${posTitle} — ${threadTitle}`
                : threadTitle;
              const confidence = p.new_confidence ?? p.confidence;
              const rawReason = p.reasoning || p.reason || '';
              const cleanReason = cleanText(rawReason);

              // Full-text summaries for old/new direction (may or may not exist)
              const oldSummary = p.old_summary || p.old_position_essence || p.old_direction || '';
              const newSummary = p.new_summary || p.new_position_essence || p.new_direction || '';
              const hasComparison = oldSummary && newSummary;

              const read = isRead(evt);
              const rel = relativeTime(evt.created_at);

              return (
                <div
                  key={evt.id}
                  onClick={() => handleClick(evt)}
                  style={{
                    padding: '20px 22px',
                    borderRadius: 14,
                    background: read ? colors.bg.light : 'rgba(217,119,6,0.04)',
                    border: `1px solid ${read ? colors.border.light : 'rgba(217,119,6,0.15)'}`,
                    cursor: 'pointer',
                    transition: transition.fast,
                    boxShadow: read ? 'none' : '0 1px 4px rgba(217,119,6,0.06)',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = read
                      ? colors.bg.surface
                      : 'rgba(217,119,6,0.07)';
                    e.currentTarget.style.boxShadow = shadow.sm;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = read
                      ? colors.bg.light
                      : 'rgba(217,119,6,0.04)';
                    e.currentTarget.style.boxShadow = read ? 'none' : '0 1px 4px rgba(217,119,6,0.06)';
                  }}
                >
                  {/* Header: icon + title */}
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span style={{
                      fontSize: 16, flexShrink: 0, marginTop: 1,
                      opacity: read ? 0.4 : 1,
                    }}>
                      ⚡
                    </span>
                    <div style={{
                      fontSize: 14,
                      fontWeight: read ? 500 : 600,
                      color: read ? colors.text.secondary.light : colors.text.primary.light,
                      lineHeight: 1.35,
                    }}>
                      Direction changed on{' '}
                      <span style={{ fontWeight: read ? 600 : 700 }}>{displayTitle}</span>
                    </div>
                  </div>

                  {/* Old → New comparison blocks */}
                  {hasComparison && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'stretch',
                      gap: 0,
                      marginTop: 14,
                      marginLeft: 26,
                    }}>
                      {/* Old */}
                      <div style={{
                        flex: 1,
                        padding: '10px 14px',
                        fontSize: 12.5,
                        lineHeight: 1.5,
                        color: read ? colors.text.muted.light : colors.text.secondary.light,
                        background: 'rgba(0,0,0,0.03)',
                        borderRadius: '8px 0 0 8px',
                        borderRight: 'none',
                      }}>
                        {cleanText(oldSummary)}
                      </div>

                      {/* Arrow */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '0 10px',
                        background: 'rgba(0,0,0,0.03)',
                        color: colors.text.muted.light,
                        fontSize: 14,
                        flexShrink: 0,
                      }}>
                        →
                      </div>

                      {/* New */}
                      <div style={{
                        flex: 1,
                        padding: '10px 14px',
                        fontSize: 12.5,
                        lineHeight: 1.5,
                        color: read ? colors.text.muted.light : '#92400e',
                        background: 'rgba(217,119,6,0.08)',
                        borderRadius: '0 8px 8px 0',
                      }}>
                        {cleanText(newSummary)}
                      </div>

                      {/* Confidence */}
                      {confidence != null && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          marginLeft: 12,
                          fontSize: 12,
                          color: colors.text.muted.light,
                          flexShrink: 0,
                          whiteSpace: 'nowrap',
                        }}>
                          · {Math.round(confidence * 100)}%<br/>confidence
                        </div>
                      )}
                    </div>
                  )}

                  {/* Confidence inline when no comparison blocks */}
                  {!hasComparison && confidence != null && (
                    <div style={{
                      marginTop: 8,
                      marginLeft: 26,
                      fontSize: 12,
                      color: colors.text.muted.light,
                    }}>
                      {Math.round(confidence * 100)}% confidence
                    </div>
                  )}

                  {/* Full reasoning */}
                  {cleanReason && (
                    <div style={{
                      marginTop: 14,
                      marginLeft: 26,
                      fontSize: 13,
                      lineHeight: 1.55,
                      color: read ? colors.text.muted.light : colors.text.secondary.light,
                    }}>
                      {cleanReason}
                    </div>
                  )}

                  {/* Date */}
                  <div style={{
                    marginTop: 12,
                    marginLeft: 26,
                    fontSize: 11,
                    color: colors.text.muted.light,
                  }}>
                    {formatDate(evt.created_at)}
                    {rel && <span style={{ marginLeft: 6 }}>· {rel}</span>}
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
