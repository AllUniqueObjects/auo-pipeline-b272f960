import { useState, useRef, useEffect } from 'react';
import { Send, ChevronDown, ChevronUp, BarChart3, ChevronsLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type MockChatMessage } from '@/data/mock';
import { LiveSignalSurface } from '@/components/views/LiveSignalSurface';
import { supabase } from '@/integrations/supabase/client';

const TIER_DOT: Record<string, string> = {
  breaking: 'bg-tier-breaking',
  developing: 'bg-tier-developing',
  established: 'bg-tier-established',
};

const TIER_LABEL: Record<string, string> = {
  breaking: 'text-tier-breaking',
  developing: 'text-tier-developing',
  established: 'text-tier-established',
};

interface ChatViewProps {
  onOpenSignals?: () => void;
  onBuildPosition?: () => void;
  onConversationId?: (id: string) => void;
  messages: MockChatMessage[];
  onAppendMessage: (msg: MockChatMessage) => void;
  showLiveSignal?: boolean;
  onCollapse?: () => void;
  onOpenInsight?: (insightId: string) => void;
  isBuildingPosition?: boolean;
}

export function ChatView({
  onOpenSignals,
  onBuildPosition,
  onConversationId,
  messages,
  onAppendMessage,
  showLiveSignal = false,
  onCollapse,
  onOpenInsight,
  isBuildingPosition = false,
}: ChatViewProps) {

  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [inputExpanded, setInputExpanded] = useState(true);
  const [liveVisible, setLiveVisible] = useState(showLiveSignal);
  // Streaming state – rendered locally until "done" fires
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  // Position build state
  const [showBuildButton, setShowBuildButton] = useState(false);
  const lastConversationIdRef = useRef<string | null>(null);
  // Error state
  const [sendError, setSendError] = useState(false);
  const lastFailedTextRef = useRef<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setLiveVisible(showLiveSignal);
  }, [showLiveSignal]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, typing, streamingText]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  const resetTextareaHeight = () => {
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const adjustHeight = () => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = 'auto';
    if (inputExpanded) {
      const h = Math.min(textareaRef.current.scrollHeight, 120);
      textareaRef.current.style.height = `${h}px`;
    } else {
      textareaRef.current.style.height = '38px';
    }
  };

  useEffect(() => { adjustHeight(); }, [inputExpanded]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    adjustHeight();
  };

  const handleSend = async (retryText?: string) => {
    const text = retryText ?? input.trim();
    if (!text || typing || isStreaming) return;

    setSendError(false);
    lastFailedTextRef.current = null;

    const userMsg: MockChatMessage = { id: crypto.randomUUID(), role: 'user', content: text };
    onAppendMessage(userMsg);
    if (!retryText) setInput('');
    resetTextareaHeight();

    const responderUrl = import.meta.env.VITE_RESPONDER_URL;

    // Fallback to mock if no URL configured
    if (!responderUrl) {
      setTyping(true);
      setTimeout(() => {
        onAppendMessage({
          id: crypto.randomUUID(),
          role: 'assistant',
          content: "I'll pull the relevant signals on that. Give me a moment to cross-reference the latest data points.",
        });
        setTyping(false);
      }, 1500);
      return;
    }

    // Build history from current messages (before appending the new user msg)
    const history = messages.map(m => ({ role: m.role, content: m.content }));

    // Abort any in-flight request
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setTyping(true);
    setStreamingText('');
    setIsStreaming(false);

    try {
      const userId = localStorage.getItem('userId') ?? undefined;
      const response = await fetch(responderUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history, session_type: 'follow_up', user_id: userId }),
        signal: abortRef.current.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulated = '';

      setTyping(false);
      setIsStreaming(true);

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const raw = line.slice(6);
            let parsed: Record<string, unknown> = {};
            try { parsed = JSON.parse(raw); } catch { continue; }

            if (parsed.type === 'token') {
              accumulated += (parsed.content as string) ?? '';
              setStreamingText(accumulated);
            } else if (parsed.type === 'done') {
                const finalMsg: MockChatMessage = {
                  id: crypto.randomUUID(),
                  role: 'assistant',
                  content: accumulated || '',
                };
                onAppendMessage(finalMsg);

                // Capture conversation_id locally and bubble up to Dashboard
                if (parsed.conversation_id) {
                  lastConversationIdRef.current = parsed.conversation_id as string;
                  if (onConversationId) onConversationId(parsed.conversation_id as string);
                }

                // Show build button if position was triggered — user must click
                if (parsed.position_triggered === true) {
                  setShowBuildButton(true);
                }

                setIsStreaming(false);
                setStreamingText('');
                accumulated = '';
            } else if (parsed.type === 'error') {
              throw new Error((parsed.message as string) ?? 'Stream error');
            }
          }
        }
      }

      // If stream ended without a done event, commit whatever was accumulated
      if (accumulated) {
        onAppendMessage({ id: crypto.randomUUID(), role: 'assistant', content: accumulated });
        setIsStreaming(false);
        setStreamingText('');
      }

    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      console.error('ChatView fetch error:', err);
      setSendError(true);
      lastFailedTextRef.current = text;
      setTyping(false);
      setIsStreaming(false);
      setStreamingText('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleBuildPositionClick = async () => {
    setShowBuildButton(false);
    // Tell Dashboard to enter 'generating' state and subscribe to realtime
    onBuildPosition?.();

    const positionUrl = import.meta.env.VITE_POSITION_GENERATOR_URL
      || 'https://auo-api-proxy.dan-kim.workers.dev/position';

    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id ?? null;

    try {
      await fetch(positionUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          conversation_id: lastConversationIdRef.current ?? null,
          messages: messages.map(m => ({ role: m.role, content: m.content })),
        }),
      });
    } catch (err) {
      // Dashboard's isGenerating will handle timeout fallback
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-border">
        <div className="flex items-center gap-2">
          {onCollapse && (
            <button
              onClick={onCollapse}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
              aria-label="Collapse chat"
            >
              <ChevronsLeft className="h-3.5 w-3.5" />
            </button>
          )}
          <span className="text-sm font-semibold tracking-[0.15em] text-foreground">AUO</span>
        </div>
        <button
          onClick={onOpenSignals}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
        >
          <BarChart3 className="h-3.5 w-3.5" />
          Signals
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6">
        <div className="space-y-5">
          {messages.map((msg, idx) => {
            // Attach build button to the last assistant message
            const isLastAssistant = showBuildButton && msg.role === 'assistant' &&
              !messages.slice(idx + 1).some(m => m.role === 'assistant');
            return (
              <MessageBubble
                key={msg.id}
                message={msg}
                onBuildPosition={onBuildPosition}
                onOpenInsight={onOpenInsight}
                showInlineBuild={isLastAssistant}
                onBuildClick={handleBuildPositionClick}
              />
            );
          })}

          {/* Typing indicator — visible until first token arrives */}
          {typing && <TypingIndicator />}

          {/* Streaming bubble */}
          {isStreaming && streamingText && (
            <div className="flex flex-col items-start">
              <span className="text-[10px] font-medium uppercase tracking-wider mb-1 px-1 text-muted-foreground">AUO</span>
              <div className="max-w-[85%] rounded-lg px-4 py-3 text-sm leading-relaxed break-words bg-card border border-border text-card-foreground">
                <MarkdownLite text={streamingText} />
              </div>
            </div>
          )}

          {/* Building indicator */}
          {isBuildingPosition && (
            <div className="flex justify-end">
              <span className="text-xs text-muted-foreground italic">Building position…</span>
            </div>
          )}
        </div>
      </div>

      {/* LiveSignalSurface + Input */}
      <div className="flex-shrink-0">
        {liveVisible && (
          <LiveSignalSurface onDismiss={() => setLiveVisible(false)} />
        )}
        <div className="border-t border-border px-4 py-3">
          {/* Send error */}
          {sendError && (
            <div className="flex items-center gap-2 mb-2 px-1">
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#c0392b' }} />
              <span className="text-xs" style={{ color: '#c0392b' }}>
                Unable to reach AUO. Check your connection and try again.
              </span>
              <button
                onClick={() => {
                  if (lastFailedTextRef.current) handleSend(lastFailedTextRef.current);
                }}
                className="text-xs font-medium underline ml-auto"
                style={{ color: '#c0392b' }}
              >
                Retry
              </button>
            </div>
          )}
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Reply to AUO..."
              rows={1}
              disabled={typing || isStreaming}
              className="flex-1 bg-card border border-border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none overflow-y-auto disabled:opacity-50"
              style={{ maxHeight: inputExpanded ? '120px' : '38px' }}
            />
            <button
              onClick={() => setInputExpanded(!inputExpanded)}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
            >
              {inputExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </button>
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || typing || isStreaming}
              className="p-2.5 rounded-lg bg-accent text-foreground hover:bg-accent/80 transition-colors disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  onBuildPosition,
  onOpenInsight,
  showInlineBuild,
  onBuildClick,
}: {
  message: MockChatMessage;
  onBuildPosition?: () => void;
  onOpenInsight?: (insightId: string) => void;
  showInlineBuild?: boolean;
  onBuildClick?: () => void;
}) {
  const isUser = message.role === 'user';
  const labelText = isUser ? 'David' : (message.isContextGap ? 'AUO · context' : 'AUO');

  return (
    <div className={cn('flex flex-col', isUser ? 'items-end' : 'items-start')}>
      <span className="text-[10px] font-medium uppercase tracking-wider mb-1 px-1 text-muted-foreground">
        {labelText}
      </span>
      <div
        className={cn(
          'max-w-[85%] rounded-lg px-4 py-3 text-sm leading-relaxed break-words',
          isUser
            ? 'bg-accent text-accent-foreground'
            : 'bg-card border border-border text-card-foreground',
          message.isContextGap && !isUser && 'border-b-[2px] border-b-emerging/40'
        )}
      >
        <MarkdownLite text={message.content} />

        {/* Inline signal card */}
        {message.signalCard && (
          <div className="mt-3 rounded-lg border border-border bg-background/60 px-3 py-2.5">
            <div className="flex items-center gap-2 mb-1.5">
              <span className={cn('h-2 w-2 rounded-full flex-shrink-0', TIER_DOT[message.signalCard.tier])} />
              <span className={cn('text-[10px] font-bold uppercase tracking-wider', TIER_LABEL[message.signalCard.tier])}>
                {message.signalCard.tier.toUpperCase()} · {message.signalCard.category.toUpperCase()}
              </span>
            </div>
            <p className="text-xs font-medium text-foreground leading-snug mb-2">
              {message.signalCard.title}
            </p>
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-muted-foreground">
                {message.signalCard.sources} sources
              </span>
              <div className="flex items-center gap-1.5 flex-1">
                <span className="text-[10px] text-muted-foreground">Credibility</span>
                <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-tier-established"
                    style={{ width: `${Math.round(message.signalCard.credibility * 100)}%` }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground font-medium">
                  {Math.round(message.signalCard.credibility * 100)}%
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Decision reflection block */}
        {message.showDecisionReflection && (
          <div className="mt-3 rounded-r-lg border-l-[3px] border-l-emerging bg-emerging/8 px-3 py-2.5">
            <p className="text-[11px] font-medium uppercase tracking-wider text-emerging mb-1">
              Decision noted
            </p>
            <p className="text-xs text-foreground/80 leading-relaxed">
              Locking Vietnam FOB at $18.40/pair for FW26, Maine capacity accelerating in parallel.
            </p>
          </div>
        )}

        {/* Build Position button (from message data) */}
        {message.showBuildButton && (
          <button
            onClick={onBuildPosition}
            className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerging/15 text-emerging text-xs font-semibold hover:bg-emerging/25 transition-colors"
          >
            Build Position ✦
          </button>
        )}

        {/* Inline build button (appended to last assistant bubble) */}
        {showInlineBuild && (
          <button
            onClick={onBuildClick}
            className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerging/15 text-emerging text-xs font-semibold hover:bg-emerging/25 transition-colors"
          >
            Build Position →
          </button>
        )}
      </div>
    </div>
  );
}

export function MarkdownLite({ text }: { text: string }) {
  if (!text) return null;
  const lines = text.split('\n');
  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        const rendered = parts.map((part, j) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={j} className="font-semibold">{part.slice(2, -2)}</strong>;
          }
          return <span key={j}>{part}</span>;
        });
        if (line.trim().startsWith('- ') || line.trim().startsWith('• ')) {
          return (<div key={i} className="flex gap-2 pl-1"><span className="text-muted-foreground">•</span><span>{rendered}</span></div>);
        }
        if (!line.trim()) return <div key={i} className="h-2" />;
        return <p key={i}>{rendered}</p>;
      })}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex flex-col items-start">
      <span className="text-[10px] font-medium uppercase tracking-wider mb-1 px-1 text-muted-foreground">AUO</span>
      <div className="bg-card border border-border rounded-lg px-4 py-3 flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
  );
}
