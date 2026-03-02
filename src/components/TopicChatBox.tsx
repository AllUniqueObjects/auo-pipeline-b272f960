import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { typography, transition } from '../design-tokens';

const FONT = typography.fontFamily;

type Message = { role: 'user' | 'auo'; content: string };

interface ConversationRecord {
  id: string;
  messages: Message[];
  addedTopic: string;
  timestamp: number;
}

interface TopicChatBoxProps {
  onThreadCreated: (thread: { id: string; title: string; lens: string; cover_image_url: string | null }) => void;
}

interface AgentResponse {
  reply: string;
  proposed_topic: string | null;
  options: string[];
}

async function agentReply(messages: Message[], userId?: string): Promise<AgentResponse> {
  try {
    const res = await fetch('/api/topic-agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, userId }),
    });
    if (res.ok) {
      const data = await res.json();
      return { ...data, options: data.options || [] };
    }
  } catch {
    // fall through to mock
  }

  // Mock fallback
  const last = messages[messages.length - 1].content;
  if (messages.filter(m => m.role === 'user').length === 1) {
    return {
      reply: `Got it — "${last}". Are you focused on a specific season, region, or decision deadline?`,
      proposed_topic: null,
      options: [],
    };
  }
  const first = messages.find(m => m.role === 'user')!.content;
  const combined = `${first} — ${last}`;
  return {
    reply: `I'll track this as: "${combined}"`,
    proposed_topic: combined,
    options: [],
  };
}

function inferLens(title: string): string {
  const t = title.toLowerCase();
  if (t.includes('certif') || t.includes('bluesign') || t.includes('material')) return 'textile_innovation';
  if (t.includes('vietnam') || t.includes('indonesia') || t.includes('sourcing') || t.includes('fob')) return 'sourcing';
  if (t.includes('cost') || t.includes('tariff') || t.includes('pricing')) return 'cost_structure';
  if (t.includes('supply') || t.includes('chain') || t.includes('compliance')) return 'supply_chain';
  return 'sourcing';
}

// ─── localStorage history helpers ────────────────────────────────────────────
const HISTORY_KEY = 'auo_topic_history';
const HISTORY_TTL = 86400000; // 24h
const HISTORY_MAX = 3;

function loadHistory(): ConversationRecord[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const records: ConversationRecord[] = JSON.parse(raw);
    return records.filter(r => Date.now() - r.timestamp < HISTORY_TTL).slice(0, HISTORY_MAX);
  } catch {
    return [];
  }
}

function saveHistory(topic: string, msgs: Message[]) {
  const existing = loadHistory();
  const record: ConversationRecord = {
    id: crypto.randomUUID(),
    messages: msgs,
    addedTopic: topic,
    timestamp: Date.now(),
  };
  const updated = [record, ...existing].slice(0, HISTORY_MAX);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
}

// ─── Component ───────────────────────────────────────────────────────────────
export function TopicChatBox({ onThreadCreated }: TopicChatBoxProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [proposedTopic, setProposedTopic] = useState<string | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [addedTopic, setAddedTopic] = useState<string | null>(null);
  const [isRefining, setIsRefining] = useState(false);
  const [refineInput, setRefineInput] = useState('');
  const [history, setHistory] = useState<ConversationRecord[]>(() => loadHistory());
  const [historyOpen, setHistoryOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const refineRef = useRef<HTMLInputElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Focus refine input when entering refine mode
  useEffect(() => {
    if (isRefining) {
      setTimeout(() => refineRef.current?.focus(), 0);
    }
  }, [isRefining]);

  const handleSend = async (overrideMessage?: string) => {
    const userMessage = overrideMessage || input.trim();
    if (!userMessage || isLoading) return;

    setInput('');
    setOptions([]);
    setIsRefining(false);
    setRefineInput('');

    const newMessages: Message[] = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const data = await agentReply(newMessages, user?.id);
      setMessages([...newMessages, { role: 'auo', content: data.reply }]);
      if (data.proposed_topic) {
        setProposedTopic(data.proposed_topic);
      }
      if (data.options && data.options.length > 0) {
        setOptions(data.options);
      }
    } catch {
      setMessages([...newMessages, {
        role: 'auo',
        content: "Sorry, I had trouble understanding that. Can you rephrase?",
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!proposedTopic) return;
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('[TopicChatBox] Not authenticated');
        setIsLoading(false);
        return;
      }

      // Duplicate check
      const searchWords = proposedTopic.split(' ').slice(0, 4).join('%');
      const { data: existing } = await (supabase as any)
        .from('decision_threads')
        .select('id, title')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .ilike('title', `%${searchWords}%`)
        .limit(1);

      if (existing && existing.length > 0) {
        setMessages(prev => [...prev, { role: 'auo', content: `This looks similar to "${existing[0].title}" which you're already tracking.` }]);
        setProposedTopic(null);
        setIsLoading(false);
        return;
      }

      const lens = inferLens(proposedTopic);
      const { data: thread, error } = await (supabase as any)
        .from('decision_threads')
        .insert({
          user_id: user.id,
          title: proposedTopic,
          key_question: `What should I know about: ${proposedTopic}?`,
          lens,
          status: 'active',
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error || !thread) {
        console.error('[TopicChatBox] Failed to create thread:', error);
        setIsLoading(false);
        return;
      }

      // Trigger scan via edge function (non-blocking)
      supabase.functions.invoke('scan_priority', { body: { thread_id: thread.id } }).catch(err =>
        console.warn('[TopicChatBox] scan_priority invoke failed:', err)
      );

      // Also trigger Modal scan if configured
      const scanUrl = import.meta.env.VITE_MODAL_SCAN_PRIORITY_URL;
      if (scanUrl) {
        fetch(scanUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ thread_id: thread.id, user_id: user.id, topic: proposedTopic }),
        }).catch(() => {});
      }

      // Save to history
      saveHistory(proposedTopic, messages);
      setHistory(loadHistory());

      // Show success state
      setAddedTopic(proposedTopic);
      onThreadCreated({ id: thread.id, title: thread.title, lens: thread.lens, cover_image_url: null });
    } catch (err) {
      console.error('[TopicChatBox] Add topic error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefine = () => {
    setIsRefining(true);
    setRefineInput(proposedTopic || '');
    setProposedTopic(null);
    setOptions([]);
  };

  const handleReset = () => {
    setMessages([]);
    setProposedTopic(null);
    setOptions([]);
    setAddedTopic(null);
    setIsRefining(false);
    setRefineInput('');
    setInput('');
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{
      border: '1px solid #e8e8e8',
      borderRadius: 12,
      padding: '16px 20px',
      background: '#ffffff',
      marginBottom: 0,
      marginTop: 10,
    }}>

      {/* ── Success state ── */}
      {addedTopic ? (
        <div>
          <div style={{ fontSize: 13, color: '#999', marginBottom: 6, fontFamily: FONT }}>
            ✓ AUO is now tracking
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#111', marginBottom: 16, fontFamily: FONT }}>
            &ldquo;{addedTopic}&rdquo;
          </div>
          <button
            onClick={handleReset}
            style={{
              fontSize: 13,
              color: '#666',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              fontFamily: FONT,
            }}
          >
            + Track another topic
          </button>
        </div>
      ) : (
        <>
          {/* Label */}
          <div style={{
            fontSize: 13,
            color: '#999',
            fontWeight: 500,
            marginBottom: messages.length > 0 ? 12 : 0,
            fontFamily: FONT,
            transition: transition.fast,
          }}>
            What are you thinking about this week?
          </div>

          {/* History toggle (only when idle) */}
          {history.length > 0 && messages.length === 0 && !isRefining && (
            <div style={{ marginBottom: 12, marginTop: 8 }}>
              <button
                onClick={() => setHistoryOpen(!historyOpen)}
                style={{
                  fontSize: 12,
                  color: '#999',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  fontFamily: FONT,
                }}
              >
                {historyOpen ? '▾' : '▸'} {history.length} recent {history.length === 1 ? 'topic' : 'topics'}
              </button>

              {historyOpen && (
                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {history.map(record => (
                    <div key={record.id} style={{
                      fontSize: 13,
                      color: '#666',
                      padding: '6px 0',
                      borderBottom: '1px solid #f0f0f0',
                      fontFamily: FONT,
                    }}>
                      <span style={{ color: '#999', marginRight: 6 }}>✓</span>
                      {record.addedTopic}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Message history */}
          {messages.length > 0 && (
            <div
              ref={scrollRef}
              style={{
                marginBottom: 12,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                maxHeight: 240,
                overflowY: 'auto',
              }}
            >
              {messages.map((msg, i) => (
                <div key={i} style={{
                  fontSize: 14,
                  color: msg.role === 'user' ? '#111' : '#444',
                  lineHeight: 1.5,
                  fontFamily: FONT,
                }}>
                  {msg.role === 'user' ? (
                    <span style={{ color: '#999', marginRight: 6 }}>You:</span>
                  ) : (
                    <span style={{ color: '#111', fontWeight: 600, marginRight: 6 }}>AUO:</span>
                  )}
                  {msg.content}
                </div>
              ))}
              {isLoading && !proposedTopic && (
                <div style={{ fontSize: 13, color: '#bbb', fontFamily: FONT }}>AUO is thinking...</div>
              )}
            </div>
          )}

          {/* Option pills */}
          {options.length > 0 && !proposedTopic && !isLoading && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              marginTop: 8,
              marginBottom: 12,
            }}>
              {options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(opt)}
                  style={{
                    padding: '10px 14px',
                    background: '#fafafa',
                    border: '1px solid #e8e8e8',
                    borderRadius: 8,
                    fontSize: 14,
                    color: '#111',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: FONT,
                    transition: transition.fast,
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = '#f0f0f0';
                    e.currentTarget.style.borderColor = '#ccc';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = '#fafafa';
                    e.currentTarget.style.borderColor = '#e8e8e8';
                  }}
                >
                  {opt}
                </button>
              ))}
              <button
                onClick={() => {
                  setOptions([]);
                  setTimeout(() => inputRef.current?.focus(), 0);
                }}
                style={{
                  padding: '10px 14px',
                  background: 'transparent',
                  border: '1px solid #e8e8e8',
                  borderRadius: 8,
                  fontSize: 14,
                  color: '#999',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: FONT,
                }}
              >
                Something else...
              </button>
            </div>
          )}

          {/* Proposed topic card */}
          {proposedTopic && !isLoading && (
            <div style={{
              background: '#f9f9f9',
              borderRadius: 8,
              padding: '12px 14px',
              marginBottom: 12,
              border: '1px solid #e8e8e8',
            }}>
              <div style={{ fontSize: 12, color: '#999', marginBottom: 4, fontFamily: FONT }}>I'll track this as:</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#111', marginBottom: 12, fontFamily: FONT }}>
                &ldquo;{proposedTopic}&rdquo;
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={handleAdd}
                  style={{
                    padding: '8px 16px',
                    background: '#111',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: FONT,
                  }}
                >
                  + Add to my topics
                </button>
                <button
                  onClick={handleRefine}
                  style={{
                    padding: '8px 16px',
                    background: 'transparent',
                    color: '#666',
                    border: '1px solid #e8e8e8',
                    borderRadius: 8,
                    fontSize: 13,
                    cursor: 'pointer',
                    fontFamily: FONT,
                  }}
                >
                  Refine
                </button>
              </div>
            </div>
          )}

          {/* Refine input */}
          {isRefining && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 13, color: '#999', marginBottom: 8, fontFamily: FONT }}>
                What would you like to adjust?
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  ref={refineRef}
                  value={refineInput}
                  onChange={e => setRefineInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && refineInput.trim()) {
                      handleSend(refineInput.trim());
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: '1px solid #e8e8e8',
                    fontSize: 14,
                    fontFamily: FONT,
                    outline: 'none',
                    color: '#111',
                  }}
                />
              </div>
            </div>
          )}

          {/* Normal input (hide when proposal or options or refine showing) */}
          {!proposedTopic && options.length === 0 && !isRefining && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                ref={inputRef}
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  fontSize: 15,
                  color: '#111',
                  background: 'transparent',
                  fontFamily: FONT,
                  padding: 0,
                }}
                placeholder={messages.length === 0 ? "Type a topic or decision you're working on..." : "Your answer..."}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                disabled={isLoading}
              />
              {input.trim() && (
                <button
                  onClick={() => handleSend()}
                  disabled={isLoading}
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#111',
                    background: 'none',
                    border: 'none',
                    cursor: isLoading ? 'default' : 'pointer',
                    padding: 0,
                    fontFamily: FONT,
                    flexShrink: 0,
                  }}
                >
                  {isLoading ? '...' : 'Send'}
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
