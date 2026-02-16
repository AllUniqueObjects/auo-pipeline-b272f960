import { useState, useRef, useEffect, useCallback } from 'react';
import { Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

const SUPABASE_URL = "https://melbptgutajptxhpjeuv.supabase.co";

export function ChatView() {
  const { user, session } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [streaming, setStreaming] = useState(false);
  const [sessionOpened, setSessionOpened] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const conversationIdRef = useRef<string>(crypto.randomUUID());
  const abortRef = useRef<AbortController | null>(null);

  // Load recent messages on mount
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (data && data.length > 0) {
        conversationIdRef.current = data[0].conversation_id;
        const convoMessages = data
          .filter(m => m.conversation_id === conversationIdRef.current)
          .reverse();
        setMessages(convoMessages as ChatMessage[]);
        setSessionOpened(true); // Skip auto-briefing if resuming
      }
      setLoading(false);
    };
    load();
  }, [user]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Send __session_open__ on first load if no history
  useEffect(() => {
    if (!loading && !sessionOpened && user && session) {
      setSessionOpened(true);
      streamFromProxy('__session_open__');
    }
  }, [loading, sessionOpened, user, session]);

  const streamFromProxy = useCallback(async (messageText: string) => {
    if (!user || !session) return;

    setStreaming(true);
    abortRef.current = new AbortController();

    const assistantMsgId = crypto.randomUUID();
    const assistantMsg: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, assistantMsg]);

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/chat-proxy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          message: messageText,
          conversation_id: conversationIdRef.current,
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error('Chat proxy error:', res.status, errText);
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantMsgId
              ? { ...m, content: 'Sorry, I couldn\'t connect to the intelligence engine. Please try again.' }
              : m
          )
        );
        setStreaming(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) { setStreaming(false); return; }

      const decoder = new TextDecoder();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const token = parsed.choices?.[0]?.delta?.content
                || parsed.token
                || parsed.text
                || parsed.content
                || (typeof parsed === 'string' ? parsed : '');
              if (token) {
                fullContent += token;
                setMessages(prev =>
                  prev.map(m =>
                    m.id === assistantMsgId ? { ...m, content: fullContent } : m
                  )
                );
              }
            } catch {
              // Non-JSON SSE data — treat as raw token
              if (data && data !== '[DONE]') {
                fullContent += data;
                setMessages(prev =>
                  prev.map(m =>
                    m.id === assistantMsgId ? { ...m, content: fullContent } : m
                  )
                );
              }
            }
          }
        }
      }

      // Persist assistant message
      if (fullContent.trim()) {
        await supabase.from('chat_messages').insert({
          id: assistantMsgId,
          user_id: user.id,
          conversation_id: conversationIdRef.current,
          role: 'assistant',
          content: fullContent,
        });
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      console.error('Streaming error:', err);
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantMsgId && !m.content
            ? { ...m, content: 'Connection interrupted. Please try again.' }
            : m
        )
      );
    } finally {
      setStreaming(false);
    }
  }, [user, session]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || !user || streaming) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMsg]);
    const messageText = input.trim();
    setInput('');

    // Persist user message
    await supabase.from('chat_messages').insert({
      id: userMsg.id,
      user_id: user.id,
      conversation_id: conversationIdRef.current,
      role: 'user',
      content: userMsg.content,
    });

    streamFromProxy(messageText);
  }, [input, user, streaming, streamFromProxy]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-2xl mx-auto space-y-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <span className="text-sm text-muted-foreground">Loading conversation...</span>
            </div>
          ) : messages.length === 0 && !streaming ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <span className="text-2xl font-semibold tracking-[0.2em] text-foreground mb-2">
                AUO
              </span>
              <p className="text-sm text-muted-foreground max-w-xs">
                Your strategic intelligence analyst. Ask anything about market signals, competitive moves, or decision points.
              </p>
            </div>
          ) : (
            messages.map(msg => (
              <div
                key={msg.id}
                className={cn(
                  'flex',
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                <div
                  className={cn(
                    'max-w-[85%] rounded-lg px-4 py-3 text-sm leading-relaxed',
                    msg.role === 'user'
                      ? 'bg-accent text-foreground'
                      : 'bg-card border border-border text-card-foreground'
                  )}
                >
                  {msg.role === 'assistant' ? (
                    <MarkdownLite text={msg.content} />
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))
          )}
          {streaming && messages[messages.length - 1]?.content === '' && (
            <div className="flex justify-start">
              <div className="bg-card border border-border rounded-lg px-4 py-3">
                <span className="text-sm text-muted-foreground animate-pulse">Thinking...</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input area */}
      <div className="flex-shrink-0 border-t border-border px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask AUO anything..."
            className="flex-1 rounded-lg border border-input bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            disabled={streaming}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || streaming}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-foreground text-background transition-opacity hover:opacity-80 disabled:opacity-30"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/** Simple markdown-like rendering for bold, lists, and inline code */
function MarkdownLite({ text }: { text: string }) {
  if (!text) return null;
  const lines = text.split('\n');
  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        // Bold: **text**
        const parts = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
        const rendered = parts.map((part, j) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={j} className="font-semibold">{part.slice(2, -2)}</strong>;
          }
          if (part.startsWith('`') && part.endsWith('`')) {
            return <code key={j} className="rounded bg-muted px-1 py-0.5 text-xs font-mono">{part.slice(1, -1)}</code>;
          }
          return <span key={j}>{part}</span>;
        });

        // List items
        if (line.trim().startsWith('- ') || line.trim().startsWith('• ')) {
          return (
            <div key={i} className="flex gap-2 pl-1">
              <span className="text-muted-foreground">•</span>
              <span>{rendered}</span>
            </div>
          );
        }

        // Numbered list
        if (/^\d+\.\s/.test(line.trim())) {
          const num = line.trim().match(/^(\d+)\./)?.[1];
          return (
            <div key={i} className="flex gap-2 pl-1">
              <span className="text-muted-foreground text-xs min-w-[1rem]">{num}.</span>
              <span>{rendered}</span>
            </div>
          );
        }

        if (!line.trim()) return <div key={i} className="h-2" />;
        return <p key={i}>{rendered}</p>;
      })}
    </div>
  );
}
