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

export function ChatView() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const conversationIdRef = useRef<string>(crypto.randomUUID());

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
        // Use the most recent conversation_id
        conversationIdRef.current = data[0].conversation_id;
        // Filter to that conversation and reverse for display
        const convoMessages = data
          .filter(m => m.conversation_id === conversationIdRef.current)
          .reverse();
        setMessages(convoMessages as ChatMessage[]);
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

  const sendMessage = useCallback(async () => {
    if (!input.trim() || !user || streaming) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setStreaming(true);

    // Persist user message
    await supabase.from('chat_messages').insert({
      id: userMsg.id,
      user_id: user.id,
      conversation_id: conversationIdRef.current,
      role: 'user',
      content: userMsg.content,
    });

    // Placeholder assistant response (SSE integration to be wired)
    const assistantMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: "I'm AUO, your strategic intelligence analyst. SSE streaming will be connected to the Modal Responder endpoint. For now, navigate to the **Insights** tab to explore your tier-scored intelligence.",
      created_at: new Date().toISOString(),
    };

    // Simulate typing delay
    setTimeout(async () => {
      setMessages(prev => [...prev, assistantMsg]);
      setStreaming(false);

      // Persist assistant message
      await supabase.from('chat_messages').insert({
        id: assistantMsg.id,
        user_id: user.id,
        conversation_id: conversationIdRef.current,
        role: 'assistant',
        content: assistantMsg.content,
      });
    }, 800);
  }, [input, user, streaming]);

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
          ) : messages.length === 0 ? (
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
          {streaming && (
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

/** Simple markdown-like rendering for bold and lists */
function MarkdownLite({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        // Bold: **text**
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        const rendered = parts.map((part, j) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={j} className="font-semibold">{part.slice(2, -2)}</strong>;
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

        return <p key={i}>{rendered}</p>;
      })}
    </div>
  );
}
