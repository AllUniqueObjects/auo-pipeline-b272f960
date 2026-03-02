import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { typography, transition } from '../design-tokens';

const FONT = typography.fontFamily;

type Message = { role: 'user' | 'auo'; content: string };

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

// ─── Lens inference ──────────────────────────────────────────────────────────
function inferLens(title: string): string {
  const t = title.toLowerCase();
  if (t.includes('certif') || t.includes('bluesign') || t.includes('material')) return 'textile_innovation';
  if (t.includes('vietnam') || t.includes('indonesia') || t.includes('sourcing') || t.includes('fob')) return 'sourcing';
  if (t.includes('cost') || t.includes('tariff') || t.includes('pricing')) return 'cost_structure';
  if (t.includes('supply') || t.includes('chain') || t.includes('compliance')) return 'supply_chain';
  return 'sourcing';
}

export function TopicChatBox({ onThreadCreated }: TopicChatBoxProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [proposedTopic, setProposedTopic] = useState<string | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [isAdded, setIsAdded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async (overrideMessage?: string) => {
    const userMessage = overrideMessage || input.trim();
    if (!userMessage || isLoading) return;

    setInput('');
    setOptions([]);

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

      // Check for duplicates
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

      // Trigger scan (non-blocking)
      supabase.functions.invoke('scan_priority', { body: { thread_id: thread.id } }).catch(err =>
        console.warn('[TopicChatBox] scan_priority invoke failed:', err)
      );

      setIsAdded(true);
      onThreadCreated({ id: thread.id, title: thread.title, lens: thread.lens, cover_image_url: null });
    } catch (err) {
      console.error('[TopicChatBox] Add topic error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefine = () => {
    setProposedTopic(null);
    // Let user continue chatting
  };

  const handleReset = () => {
    setMessages([]);
    setProposedTopic(null);
    setOptions([]);
    setIsAdded(false);
    setInput('');
  };

  return (
    <div style={{
      border: '1px solid #e8e8e8',
      borderRadius: 12,
      padding: '16px 20px',
      background: '#ffffff',
      marginBottom: 0,
      marginTop: 10,
    }}>
      {/* Label */}
      <div style={{
        fontSize: 13,
        color: isAdded ? '#16a34a' : '#999',
        fontWeight: 500,
        marginBottom: messages.length > 0 || isAdded ? 12 : 0,
        fontFamily: FONT,
        transition: transition.fast,
      }}>
        {isAdded ? '✓ Added — AUO will scan for this' : 'What are you thinking about this week?'}
      </div>

      {/* Added state */}
      {isAdded ? (
        <button
          onClick={handleReset}
          style={{
            fontSize: 13,
            color: '#999',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            fontFamily: FONT,
          }}
        >
          Add another topic
        </button>
      ) : (
        <>
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

          {/* Options buttons */}
          {options.length > 0 && !proposedTopic && !isLoading && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              marginBottom: 12,
            }}>
              {options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(opt)}
                  style={{
                    padding: '10px 14px',
                    background: '#f9f9f9',
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
                    e.currentTarget.style.background = '#f9f9f9';
                    e.currentTarget.style.borderColor = '#e8e8e8';
                  }}
                >
                  {opt}
                </button>
              ))}
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

          {/* Input */}
          {!proposedTopic && options.length === 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
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
                  onClick={handleSend}
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
