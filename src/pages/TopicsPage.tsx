import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { colors, typography, transition } from '../design-tokens';
import AppHeader from '../components/AppHeader';
import { useTopicSuggestions } from '../hooks/useTopicSuggestions';
import type { TopicSuggestion } from '../types/suggestions';

const FONT = typography.fontFamily;

const CAT_COLOR: Record<string, string> = {
  SOURCING: '#3b82f6',
  COMPLIANCE: '#8b5cf6',
  COMPETITOR: '#f97316',
  MACRO: '#ef4444',
  INNOVATION: '#10b981',
};

const MONITOR: Record<string, { label: string; color: string; freq: string }> = {
  breaking: { label: 'Breaking', color: '#ef4444', freq: 'Every 20 min' },
  priority: { label: 'Priority', color: '#f59e0b', freq: '3x daily' },
  standard: { label: 'Standard', color: '#d1d5db', freq: 'Daily' },
};

interface ThreadRow {
  id: string;
  user_id: string;
  title: string;
  lens: string;
  status: string;
  monitor_level: string;
  category?: string;
  created_at: string;
  updated_at: string;
  insight_count: number;
  last_signal_at: string;
}

function inferLens(title: string): string {
  const t = title.toLowerCase();
  if (t.includes('certif') || t.includes('bluesign') || t.includes('material')) return 'textile_innovation';
  if (t.includes('vietnam') || t.includes('indonesia') || t.includes('sourcing') || t.includes('fob')) return 'sourcing';
  if (t.includes('cost') || t.includes('tariff') || t.includes('pricing')) return 'cost_structure';
  if (t.includes('supply') || t.includes('chain') || t.includes('compliance')) return 'supply_chain';
  return 'sourcing';
}

const formatRelativeTime = (isoString: string): string => {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  const weeks = Math.floor(diff / 604800000);
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return `${weeks}w ago`;
};

const formatLens = (lens: string): string =>
  (lens || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

export default function TopicsPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'active' | 'archived'>('active');
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [chatState, setChatState] = useState<'idle' | 'thinking' | 'responded'>('idle');
  const [agentMessage, setAgentMessage] = useState('');
  const [agentSuggestions, setAgentSuggestions] = useState<{ title: string; reason: string; category: string }[]>([]);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const { suggestions, accept: acceptSuggestion, dismiss: dismissSuggestion } = useTopicSuggestions();

  // Get user
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  // Load threads
  const loadThreads = useCallback(async () => {
    if (!userId) return;
    try {
      const { data: threadData } = await (supabase as any)
        .from('decision_threads')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (!threadData) { setLoading(false); return; }

      // Load insight counts
      const threadIds = threadData.map((t: any) => t.id);
      const { data: posData } = await (supabase as any)
        .from('positions')
        .select('decision_thread_id')
        .in('decision_thread_id', threadIds);

      const countMap: Record<string, number> = {};
      for (const p of posData || []) {
        countMap[p.decision_thread_id] = (countMap[p.decision_thread_id] || 0) + 1;
      }

      const rows: ThreadRow[] = threadData.map((t: any) => ({
        ...t,
        monitor_level: t.monitor_level || 'standard',
        status: t.status || 'active',
        insight_count: countMap[t.id] || 0,
        last_signal_at: t.updated_at || t.created_at,
      }));

      setThreads(rows);
    } catch (err) {
      console.error('[Topics] Load failed:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { loadThreads(); }, [loadThreads]);

  // Close menu on outside click
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!(e.target as Element).closest('[data-menu]')) setOpenMenu(null);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  // Actions
  const updateMonitorLevel = async (threadId: string, level: string) => {
    setThreads(prev =>
      prev.map(t => t.id === threadId ? { ...t, monitor_level: level } : t)
    );
    setOpenMenu(null);
    await (supabase as any)
      .from('decision_threads')
      .update({ monitor_level: level, updated_at: new Date().toISOString() })
      .eq('id', threadId);
  };

  const archiveThread = async (threadId: string) => {
    setThreads(prev =>
      prev.map(t => t.id === threadId ? { ...t, status: 'archived' } : t)
    );
    setOpenMenu(null);
    await (supabase as any)
      .from('decision_threads')
      .update({ level: 'archived', updated_at: new Date().toISOString() })
      .eq('id', threadId);
    // Also clear monitor on positions
    await (supabase as any)
      .from('positions')
      .update({ is_monitored: false })
      .eq('decision_thread_id', threadId);
  };

  const reactivateThread = async (threadId: string) => {
    setThreads(prev =>
      prev.map(t => t.id === threadId ? { ...t, status: 'active' } : t)
    );
    await (supabase as any)
      .from('decision_threads')
      .update({ level: 'listening', updated_at: new Date().toISOString() })
      .eq('id', threadId);
  };

  const addTopic = async (title: string) => {
    if (!userId) return null;
    const lens = inferLens(title);
    const { data, error } = await (supabase as any)
      .from('decision_threads')
      .insert({
        user_id: userId,
        title,
        lens,
        status: 'active',
      })
      .select()
      .single();

    if (error || !data) {
      console.error('[Topics] Insert failed:', error);
      return null;
    }

    setThreads(prev => [{ ...data, monitor_level: 'standard', insight_count: 0, last_signal_at: data.created_at }, ...prev]);

    // Trigger scans (non-blocking)
    supabase.functions.invoke('scan_priority', { body: { thread_id: data.id } }).catch(() => {});
    const scanUrl = import.meta.env.VITE_MODAL_SCAN_PRIORITY_URL;
    if (scanUrl) {
      fetch(scanUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thread_id: data.id, user_id: userId, topic: title }),
      }).catch(() => {});
    }

    return data;
  };

  // Agent chat
  const handleAgentChat = async () => {
    const query = chatInput.trim();
    if (!query || chatState === 'thinking' || !userId) return;
    setChatInput('');
    setChatState('thinking');
    setAgentMessage('');
    setAgentSuggestions([]);

    try {
      const res = await fetch(
        'https://dkk222--auo-scanner-insight-chat.modal.run',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            message: query,
            intent_hint: 'suggest_topics',
            context: {
              existing_topics: threads
                .filter(t => t.status === 'active')
                .map(t => t.title),
            },
          }),
        }
      );
      const data = await res.json();

      const jsonMatch = data.response?.match(/```json([\s\S]*?)```/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[1]);
          setAgentSuggestions(parsed.suggestions || []);
          setAgentMessage(parsed.message || data.response.replace(/```json[\s\S]*?```/, '').trim());
        } catch {
          setAgentMessage(data.response);
        }
      } else {
        setAgentMessage(data.response);
      }
      setChatState('responded');
    } catch (e) {
      console.error('[Topics] Agent chat failed:', e);
      setAgentMessage('Something went wrong. Try again.');
      setChatState('responded');
    }
  };

  // Derived
  const activeThreads = threads.filter(t => t.status === 'active' && t.status !== 'archived');
  // Check the 'level' field for archived status (matches Feed.tsx pattern)
  const archivedThreads = threads.filter(t => t.status === 'archived' || (t as any).level === 'archived');
  const displayThreads = filter === 'active'
    ? threads.filter(t => (t as any).level !== 'archived' && t.status !== 'archived')
    : archivedThreads;

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: colors.bg.light, fontFamily: FONT }}>
        <AppHeader />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
          <span style={{ color: colors.text.muted.light, fontSize: 14 }}>Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: colors.bg.light, fontFamily: FONT }}>
      <AppHeader />

      <div style={{ maxWidth: 660, margin: '0 auto', padding: '32px 24px' }}>
        {/* Back + Header */}
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 13, color: colors.text.muted.light, fontFamily: FONT,
            padding: 0, marginBottom: 16,
          }}
        >
          &larr; Feed
        </button>

        <div style={{ marginBottom: 28 }}>
          <div style={{
            fontSize: 10, letterSpacing: '0.1em', color: '#c4c4c4',
            textTransform: 'uppercase', fontWeight: 600, marginBottom: 6,
          }}>
            {displayThreads.filter(t => (t as any).level !== 'archived' && t.status !== 'archived').length > 0
              ? `${threads.filter(t => (t as any).level !== 'archived' && t.status !== 'archived').length} active`
              : 'No active topics'}
          </div>
          <h1 style={{
            fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em',
            color: colors.text.primary.light, margin: 0,
          }}>
            Your topics
          </h1>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24 }}>
          {(['active', 'archived'] as const).map(tab => {
            const isActive = filter === tab;
            const count = tab === 'active'
              ? threads.filter(t => (t as any).level !== 'archived' && t.status !== 'archived').length
              : archivedThreads.length;
            return (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                style={{
                  padding: '6px 14px', borderRadius: 20,
                  border: '1px solid',
                  borderColor: isActive ? '#111' : '#e5e7eb',
                  background: isActive ? '#111' : 'transparent',
                  color: isActive ? '#fff' : '#6b7280',
                  fontSize: 13, fontWeight: 500, cursor: 'pointer',
                  fontFamily: FONT, display: 'flex', alignItems: 'center', gap: 6,
                  transition: transition.fast,
                }}
              >
                {tab === 'active' ? 'Active' : 'Archived'}
                <span style={{
                  fontSize: 11,
                  background: isActive ? 'rgba(255,255,255,0.2)' : '#f3f4f6',
                  color: isActive ? '#fff' : '#9ca3af',
                  borderRadius: 10, padding: '0 6px',
                }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Thread rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {displayThreads.map(t => (
            <TopicRow
              key={t.id}
              thread={t}
              isArchived={filter === 'archived'}
              menuOpen={openMenu === t.id}
              onToggleMenu={() => setOpenMenu(openMenu === t.id ? null : t.id)}
              onChangeLevel={(level) => updateMonitorLevel(t.id, level)}
              onArchive={() => archiveThread(t.id)}
              onReactivate={() => reactivateThread(t.id)}
              onNavigate={() => navigate(`/?thread=${t.id}`)}
            />
          ))}
          {displayThreads.length === 0 && (
            <div style={{
              textAlign: 'center', padding: '48px 24px',
              color: colors.text.muted.light, fontSize: 14,
            }}>
              {filter === 'active'
                ? 'No active topics. Add one below or accept a suggestion.'
                : 'No archived topics.'}
            </div>
          )}
        </div>

        {/* Proactive suggestions — active tab only */}
        {filter === 'active' && suggestions.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <div style={{
              fontSize: 10, letterSpacing: '0.1em', color: '#c4c4c4',
              textTransform: 'uppercase', fontWeight: 600, marginBottom: 12,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{ fontSize: 11, opacity: 0.7 }}>✦</span>
              Suggested by AUO
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {suggestions.map(s => (
                <SuggestionRow
                  key={s.id}
                  suggestion={s}
                  onAccept={async () => {
                    const threadId = await acceptSuggestion(s.id);
                    if (threadId) loadThreads();
                  }}
                  onDismiss={() => dismissSuggestion(s.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Agent chat — active tab only */}
        {filter === 'active' && (
          <div style={{ marginTop: 32, borderTop: '1px solid #f0f0f0', paddingTop: 24 }}>
            <div style={{
              fontSize: 10, letterSpacing: '0.1em', color: '#c4c4c4',
              textTransform: 'uppercase', fontWeight: 600, marginBottom: 12,
            }}>
              Ask AUO for topic ideas
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAgentChat()}
                placeholder="e.g. What should I watch in sourcing?"
                style={{
                  flex: 1, padding: '10px 14px', fontSize: 13,
                  border: '1px solid #e5e7eb', borderRadius: 10,
                  background: '#fafafa', outline: 'none', fontFamily: FONT,
                  color: colors.text.primary.light,
                }}
              />
              <button
                onClick={handleAgentChat}
                disabled={chatState === 'thinking' || !chatInput.trim()}
                style={{
                  padding: '10px 20px', background: '#111', color: '#fff',
                  border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 500,
                  cursor: 'pointer', fontFamily: FONT,
                  opacity: chatState === 'thinking' || !chatInput.trim() ? 0.4 : 1,
                }}
              >
                {chatState === 'thinking' ? '...' : 'Ask'}
              </button>
            </div>

            {/* Agent response */}
            {chatState === 'thinking' && (
              <div style={{
                marginTop: 16, padding: '14px 16px', borderRadius: 10,
                background: '#f9fafb', fontSize: 13, color: '#9ca3af',
                fontStyle: 'italic',
              }}>
                Thinking...
              </div>
            )}

            {chatState === 'responded' && agentMessage && (
              <div style={{
                marginTop: 16, padding: '14px 16px', borderRadius: 10,
                background: '#f9fafb', fontSize: 13, color: '#374151',
                lineHeight: 1.6,
              }}>
                {agentMessage}
              </div>
            )}

            {/* Agent suggestion cards */}
            {agentSuggestions.length > 0 && (
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {agentSuggestions.map((s, i) => {
                  const key = `${s.title}-${i}`;
                  const isAdded = addedIds.has(key);
                  return (
                    <div key={key} style={{
                      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                      padding: '12px 14px', borderRadius: 10,
                      border: `1px solid ${isAdded ? '#dcfce7' : '#f3f4f6'}`,
                      background: isAdded ? '#f0fdf4' : '#fafafa',
                      gap: 12,
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                          <div style={{
                            width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                            background: CAT_COLOR[s.category] || '#d1d5db',
                          }} />
                          <span style={{
                            fontSize: 10, fontWeight: 600, letterSpacing: '0.05em',
                            color: CAT_COLOR[s.category] || '#9ca3af',
                          }}>
                            {s.category}
                          </span>
                        </div>
                        <div style={{
                          fontSize: 13, fontWeight: 450, color: '#111',
                          letterSpacing: '-0.01em', marginBottom: 3,
                        }}>
                          {s.title}
                        </div>
                        <div style={{ fontSize: 11, color: '#9ca3af', lineHeight: 1.5 }}>
                          {s.reason}
                        </div>
                      </div>
                      <button
                        onClick={async () => {
                          if (isAdded) return;
                          const result = await addTopic(s.title);
                          if (result) setAddedIds(prev => new Set(prev).add(key));
                        }}
                        disabled={isAdded}
                        style={{
                          padding: '6px 14px', flexShrink: 0,
                          background: isAdded ? '#dcfce7' : '#111',
                          color: isAdded ? '#16a34a' : '#fff',
                          border: 'none', borderRadius: 8,
                          fontSize: 12, fontWeight: 500, cursor: isAdded ? 'default' : 'pointer',
                          fontFamily: FONT,
                        }}
                      >
                        {isAdded ? '✓ Added' : 'Track'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── TopicRow ───────────────────────────────────────────────────────────────

function TopicRow({
  thread,
  isArchived,
  menuOpen,
  onToggleMenu,
  onChangeLevel,
  onArchive,
  onReactivate,
  onNavigate,
}: {
  thread: ThreadRow;
  isArchived: boolean;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onChangeLevel: (level: string) => void;
  onArchive: () => void;
  onReactivate: () => void;
  onNavigate: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const mon = MONITOR[thread.monitor_level] || MONITOR.standard;
  const category = (thread.category || thread.lens || '').toUpperCase().replace(/_/g, ' ');
  const catColor = CAT_COLOR[category] || CAT_COLOR[(thread.lens || '').toUpperCase()] || '#d1d5db';

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 14px', borderRadius: 10,
        border: '1px solid #f3f4f6',
        background: hovered && !isArchived ? '#fafafa' : 'transparent',
        opacity: isArchived ? 0.5 : 1,
        transition: transition.fast,
        cursor: isArchived ? 'default' : 'pointer',
        gap: 12,
      }}
      onClick={isArchived ? undefined : onNavigate}
    >
      {/* Category accent */}
      <div style={{
        width: 2, borderRadius: 2, flexShrink: 0, alignSelf: 'stretch',
        background: catColor, minHeight: 36,
      }} />

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14, fontWeight: 450, color: '#111',
          letterSpacing: '-0.01em', marginBottom: 3,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {thread.title}
        </div>
        <div style={{
          fontSize: 11, color: '#9ca3af', display: 'flex',
          alignItems: 'center', gap: 6,
        }}>
          {thread.insight_count > 0 && (
            <span>{thread.insight_count} insight{thread.insight_count !== 1 ? 's' : ''}</span>
          )}
          {thread.insight_count > 0 && thread.last_signal_at && (
            <span style={{ color: '#d1d5db' }}>·</span>
          )}
          {thread.last_signal_at && (
            <span>{formatRelativeTime(thread.last_signal_at)}</span>
          )}
          {category && (
            <>
              <span style={{ color: '#d1d5db' }}>·</span>
              <span style={{ color: catColor, fontSize: 10, fontWeight: 600, letterSpacing: '0.04em' }}>
                {formatLens(thread.lens || '')}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Monitor badge / Reactivate */}
      {isArchived ? (
        <button
          onClick={(e) => { e.stopPropagation(); onReactivate(); }}
          style={{
            padding: '5px 12px', fontSize: 12, fontWeight: 500,
            background: 'none', border: '1px solid #e5e7eb',
            borderRadius: 7, color: '#6b7280', cursor: 'pointer',
            fontFamily: FONT,
          }}
        >
          Reactivate
        </button>
      ) : (
        <div data-menu style={{ position: 'relative', flexShrink: 0 }}>
          <button
            onClick={(e) => { e.stopPropagation(); onToggleMenu(); }}
            style={{
              padding: '4px 10px', borderRadius: 6,
              border: '1px solid #e5e7eb', background: '#fff',
              fontSize: 11, fontWeight: 500, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 5,
              color: mon.color === '#d1d5db' ? '#9ca3af' : mon.color,
              fontFamily: FONT,
            }}
          >
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: mon.color, flexShrink: 0,
            }} />
            {mon.label}
          </button>

          {menuOpen && (
            <div style={{
              position: 'absolute', top: '100%', right: 0, marginTop: 4,
              background: '#fff', border: '1px solid #e5e7eb',
              borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
              minWidth: 190, zIndex: 50, overflow: 'hidden',
            }}>
              {Object.entries(MONITOR).map(([key, m]) => {
                const isSelected = thread.monitor_level === key;
                return (
                  <button
                    key={key}
                    onClick={(e) => { e.stopPropagation(); onChangeLevel(key); }}
                    style={{
                      width: '100%', textAlign: 'left',
                      padding: '10px 14px', border: 'none',
                      background: isSelected ? '#f9fafb' : 'transparent',
                      cursor: 'pointer', fontFamily: FONT,
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f3f4f6')}
                    onMouseLeave={e => (e.currentTarget.style.background = isSelected ? '#f9fafb' : 'transparent')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: m.color, flexShrink: 0,
                      }} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: '#111' }}>
                          {m.label}
                        </div>
                        <div style={{ fontSize: 11, color: '#9ca3af' }}>
                          {m.freq}
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <span style={{ fontSize: 13, color: '#111' }}>✓</span>
                    )}
                  </button>
                );
              })}
              <div style={{ height: 1, background: '#f0f0f0' }} />
              <button
                onClick={(e) => { e.stopPropagation(); onArchive(); }}
                style={{
                  width: '100%', textAlign: 'left',
                  padding: '10px 14px', border: 'none',
                  background: 'transparent', cursor: 'pointer', fontFamily: FONT,
                  fontSize: 13, color: '#ef4444',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.05)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                Archive topic
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── SuggestionRow ──────────────────────────────────────────────────────────

function SuggestionRow({
  suggestion,
  onAccept,
  onDismiss,
}: {
  suggestion: TopicSuggestion;
  onAccept: () => void;
  onDismiss: () => void;
}) {
  const [accepting, setAccepting] = useState(false);
  const catColor = CAT_COLOR[suggestion.category] || '#d1d5db';

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      padding: '12px 14px', borderRadius: 10,
      border: '1px solid #f3f4f6', background: '#fafafa',
      gap: 12,
    }}>
      <div style={{ display: 'flex', gap: 10, flex: 1, minWidth: 0 }}>
        <div style={{
          width: 2, borderRadius: 2, flexShrink: 0, alignSelf: 'stretch',
          background: catColor, minHeight: 32,
        }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 13, fontWeight: 450, color: '#111',
            letterSpacing: '-0.01em', marginBottom: 2,
          }}>
            {suggestion.title}
          </div>
          <div style={{ fontSize: 11, color: '#9ca3af', lineHeight: 1.5 }}>
            {suggestion.reason}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <button
          onClick={async () => {
            setAccepting(true);
            await onAccept();
          }}
          disabled={accepting}
          style={{
            padding: '5px 12px', background: '#111', color: '#fff',
            border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 500,
            cursor: 'pointer', opacity: accepting ? 0.6 : 1,
            fontFamily: FONT,
          }}
        >
          {accepting ? '...' : 'Track'}
        </button>
        <button
          onClick={onDismiss}
          style={{
            padding: '5px 8px', background: 'none',
            border: '1px solid #e5e7eb', borderRadius: 7,
            fontSize: 12, color: '#9ca3af', cursor: 'pointer',
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}
