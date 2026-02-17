import { useState, useRef, useEffect, useMemo } from 'react';
import { Send, ChevronDown, ChevronUp, MessageSquare, ChevronLeft, ChevronRight as ChevronRightIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MOCK_CHAT_MESSAGES, MOCK_INSIGHTS, type MockChatMessage } from '@/data/mock';
import { PositionCard, type PositionBrief } from '@/components/views/PositionCard';

// Mock contextual prompts per insight
const CONTEXTUAL_PROMPTS: Record<string, string> = {
  '1': "You're looking at the Vietnam FOB decision. What's your initial read — lock at $18.40 or wait?",
  '2': "You're looking at the 880 v15 shelf window. Should you lock Dick's placement now during leadership churn, or wait for Nike clarity?",
  '3': "880 v15 pricing is on the table. $150 and absorb margin hit, or $165 and risk volume loss?",
};

const MOCK_POSITION_BRIEFS: Record<string, PositionBrief> = {
  '1': {
    title: 'Vietnam FOB Lock',
    call: 'Lock at $18.40/pair before BOM deadline',
    why: 'Asymmetric tariff risk too high to wait for Supreme Court clarity',
    assumptions: ['Tariffs land at 20%+', 'Maine not ready for FW26', 'Supreme Court ruling comes after BOM lock'],
  },
  '2': {
    title: '880 v15 Shelf Lock',
    call: "Lock Dick's-Foot Locker placement within 60 days",
    why: 'Leadership vacuum creates negotiation window that closes with March vendor reviews',
    assumptions: ['Foot Locker leadership churn persists through March', "Nike wholesale flood hits Q2, not Q1"],
  },
  '3': {
    title: '880 v15 Pricing Hold',
    call: 'Hold at $150 with FuelCell differentiation messaging',
    why: 'Premium positioning defensible with technology story; $165 risks volume collapse',
    assumptions: ['Consumer price resistance peaks pre-tariff', 'FuelCell tech justifies $10 premium over Ghost 16'],
  },
};

interface ChatViewProps {
  activeInsightId?: string | null;
  onShare?: () => void;
  chatCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function ChatView({ activeInsightId, onShare, chatCollapsed, onToggleCollapse }: ChatViewProps) {
  const [messages, setMessages] = useState<MockChatMessage[]>(MOCK_CHAT_MESSAGES);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [inputExpanded, setInputExpanded] = useState(true);
  const [userMsgCount, setUserMsgCount] = useState(0);
  const [lastContextInsightId, setLastContextInsightId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // When activeInsightId changes, inject a contextual prompt
  useEffect(() => {
    if (activeInsightId && activeInsightId !== lastContextInsightId) {
      setLastContextInsightId(activeInsightId);
      setUserMsgCount(0);
      const prompt = CONTEXTUAL_PROMPTS[activeInsightId];
      if (prompt) {
        const contextMsg: MockChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: prompt,
        };
        setMessages(prev => [...prev, contextMsg]);
      }
    }
  }, [activeInsightId, lastContextInsightId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, typing]);

  const resetTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
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

  useEffect(() => {
    adjustHeight();
  }, [inputExpanded]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    adjustHeight();
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;

    const userMsg: MockChatMessage = { id: crypto.randomUUID(), role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    resetTextareaHeight();
    setTyping(true);

    const newCount = userMsgCount + 1;
    setUserMsgCount(newCount);

    // If we're in an active insight context and user has sent 2+ messages, generate position card
    const shouldGeneratePosition = activeInsightId && newCount >= 2 && MOCK_POSITION_BRIEFS[activeInsightId];

    setTimeout(() => {
      if (shouldGeneratePosition) {
        const reply: MockChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: '__POSITION_CARD__' + activeInsightId,
        };
        setMessages(prev => [...prev, reply]);
      } else {
        const reply: MockChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: activeInsightId
            ? "Got it. What assumptions are you making about this?"
            : "I'll pull the relevant signals on that. Give me a moment to cross-reference the latest data points.",
        };
        setMessages(prev => [...prev, reply]);
      }
      setTyping(false);
    }, 1500);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const placeholder = activeInsightId ? "What's your read on this?" : 'Ask AUO anything...';

  // Collapsed state
  if (chatCollapsed) {
    return (
      <div className="flex flex-col items-center py-4 w-12">
        <button
          onClick={onToggleCollapse}
          className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </button>
        <div className="mt-4 flex flex-col items-center">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Collapse toggle */}
      {onToggleCollapse && (
        <div className="flex-shrink-0 flex items-center justify-between px-3 py-2 border-b border-border">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Chat</span>
          <button
            onClick={onToggleCollapse}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6">
        <div className="space-y-4">
          {messages.map(msg => {
            // Check for position card marker
            if (msg.role === 'assistant' && msg.content.startsWith('__POSITION_CARD__')) {
              const insightId = msg.content.replace('__POSITION_CARD__', '');
              const brief = MOCK_POSITION_BRIEFS[insightId];
              if (brief) {
                return (
                  <div key={msg.id} className="flex justify-start">
                    <div className="max-w-[95%]">
                      <p className="text-xs text-muted-foreground mb-2">Clear. Here's your position brief:</p>
                      <PositionCard brief={brief} onShare={onShare} />
                    </div>
                  </div>
                );
              }
            }
            return <MessageBubble key={msg.id} message={msg} />;
          })}
          {typing && <TypingIndicator />}
        </div>
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-border px-4 py-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            className="flex-1 bg-card border border-border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none overflow-y-auto"
            style={{ maxHeight: inputExpanded ? '120px' : '38px' }}
          />
          <button
            onClick={() => setInputExpanded(!inputExpanded)}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
          >
            {inputExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="p-2.5 rounded-lg bg-accent text-foreground hover:bg-accent/80 transition-colors disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: MockChatMessage }) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-lg px-4 py-3 text-sm leading-relaxed break-words',
          isUser
            ? 'bg-accent text-accent-foreground'
            : 'bg-card border border-border text-card-foreground'
        )}
      >
        <MarkdownLite text={message.content} />
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
          return (
            <div key={i} className="flex gap-2 pl-1">
              <span className="text-muted-foreground">•</span>
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

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-card border border-border rounded-lg px-4 py-3 flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
  );
}
